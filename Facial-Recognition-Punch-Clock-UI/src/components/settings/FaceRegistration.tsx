import React, { useState, useRef, useEffect, useCallback } from 'react';
import { CameraIcon, SaveIcon, CheckCircleIcon, AlertCircleIcon } from 'lucide-react';
import {
  Box,
  Button,
  Typography,
  Paper,
  TextField,
  Stack,
  Alert,
  Snackbar,
  CircularProgress,
  Tooltip,
} from '@mui/material';
import { keyframes } from '@mui/system';

// API Configuration
const API_BASE = import.meta.env.VITE_API_BASE || (window.location.protocol + '//' + window.location.hostname + ':5002/api');

interface CapturedFrame {
  angle: string;
  blob: Blob;
  timestamp: Date;
  preview?: string;
  validated?: boolean;
}

interface FaceRegistrationProps {
  employeeId?: string;
  onCapture?: (employeeId: string, profilePhotoUrl?: string) => void;
  onCancel?: () => void;
}

interface FaceDetectionResult {
  detected: boolean;
  quality: 'good' | 'poor' | 'too_close' | 'too_far' | 'wrong_angle';
  message: string;
  faceSize?: number;
}

// Animation keyframes
const pulseAnimation = keyframes`
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.7; transform: scale(1.05); }
`;

const slideInAnimation = keyframes`
  from { opacity: 0; transform: translateY(-20px); }
  to { opacity: 1; transform: translateY(0); }
`;

const CAPTURE_COUNT = 8;
const AUTO_CAPTURE_COUNTDOWN_SECONDS = 3;
const STREAM_STALL_MS = 6000;
const STREAM_RETRY_DELAY_MS = 1200;
const STREAM_MAX_ERRORS = 3;
const angleConfig = Array.from({ length: CAPTURE_COUNT }, (_, index) => ({
  id: `capture_${index + 1}`,
  label: `Capture ${index + 1}`,
  instruction: '',
  direction: 'center',
}));

const getSimpleHint = (status: FaceDetectionResult | null) => {
  if (!status) return 'Move slowly in a full circle';
  if (!status.detected) return status.message || 'Move your face into the circle';
  if (status.quality === 'good') return 'Hold still';
  return status.message || 'Move slowly in a full circle';
};

// Circular Progress Component
// iPhone-style circular progress indicator on circumference
const CircularProgressIndicator = ({ value, size }: { value: number; size: number }) => {
  const radius = size / 2 - 10;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (value / 100) * circumference;
  const center = size / 2;
  
  return (
    <svg
      width={size}
      height={size}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        transform: 'rotate(-90deg)',
        pointerEvents: 'none',
      }}
    >
      {/* Background circle (subtle) */}
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke="rgba(255, 255, 255, 0.1)"
        strokeWidth="3"
      />
      {/* Progress circle (yellow accent like iPhone) */}
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke="#FFD700"
        strokeWidth="3"
        strokeDasharray={strokeDasharray}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
        style={{
          transition: 'stroke-dashoffset 0.3s ease',
        }}
      />
    </svg>
  );
};

const FaceRegistration: React.FC<FaceRegistrationProps> = ({ employeeId: propEmployeeId, onCapture, onCancel }) => {
  const [capturing, setCapturing] = useState(false);
  const [currentAngleIndex, setCurrentAngleIndex] = useState(0);
  const [employeeId, setEmployeeId] = useState(propEmployeeId || '');
  const [capturedFrames, setCapturedFrames] = useState<CapturedFrame[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [lastFrameAt, setLastFrameAt] = useState<number | null>(null);
  const [streamErrors, setStreamErrors] = useState(0);
  const [frameUrl, setFrameUrl] = useState<string | null>(null);
  const [streamNonce, setStreamNonce] = useState(0);
  const [faceStatus, setFaceStatus] = useState<FaceDetectionResult | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [autoCaptureCountdown, setAutoCaptureCountdown] = useState<number | null>(null);
  const [progressBoost, setProgressBoost] = useState(0);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });
  
  const videoRef = useRef<HTMLImageElement>(null);
  const frameBlobRef = useRef<Blob | null>(null);
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const streamRecoveryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const snapshotInFlightRef = useRef(false);
  const autoCaptureInProgressRef = useRef(false);
  const isDetectingRef = useRef(false);
  const autoCaptureCountdownRef = useRef<number | null>(null);
  const streamErrorCountRef = useRef(0);

  const currentAngle = angleConfig[currentAngleIndex];
  const validatedFrames = capturedFrames.filter(f => f.validated === true);
  const stepProgress = 100 / angleConfig.length;
  const progress = Math.min(100, (validatedFrames.length * stepProgress) + progressBoost);
  const allAnglesValidated = validatedFrames.length === angleConfig.length;
  const isCurrentAngleValidated = validatedFrames.some(f => f.angle === currentAngle.id);

  const scheduleStreamRetry = useCallback(() => {
    if (streamRecoveryTimeoutRef.current) return;
    streamRecoveryTimeoutRef.current = setTimeout(() => {
      streamRecoveryTimeoutRef.current = null;
      setCameraError(null);
    }, STREAM_RETRY_DELAY_MS);
  }, []);

  const markStreamReady = useCallback(() => {
    setCameraReady(true);
    setCameraError(null);
    setLastFrameAt(Date.now());
    streamErrorCountRef.current = 0;
    setStreamErrors(0);
  }, []);

  const ensureCameraRunning = useCallback(async () => {
    try {
      const statusResponse = await fetch(`${API_BASE}/camera/status`);
      const statusData = await statusResponse.json();
      const isActive = statusData.active || statusData.working || statusData.initialized || false;

      if (!isActive) {
        await fetch(`${API_BASE}/camera/start`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        scheduleStreamRetry();
      }
    } catch (error) {
      console.warn('Camera status check failed:', error);
    }
  }, [scheduleStreamRetry]);

  const updateFrameUrl = useCallback((blob: Blob) => {
    frameBlobRef.current = blob;
    setFrameUrl((prev) => {
      if (prev) {
        URL.revokeObjectURL(prev);
      }
      return URL.createObjectURL(blob);
    });
  }, []);

  useEffect(() => {
    autoCaptureCountdownRef.current = autoCaptureCountdown;
  }, [autoCaptureCountdown]);

  useEffect(() => {
    if (allAnglesValidated) return;
    const missingIndex = angleConfig.findIndex(
      (angle) => !validatedFrames.some((frame) => frame.angle === angle.id)
    );
    if (missingIndex >= 0 && missingIndex !== currentAngleIndex) {
      setCurrentAngleIndex(missingIndex);
    }
  }, [validatedFrames, allAnglesValidated, currentAngleIndex]);

  useEffect(() => {
    if (!cameraReady || isCurrentAngleValidated) {
      setProgressBoost(0);
      return;
    }

    const maxBoost = stepProgress * 0.8;
    const interval = setInterval(() => {
      setProgressBoost((prev) => {
        if (prev >= maxBoost) return prev;
        return Math.min(maxBoost, prev + (stepProgress * 0.04));
      });
    }, 250);

    return () => clearInterval(interval);
  }, [cameraReady, isCurrentAngleValidated, stepProgress]);

  // Initialize camera
  useEffect(() => {
    setCapturing(true);
    setCameraReady(false);
    setCameraError(null);
  
    return () => {
      setCapturing(false);
      setCameraReady(false);
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
      if (streamRecoveryTimeoutRef.current) {
        clearTimeout(streamRecoveryTimeoutRef.current);
      }
      setFrameUrl((prev) => {
        if (prev) {
          URL.revokeObjectURL(prev);
        }
        return null;
      });
    };
  }, []);

  // Start camera stream
  useEffect(() => {
    if (!capturing) return;
    
    setCameraError(null);
    setCameraReady(false);
    streamErrorCountRef.current = 0;
    setStreamErrors(0);
    
    ensureCameraRunning();
    const statusPoll = setInterval(() => {
      ensureCameraRunning();
    }, 5000);

    let active = true;
    const fetchSnapshot = async () => {
      if (!active || snapshotInFlightRef.current) return;
      snapshotInFlightRef.current = true;
      try {
        const response = await fetch(`${API_BASE}/camera/snapshot?ts=${Date.now()}&w=480&h=270&q=70`, {
          cache: 'no-store',
        });
        if (!response.ok) {
          throw new Error(`Snapshot error: ${response.status}`);
        }
        const blob = await response.blob();
        if (!active) return;
        updateFrameUrl(blob);
        markStreamReady();
        setCameraError(null);
      } catch (error) {
        if (!active) return;
        console.warn('Snapshot fetch failed:', error);
        setCameraReady(false);
        setCameraError('Failed to load camera stream');
        streamErrorCountRef.current += 1;
        setStreamErrors(streamErrorCountRef.current);

        ensureCameraRunning();
        scheduleStreamRetry();
      } finally {
        snapshotInFlightRef.current = false;
      }
    };

    fetchSnapshot();
    const snapshotInterval = setInterval(fetchSnapshot, 400);

    return () => {
      active = false;
      clearInterval(statusPoll);
      clearInterval(snapshotInterval);
    };
  }, [capturing, ensureCameraRunning, markStreamReady, scheduleStreamRetry, updateFrameUrl]);

  // Refresh camera stream if it stalls
  useEffect(() => {
    if (!capturing) return;
    const watchdog = setInterval(async () => {
      if (!lastFrameAt) return;
      const ageMs = Date.now() - lastFrameAt;
      if (ageMs > STREAM_STALL_MS) {
        ensureCameraRunning();
      }
    }, 4000);

    return () => clearInterval(watchdog);
  }, [capturing, lastFrameAt, ensureCameraRunning]);

  const resetCountdown = useCallback(() => {
    setAutoCaptureCountdown(null);
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  }, []);

  // Detect face in current frame
  const detectFace = useCallback(async (): Promise<FaceDetectionResult> => {
    const frameBlob = frameBlobRef.current;
    if (!cameraReady || !frameBlob) {
      return { detected: false, quality: 'poor', message: 'Waiting for camera...' };
    }

    try {
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          resolve({ detected: false, quality: 'poor', message: 'Detection timeout' });
        }, 5000);

        try {
          (async () => {
            try {
              const formData = new FormData();
              formData.append('image', frameBlob, 'frame.jpg');
              formData.append('angle', currentAngle.id);

              const response = await fetch(`${API_BASE}/detect-face-quality`, {
                method: 'POST',
                body: formData,
              });

              if (response.ok) {
                const result = await response.json();
                resolve(result);
              } else {
                const errorData = await response.json().catch(() => ({}));
                resolve({ 
                  detected: true, 
                  quality: 'good', 
                  message: errorData.message || 'Face detected (validation unavailable)' 
                });
              }
            } catch (error) {
              console.warn('Face detection API error:', error);
              resolve({ detected: true, quality: 'good', message: 'Face detected' });
            } finally {
              clearTimeout(timeout);
            }
          })();
        } catch (error) {
          clearTimeout(timeout);
          resolve({ detected: false, quality: 'poor', message: 'Failed to validate frame' });
        }
      });
    } catch (error) {
      console.error('Face detection error:', error);
      return { detected: false, quality: 'poor', message: 'Detection error occurred' };
    }
  }, [cameraReady, currentAngle.id]);

  // Start continuous face detection
  useEffect(() => {
    if (!cameraReady || isSubmitting || allAnglesValidated) {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
        detectionIntervalRef.current = null;
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
      setAutoCaptureCountdown(null);
      return;
    }

    const startDetection = async () => {
      if (isDetectingRef.current || isSubmitting || allAnglesValidated) return;
      
      isDetectingRef.current = true;
      setIsDetecting(true);
      
      try {
        const result = await detectFace();
        setFaceStatus(result);
        
        if (result.detected && result.quality === 'good' && !isCurrentAngleValidated) {
          resetCountdown();
          handleAutoCapture();
        } else {
          resetCountdown();
        }
      } catch (error) {
        console.error('Detection error:', error);
      } finally {
        isDetectingRef.current = false;
        setIsDetecting(false);
      }
    };

    // Start detection immediately, then continue with interval
    startDetection();
    detectionIntervalRef.current = setInterval(startDetection, 700);
    
    return () => {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, [cameraReady, isSubmitting, detectFace, allAnglesValidated, isCurrentAngleValidated, resetCountdown]);

  // Auto-capture when countdown reaches 0
  useEffect(() => {
    if (autoCaptureCountdown === 0 && faceStatus?.quality === 'good') {
      setAutoCaptureCountdown(null);
      handleAutoCapture();
    }
  }, [autoCaptureCountdown, faceStatus]);

  // Auto-submit when all angles are validated
  useEffect(() => {
    if (allAnglesValidated && employeeId.trim() && !isSubmitting) {
      // Auto-submit after short delay
      setTimeout(() => {
        handleSubmit();
      }, 1000);
    }
  }, [allAnglesValidated, employeeId]);

  // Auto-capture function
  const handleAutoCapture = async () => {
    if (isSubmitting || !cameraReady || autoCaptureInProgressRef.current) return;

    const frameBlob = frameBlobRef.current;
    if (!frameBlob) return;

    autoCaptureInProgressRef.current = true;

    try {
      // Validate the captured image
      const formData = new FormData();
      formData.append('image', frameBlob, 'capture.jpg');
      formData.append('angle', currentAngle.id);
      
      try {
        const validateResponse = await fetch(`${API_BASE}/detect-face-quality`, {
          method: 'POST',
          body: formData,
        });

        let isValidated = false;
        let validationMessage = 'Face not clear. Please try again.';
        if (validateResponse.ok) {
          const validationResult = await validateResponse.json();
          validationMessage = validationResult.message || validationMessage;
          isValidated = validationResult.detected && validationResult.quality === 'good';
        }

        const preview = URL.createObjectURL(frameBlob);
        const newFrame: CapturedFrame = {
          angle: currentAngle.id,
          blob: frameBlob,
          timestamp: new Date(),
          preview,
          validated: isValidated,
        };

        if (!isValidated) {
          URL.revokeObjectURL(preview);
          setAutoCaptureCountdown(null);
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
          }
          return;
        }

        setCapturedFrames((prev) => {
          const existing = prev.findIndex(f => f.angle === currentAngle.id);
          if (existing >= 0) {
            URL.revokeObjectURL(prev[existing].preview || '');
            const updated = [...prev];
            updated[existing] = newFrame;
            return updated;
          }
          return [...prev, newFrame];
        });

        setAutoCaptureCountdown(null);
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
        }

        // Auto-advance to next missing angle after short delay
        setTimeout(() => {
          const nextMissingIndex = angleConfig.findIndex(
            (angle) => !validatedFrames.some((frame) => frame.angle === angle.id)
          );
          if (nextMissingIndex >= 0) {
            setCurrentAngleIndex(nextMissingIndex);
          }
          setFaceStatus(null);
        }, 800);
      } catch (error) {
        console.error('Validation error:', error);
      }
    } catch (error) {
      console.error('Error in auto-capture:', error);
    } finally {
      autoCaptureInProgressRef.current = false;
    }
  };

  // Manual capture (fallback)
  const handleManualCapture = () => {
    if (faceStatus?.quality === 'good') {
      handleAutoCapture();
    }
  };

  // Submit all captured frames
  const handleSubmit = async () => {
    if (isSubmitting) return;

    const requiredAngles = angleConfig.map(a => a.id);
    const validatedAngles = validatedFrames.map(f => f.angle);
    
    if (validatedAngles.length < requiredAngles.length) {
      const missing = requiredAngles.filter(a => !validatedAngles.includes(a));
      setSnackbar({
        open: true,
        message: `Please capture all angles. Missing: ${missing.join(', ')}`,
        severity: 'error',
      });
      return;
    }
    
    if (!employeeId || employeeId.trim() === '') {
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      
      validatedFrames.forEach((frame) => {
        formData.append('images', frame.blob, `${employeeId}_${frame.angle}.jpg`);
      });
      
      formData.append('name', employeeId.trim());
      formData.append('angles', JSON.stringify(validatedAngles));

      const response = await fetch(`${API_BASE}/register-face`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Server error: ${response.status}`);
      }

      if (onCapture) {
        onCapture(employeeId.trim(), data.profile_photo || undefined);
      }

      validatedFrames.forEach(frame => {
        if (frame.preview) {
          URL.revokeObjectURL(frame.preview);
        }
      });
      setEmployeeId('');
      setCapturedFrames([]);
      setCurrentAngleIndex(0);
      setIsSubmitting(false);

      if (onCancel) {
        onCancel();
      }

    } catch (error) {
      console.error('Error registering face:', error);
      setIsSubmitting(false);
    }
  };

  const buttonsDisabled = !allAnglesValidated || isSubmitting;

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'row', 
      gap: 6, 
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
      position: 'relative',
      zIndex: 1,
      pointerEvents: 'auto',
      padding: '24px',
      minHeight: '500px',
    }}>
      {/* iPhone-Style Circular Video Feed - Left Side */}
      <Box
        sx={{
          position: 'relative',
          width: 450,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
          flexShrink: 0,
        }}
      >
        <Box
          sx={{
            position: 'relative',
            width: 450,
            height: 450,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* iPhone-style Circular Progress Bar on Circumference */}
          <CircularProgressIndicator value={progress} size={450} />

          {/* Circular Video Container */}
          <Box
            sx={{
              position: 'relative',
              width: 400,
              height: 400,
              borderRadius: '50%',
              overflow: 'hidden',
              border: '2px solid',
              borderColor: faceStatus?.quality === 'good' ? 'success.main' : 'primary.main',
              animation: faceStatus?.quality === 'good' 
                ? `${pulseAnimation} 1s ease-in-out infinite`
                : 'none',
              zIndex: 1,
              bgcolor: 'black',
              flexShrink: 0,
              boxSizing: 'border-box',
            }}
          >
          <>
            {/* Video Stream */}
            <img
              ref={videoRef}
              src={`${API_BASE}/camera/stream?ts=${streamNonce}&w=480&h=270&q=60`}
              alt="Camera feed"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
                transform: 'scaleX(-1)',
                transformOrigin: 'center',
              }}
              onLoad={() => {
                markStreamReady();
                setLastFrameAt(Date.now());
              }}
              onError={() => {
                setCameraError('Failed to load camera stream');
                setStreamNonce((prev) => prev + 1);
              }}
            />

            {cameraError && (
              <Box sx={{ 
                position: 'absolute',
                inset: 0,
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center',
                color: 'error.main',
                bgcolor: 'rgba(0, 0, 0, 0.45)',
                textAlign: 'center',
                px: 2,
              }}>
                <AlertCircleIcon size={48} />
                <Typography variant="body2" sx={{ mt: 2 }}>
                  {cameraError}
                </Typography>
              </Box>
            )}

            {!cameraError && !cameraReady && (
              <Box sx={{ 
                position: 'absolute',
                inset: 0,
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center',
                bgcolor: 'rgba(0, 0, 0, 0.35)',
              }}>
                <CircularProgress size={48} sx={{ mb: 2 }} />
                <Typography variant="body2" color="text.secondary">
                  Starting camera...
                </Typography>
              </Box>
            )}

            {!cameraError && cameraReady && faceStatus === null && !isDetecting && (
              <Box sx={{ 
                position: 'absolute',
                inset: 0,
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center',
                color: 'text.secondary',
                bgcolor: 'rgba(0, 0, 0, 0.2)',
              }}>
                <Typography variant="body1">
                  Waiting for face detection...
                </Typography>
              </Box>
            )}

            {/* Overlay Guidance */}
            {cameraReady && !cameraError && (
              <Box
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  pointerEvents: 'none',
                  bgcolor: 'transparent',
                  transform: 'translateY(100px)',
                }}
              >
                {/* Minimal Hint Text */}
                {!isCurrentAngleValidated && (
                  <Box
                    sx={{
                      mt: 4,
                      textAlign: 'center',
                      animation: `${slideInAnimation} 0.3s ease`,
                    }}
                  >
                    <Typography
                      variant="h6"
                      sx={{
                        color: faceStatus?.quality === 'good' ? 'success.light' : 'white',
                        textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
                        fontWeight: 'bold',
                      }}
                    >
                      {faceStatus?.quality === 'good' ? 'Hold still...' : getSimpleHint(faceStatus)}
                    </Typography>
                  </Box>
                )}

                {/* Success Checkmark */}
                {isCurrentAngleValidated && (
                  <Box
                    sx={{
                      animation: `${slideInAnimation} 0.3s ease`,
                    }}
                  >
                    <CheckCircleIcon size={64} style={{ color: '#4caf50' }} />
                    <Typography
                      variant="body1"
                      sx={{
                        color: 'success.light',
                        textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                        mt: 1,
                        fontWeight: 'bold',
                      }}
                    >
                      {currentAngle.label} captured!
                    </Typography>
                  </Box>
                )}

              </Box>
            )}
          </>
          </Box>
        </Box>

        {!allAnglesValidated && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2, textAlign: 'center' }}>
            Auto capture is on. Hold still while images are taken.
          </Typography>
        )}
      </Box>

      {/* Right Side - Employee ID and Buttons */}
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: 3,
        flex: '0 0 320px',
        minWidth: 320,
        justifyContent: 'center',
      }}>
        {/* Employee ID Input */}
        <Tooltip title="Enter the employee ID to register face for. Required for face registration." placement="top" arrow enterDelay={400}>
          <Box sx={{ cursor: 'help', position: 'relative', zIndex: 100, pointerEvents: 'auto' }}>
            <TextField
              label="Employee ID"
              variant="outlined"
              placeholder="Enter Employee ID"
              fullWidth
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              disabled={isSubmitting || allAnglesValidated}
            />
          </Box>
        </Tooltip>

        {/* Action Buttons */}
        <Box 
          sx={{ 
            display: 'flex',
            flexDirection: 'column',
            gap: 1.5,
            position: 'relative', 
            zIndex: 100,
          }}
        >
          <Button
            variant="outlined"
            onClick={onCancel}
            disabled={isSubmitting}
            fullWidth
            size="large"
            sx={{ pointerEvents: 'auto', zIndex: 101, py: 1.5 }}
          >
            Cancel
          </Button>
          
          
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={isSubmitting || !employeeId.trim() || validatedFrames.length === 0}
            startIcon={<SaveIcon size={18} />}
            fullWidth
            size="large"
            sx={{ pointerEvents: 'auto', zIndex: 101, py: 1.5 }}
          >
            {isSubmitting ? 'Registering...' : allAnglesValidated ? 'Register Face' : `${validatedFrames.length}/${angleConfig.length} Captured`}
          </Button>
        </Box>
      </Box>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default FaceRegistration;
