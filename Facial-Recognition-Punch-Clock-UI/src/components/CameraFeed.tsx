import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Box, 
  Button, 
  Typography, 
  Avatar, 
  Chip, 
  Alert,
  CircularProgress,
  Paper,
  IconButton,
  Tooltip,
  Snackbar
} from '@mui/material';
import { 
  ShieldCheckIcon, 
  AlertCircleIcon, 
  AlertTriangleIcon, 
  UserIcon, 
  CameraIcon, 
  RefreshCwIcon,
  PlayIcon,
  SquareIcon,
  WifiIcon,
  WifiOffIcon,
  ActivityIcon,
  UsersIcon,
  ClockIcon,
  SettingsIcon,
  PowerIcon,
  CpuIcon,
  MemoryStick,
  ThermometerIcon,
  MapPinIcon,
  Building2
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import CityDataDisplay from './CityDataDisplay';
import EditAttendanceLogModal from './settings/EditAttendanceLogModal';
import { AttendanceLog } from '../utils/types';

// ===== TYPES =====
interface FaceDetection {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  recognized: boolean;
  personId?: string;
  name?: string;
  department?: string;
  photo?: string;
  age?: number;
  emotion?: string;
  spoof?: boolean;
}

interface RecognitionEvent {
  type: 'face_detected' | 'person_recognized' | 'check_in' | 'check_out' | 'error' | 'status' | 'duplicate_punch' | 'heartbeat' | 'connection';
  timestamp: string;
  data: any;
  faces?: FaceDetection[];
  recognitions?: Array<{
    confidence?: number;
    name?: string;
    location?: { top?: number; right?: number; bottom?: number; left?: number };
    age?: number;
    emotion?: string;
    spoof?: boolean;
  }>;
  statistics?: {
    totalFaces: number;
    recognizedFaces: number;
    eventsReceived: number;
    uptime: number;
  };
}

interface RecognitionStats {
  eventsReceived: number;
  facesDetected: number;
  facesRecognized: number;
  lastEvent: string;
  uptime: number;
  connectionStatus: 'connected' | 'connecting' | 'disconnected' | 'error';
  cameraStatus: 'active' | 'inactive' | 'starting' | 'stopping' | 'error';
}

interface SystemStatus {
  isHealthy: boolean;
  cameraConnected: boolean;
  recognitionActive: boolean;
  lastHealthCheck: string;
  errors: string[];
}

// ===== API CONFIGURATION =====
const API_BASE = import.meta.env.VITE_API_BASE || (window.location.protocol + '//' + window.location.hostname + ':5002/api');
const RECONNECTION_DELAY = 3000; // 3 seconds
const MAX_RECONNECTION_ATTEMPTS = 9999;

// ===== CORE COMPONENTS =====

// VideoStream: Handles MJPEG camera feed
const VideoStream: React.FC<{
  isActive: boolean;
  onVideoReady: () => void;
  onVideoError: (error: string) => void;
  imgRef: React.RefObject<HTMLImageElement>;
}> = ({ isActive, onVideoReady, onVideoError, imgRef }) => {
  const [streamNonce, setStreamNonce] = useState(0);
  const [lastFrameAt, setLastFrameAt] = useState<number | null>(null);

  useEffect(() => {
    if (!isActive) return;
    const watchdog = setInterval(() => {
      if (!lastFrameAt) return;
      const ageMs = Date.now() - lastFrameAt;
      if (ageMs > 15000) {
        setStreamNonce((prev) => prev + 1);
      }
    }, 5000);
    return () => clearInterval(watchdog);
  }, [isActive, lastFrameAt]);

  if (!isActive) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        height="100%"
        gap={2}
        bgcolor="grey.900"
      >
        <CameraIcon size={64} style={{ color: '#9e9e9e' }} />
        <Typography variant="h6" color="text.secondary">
          Camera Feed
        </Typography>
        <Typography variant="body2" color="text.secondary" textAlign="center">
          Click "Start Camera" to begin streaming
        </Typography>
      </Box>
    );
  }

  return (
    <img
      ref={imgRef}
      src={`${API_BASE}/camera/stream?ts=${streamNonce}`}
      alt="Camera Feed"
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'contain',
        backgroundColor: 'black',
        transform: 'scaleX(-1)',
        transformOrigin: 'center',
      }}
      onLoad={() => {
        onVideoReady();
        setLastFrameAt(Date.now());
      }}
      onError={(e) => {
        console.error('Camera stream error:', e);
        onVideoError('Failed to load camera stream. Make sure camera is started.');
        setTimeout(() => setStreamNonce((prev) => prev + 1), 1000);
      }}
    />
  );
};

// RecognitionStream: EventSource for face detection results
const useRecognitionStream = (isActive: boolean) => {
  const [events, setEvents] = useState<RecognitionEvent[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected' | 'error'>('disconnected');
  const [reconnectionAttempts, setReconnectionAttempts] = useState(0);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    if (reconnectionAttempts >= MAX_RECONNECTION_ATTEMPTS) {
      setConnectionStatus('error');
      return;
    }

    setConnectionStatus('connecting');
    
    try {
      eventSourceRef.current = new EventSource(`${API_BASE}/recognition/stream`);
      
      eventSourceRef.current.onopen = () => {
        setConnectionStatus('connected');
        setReconnectionAttempts(0);
        console.log('Recognition stream connected');
      };

      eventSourceRef.current.onmessage = (event) => {
        try {
          const data: RecognitionEvent = JSON.parse(event.data);
          setEvents(prev => [...prev.slice(-50), data]); // Keep last 50 events
        } catch (err) {
          console.error('Error parsing recognition event:', err);
        }
      };

      eventSourceRef.current.onerror = () => {
        setConnectionStatus('error');
        console.error('Recognition stream error');
        
        // Auto-reconnect
        if (isActive && reconnectionAttempts < MAX_RECONNECTION_ATTEMPTS) {
          reconnectTimeoutRef.current = setTimeout(() => {
            setReconnectionAttempts(prev => prev + 1);
            connect();
          }, RECONNECTION_DELAY);
        }
      };
    } catch (error) {
      setConnectionStatus('error');
      console.error('Failed to create EventSource:', error);
    }
  }, [isActive, reconnectionAttempts]);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    setConnectionStatus('disconnected');
  }, []);

  useEffect(() => {
    if (isActive) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [isActive, connect, disconnect]);

  return { events, connectionStatus };
};

// CameraControls: Start/stop/restart camera operations
const useCameraControls = () => {
  const [cameraStatus, setCameraStatus] = useState<'active' | 'inactive' | 'starting' | 'stopping' | 'error'>('inactive');
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    isHealthy: false,
    cameraConnected: false,
    recognitionActive: false,
    lastHealthCheck: '',
    errors: []
  });

  const checkHealth = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/health`);
      const isHealthy = response.ok;
      
      setSystemStatus(prev => ({
        ...prev,
        isHealthy,
        lastHealthCheck: new Date().toLocaleTimeString()
      }));
      
      return isHealthy;
    } catch (error) {
      setSystemStatus(prev => ({
        ...prev,
        isHealthy: false,
        lastHealthCheck: new Date().toLocaleTimeString(),
        errors: [...prev.errors, 'Health check failed']
      }));
      return false;
    }
  }, []);

  const startCamera = useCallback(async () => {
    setCameraStatus('starting');
    
    try {
      const isHealthy = await checkHealth();
      if (!isHealthy) {
        throw new Error('System health check failed');
      }

      const response = await fetch(`${API_BASE}/camera/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        setCameraStatus('active');
        setSystemStatus(prev => ({
          ...prev,
          cameraConnected: true,
          recognitionActive: true,
          errors: []
        }));
      } else {
        throw new Error('Failed to start camera');
      }
    } catch (error) {
      console.error('Start camera error:', error);
      setCameraStatus('inactive'); // Reset to inactive so user can try again
      setSystemStatus(prev => ({
        ...prev,
        errors: [...prev.errors, error instanceof Error ? error.message : 'Unknown error']
      }));
    }
  }, [checkHealth]);

  const stopCamera = useCallback(async () => {
    setCameraStatus('stopping');
    
    try {
      const response = await fetch(`${API_BASE}/camera/stop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        setCameraStatus('inactive');
        setSystemStatus(prev => ({
          ...prev,
          cameraConnected: false,
          recognitionActive: false
        }));
      } else {
        throw new Error('Failed to stop camera');
      }
    } catch (error) {
      console.error('Stop camera error:', error);
      setCameraStatus('inactive'); // Reset to inactive on error
      setSystemStatus(prev => ({
        ...prev,
        errors: [...prev.errors, error instanceof Error ? error.message : 'Unknown error']
      }));
    }
  }, []);

  const restartCamera = useCallback(async () => {
    await stopCamera();
    setTimeout(() => startCamera(), 1000);
  }, [stopCamera, startCamera]);

  return {
    cameraStatus,
    systemStatus,
    startCamera,
    stopCamera,
    restartCamera,
    checkHealth
  };
};

// StatusMonitor: Real-time connection and system status
const StatusMonitor: React.FC<{
  connectionStatus: string;
  cameraStatus: string;
  systemStatus: SystemStatus;
  stats: RecognitionStats;
}> = ({ connectionStatus, cameraStatus, systemStatus, stats }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
      case 'active':
        return 'success';
      case 'connecting':
      case 'starting':
      case 'stopping':
        return 'warning';
      case 'error':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
      case 'active':
        return <WifiIcon className="h-4 w-4 text-green-500" />;
      case 'connecting':
      case 'starting':
      case 'stopping':
        return <CircularProgress size={16} />;
      case 'error':
        return <WifiOffIcon className="h-4 w-4 text-red-500" />;
      default:
        return <WifiOffIcon className="h-4 w-4 text-gray-400" />;
    }
  };

  return (
    <Paper 
      variant="outlined"
      sx={{ 
        p: 1, 
        borderWidth: 0.5,
        borderStyle: 'solid',
        borderColor: 'divider',
        borderRadius: 1,
      }}
    >
      <Box
        display="flex"
        flexWrap="nowrap"
        gap={1}
        alignItems="center"
        justifyContent="space-between"
        sx={{ overflow: 'hidden' }}
      >
        <Box display="flex" alignItems="center" gap={0.75} minWidth="120px">
          <ActivityIcon className="h-4 w-4 text-blue-500" />
          <Typography variant="body2" sx={{ fontVariantNumeric: 'tabular-nums', minWidth: 80 }}>
            Events: {stats.eventsReceived}
          </Typography>
        </Box>
        <Box display="flex" alignItems="center" gap={0.75} minWidth="120px">
          <UsersIcon className="h-4 w-4 text-orange-500" />
          <Typography variant="body2" sx={{ fontVariantNumeric: 'tabular-nums', minWidth: 80 }}>
            Detected: {stats.facesDetected}
          </Typography>
        </Box>
        <Box display="flex" alignItems="center" gap={0.75} minWidth="130px">
          <ShieldCheckIcon className="h-4 w-4 text-green-500" />
          <Typography variant="body2" sx={{ fontVariantNumeric: 'tabular-nums', minWidth: 90 }}>
            Recognized: {stats.facesRecognized}
          </Typography>
        </Box>
        <Box display="flex" alignItems="center" gap={0.75} minWidth="140px">
          {getStatusIcon(connectionStatus)}
          <Typography variant="body2" textTransform="capitalize" sx={{ minWidth: 110 }}>
            Stream: {connectionStatus}
          </Typography>
        </Box>
        <Box display="flex" alignItems="center" gap={0.75} minWidth="140px">
          {getStatusIcon(cameraStatus)}
          <Typography variant="body2" textTransform="capitalize" sx={{ minWidth: 110 }}>
            Camera: {cameraStatus}
          </Typography>
        </Box>
        <Box display="flex" alignItems="center" gap={0.75} minWidth="140px">
          <PowerIcon className="h-4 w-4" style={{ 
            color: systemStatus.isHealthy ? '#4CAF50' : '#F44336' 
          }} />
          <Typography variant="body2" sx={{ minWidth: 110 }}>
            System: {systemStatus.isHealthy ? 'Healthy' : 'Error'}
          </Typography>
        </Box>
      </Box>
    </Paper>
  );
};

// ===== MAIN COMPONENT =====
const CameraFeed: React.FC = () => {
  const { cityData } = useAppContext();
  
  // State management
  const [stats, setStats] = useState<RecognitionStats>({
    eventsReceived: 0,
    facesDetected: 0,
    facesRecognized: 0,
    lastEvent: '',
    uptime: 0,
    connectionStatus: 'disconnected',
    cameraStatus: 'inactive'
  });
  const [currentFaces, setCurrentFaces] = useState<FaceDetection[]>([]);
  const [lastRecognizedPerson, setLastRecognizedPerson] = useState<any>(null);
  const [duplicateInfo, setDuplicateInfo] = useState<any>(null);
  const [duplicateRemainingSec, setDuplicateRemainingSec] = useState<number | null>(null);
  const [attendanceSettings, setAttendanceSettings] = useState({ duplicatePunchIntervalSec: 30 });
  const [employeeDirectory, setEmployeeDirectory] = useState<Record<string, any>>({});
  const [recognizedAt, setRecognizedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deviceSettings, setDeviceSettings] = useState<{ organization?: string; location?: string }>({});
  const [systemStats, setSystemStats] = useState<any>(null);
  const [showOverlays, setShowOverlays] = useState(true);
  // Modal windows disabled; use overlay-only UI
  const [editingLog, setEditingLog] = useState<AttendanceLog | null>(null);
  const [trainingNotice, setTrainingNotice] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' }>({
    open: false,
    message: '',
    severity: 'info',
  });
  const [isTraining, setIsTraining] = useState(false);
  const [lastFacesAt, setLastFacesAt] = useState<number | null>(null);
  const [lastEventAt, setLastEventAt] = useState<number | null>(null);

  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const logLookupRef = useRef<string | null>(null);

  // Custom hooks
  const { cameraStatus, systemStatus, startCamera, stopCamera, restartCamera } = useCameraControls();
  const { events, connectionStatus } = useRecognitionStream(cameraStatus === 'active');

  // Auto-start camera when component mounts (only if health check passes)
  useEffect(() => {
    const autoStart = async () => {
      if (cameraStatus === 'inactive') {
        try {
          const isHealthy = await fetch(`${API_BASE}/health`).then(r => r.ok).catch(() => false);
          if (isHealthy) {
            startCamera();
          }
        } catch (error) {
          console.error('Auto-start failed:', error);
        }
      }
    };
    autoStart();
  }, []); // Run only on mount

  useEffect(() => {
    const fetchDeviceSettings = async () => {
      try {
        const response = await fetch(`${API_BASE}/system/device-settings`);
        if (response.ok) {
          const data = await response.json();
          setDeviceSettings(data);
        }
      } catch (error) {
        console.error('Error fetching device settings:', error);
      }
    };
    fetchDeviceSettings();
  }, []);

  useEffect(() => {
    const fetchSystemStats = async () => {
      try {
        const response = await fetch(`${API_BASE}/system/stats`);
        if (response.ok) {
          const data = await response.json();
          setSystemStats(data);
        }
      } catch (error) {
        console.error('Error fetching system stats:', error);
      }
    };
    fetchSystemStats();
    const interval = setInterval(fetchSystemStats, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const fetchEmployees = async () => {
      try {
        const response = await fetch(`${API_BASE}/employees`);
        if (!response.ok) return;
        const data = await response.json();
        if (cancelled || !data?.employees) return;
        const next: Record<string, any> = {};
        data.employees.forEach((emp: any) => {
          if (emp?.id) next[String(emp.id)] = emp;
          if (emp?.name) next[String(emp.name)] = emp;
        });
        setEmployeeDirectory(next);
      } catch (error) {
        console.error('Error fetching employees:', error);
      }
    };
    fetchEmployees();
    const interval = setInterval(fetchEmployees, 60000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const fetchAttendanceSettings = async () => {
      try {
        const response = await fetch(`${API_BASE}/system/attendance-settings`);
        if (response.ok) {
          const data = await response.json();
          setAttendanceSettings((prev) => ({
            ...prev,
            duplicatePunchIntervalSec: Number(data.duplicatePunchIntervalSec ?? prev.duplicatePunchIntervalSec),
          }));
        }
      } catch (error) {
        console.error('Error fetching attendance settings:', error);
      }
    };
    fetchAttendanceSettings();
  }, []);

  useEffect(() => {
    if (!lastRecognizedPerson || lastRecognizedPerson.log_id) return;
    const key = lastRecognizedPerson.employee_id || lastRecognizedPerson.id || lastRecognizedPerson.name;
    if (!key) return;
    const keyStr = String(key);
    if (logLookupRef.current === keyStr) return;
    logLookupRef.current = keyStr;
    let cancelled = false;
    const fetchLatestLog = async () => {
      try {
        const response = await fetch(`${API_BASE}/attendance`);
        if (!response.ok) return;
        const data = await response.json();
        const logs = Array.isArray(data?.attendance) ? data.attendance : [];
        const match = logs.find((log: any) => (
          String(log.employee_id) === keyStr || String(log.employee_name) === keyStr
        ));
        if (cancelled || !match) return;
        setLastRecognizedPerson((prev: any) => {
          if (!prev) return prev;
          if (prev.log_id) return prev;
          return {
            ...prev,
            log_id: match.id,
            timestamp: match.timestamp || prev.timestamp,
            event_type: match.event_type || prev.event_type,
            employee_id: match.employee_id || prev.employee_id,
            employee_name: match.employee_name || prev.employee_name,
          };
        });
      } catch (error) {
        console.error('Error fetching attendance logs:', error);
      }
    };
    fetchLatestLog();
    return () => {
      cancelled = true;
    };
  }, [lastRecognizedPerson]);

  const resolveProfilePhoto = useCallback((photo?: string, employeeId?: string) => {
    const apiRoot = API_BASE.replace(/\/api$/, '');
    if (photo) {
      if (photo.startsWith('http://') || photo.startsWith('https://')) return photo;
      if (photo.startsWith('/')) return `${apiRoot}${photo}`;
      return `${apiRoot}/${photo}`;
    }
    if (employeeId) {
      return `${apiRoot}/api/profiles/${employeeId}.jpg`;
    }
    return '';
  }, []);

  const overlaySource = lastRecognizedPerson || duplicateInfo;
  const overlayName = overlaySource?.employee_name || overlaySource?.name || '';
  const overlayId = overlaySource?.employee_id || overlaySource?.id || '';
  const overlayDept = overlaySource?.department || '';
  const overlayTitle = overlayName && overlayId ? `${overlayName} (${overlayId})` : (overlayName || overlayId || 'Unknown');

  const mapRecognitionsToFaces = useCallback((recognitions: RecognitionEvent['recognitions'] = []) => {
    return recognitions.map(rec => {
      const loc = rec.location || {};
      const top = loc.top ?? 0;
      const left = loc.left ?? 0;
      const right = loc.right ?? 0;
      const bottom = loc.bottom ?? 0;
      return {
        x: left,
        y: top,
        width: Math.max(0, right - left),
        height: Math.max(0, bottom - top),
        confidence: rec.confidence ?? 0,
        recognized: rec.name ? rec.name !== 'Unknown' : false,
        name: rec.name,
        age: rec.age,
        emotion: rec.emotion,
        spoof: rec.spoof,
      } as FaceDetection;
    });
  }, []);

  useEffect(() => {
    if (events.length > 0) {
      const lastEvent = events[events.length - 1];
      setLastEventAt(Date.now());
      
      setStats(prev => ({
        ...prev,
        eventsReceived: prev.eventsReceived + 1,
        lastEvent: new Date().toLocaleTimeString(),
        connectionStatus,
        cameraStatus
      }));

      switch (lastEvent.type) {
        case 'face_detected':
          if (lastEvent.faces && Array.isArray(lastEvent.faces) && lastEvent.faces.length > 0) {
            setCurrentFaces(lastEvent.faces);
            setLastFacesAt(Date.now());
            setStats(prev => ({
              ...prev,
              facesDetected: prev.facesDetected + lastEvent.faces!.length
            }));
          } else {
            setCurrentFaces([]);
            setLastFacesAt(Date.now());
          }
          break;
        
        case 'person_recognized':
          if (lastEvent.data) {
            const employeeId = lastEvent.data?.employee_id || lastEvent.data?.id || lastEvent.data?.name;
            const directoryEntry = employeeId ? employeeDirectory[String(employeeId)] : undefined;
            const resolvedName = lastEvent.data?.employee_name || directoryEntry?.name || lastEvent.data?.name || 'Unknown';
            const resolvedId = lastEvent.data?.employee_id || directoryEntry?.id || lastEvent.data?.id || lastEvent.data?.name || '';
            const resolvedDept = lastEvent.data?.department || directoryEntry?.department || '';
            const resolvedPhoto = resolveProfilePhoto(
              lastEvent.data?.photo || directoryEntry?.photo,
              resolvedId
            );
            setLastRecognizedPerson({
              ...lastEvent.data,
              name: resolvedName,
              employee_name: resolvedName,
              id: resolvedId,
              employee_id: resolvedId,
              department: resolvedDept,
              photo: resolvedPhoto || lastEvent.data?.photo,
              timestamp: lastEvent.data?.timestamp || lastEvent.timestamp || new Date().toISOString(),
            });
            setRecognizedAt(Date.now());
            setStats(prev => ({
              ...prev,
              facesRecognized: prev.facesRecognized + 1
            }));
          }
          break;
        
        case 'duplicate_punch':
          if (lastEvent.data) {
            const employeeId = lastEvent.data?.employee_id || lastEvent.data?.name;
            const directoryEntry = employeeId ? employeeDirectory[String(employeeId)] : undefined;
            const resolvedName = lastEvent.data?.employee_name || directoryEntry?.name || employeeId || 'Employee';
            const resolvedId = lastEvent.data?.employee_id || directoryEntry?.id || employeeId || '';
            const resolvedPhoto = resolveProfilePhoto(
              directoryEntry?.photo,
              resolvedId
            );
            setDuplicateInfo({
              ...lastEvent.data,
              employee_name: resolvedName,
              employee_id: resolvedId,
              department: directoryEntry?.department || '',
              photo: resolvedPhoto,
              timestamp: lastEvent.timestamp || new Date().toISOString(),
            });
          }
          break;
        
        case 'status':
          if (lastEvent.statistics && typeof lastEvent.statistics.uptime === 'number') {
            setStats(prev => ({
              ...prev,
              uptime: lastEvent.statistics!.uptime
            }));
          }
          if (Array.isArray(lastEvent.recognitions) && lastEvent.recognitions.length > 0) {
            setCurrentFaces(mapRecognitionsToFaces(lastEvent.recognitions));
            setLastFacesAt(Date.now());
          } else {
            setCurrentFaces([]);
            setLastFacesAt(Date.now());
          }
          break;
        
        case 'error':
          setError(lastEvent.data?.message || 'Recognition error');
          break;
      }
    }
  }, [events, connectionStatus, cameraStatus, mapRecognitionsToFaces]);

  // Draw face detection overlay
  const drawFaceOverlay = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to match video
    const img = imgRef.current;
    if (!img) return;

    canvas.width = img.clientWidth;
    canvas.height = img.clientHeight;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (currentFaces.length === 0) {
      return;
    }

    // Draw face detection boxes
    currentFaces.forEach(face => {
      const x = (face.x / 640) * canvas.width;
      const y = (face.y / 480) * canvas.height;
      const width = (face.width / 640) * canvas.width;
      const height = (face.height / 480) * canvas.height;

      // Draw bounding box
      ctx.strokeStyle = face.recognized ? '#4CAF50' : '#FF9800';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, width, height);

      // Draw label
      ctx.fillStyle = face.recognized ? '#4CAF50' : '#FF9800';
      ctx.fillRect(x, y - 20, width, 20);
      
      ctx.fillStyle = 'white';
      ctx.font = '12px Arial';
      const label = face.recognized ? face.name || 'Recognized' : 'Unknown';
      ctx.fillText(label, x + 5, y - 5);

      // Draw confidence
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(x, y + height, width, 48);
      ctx.fillStyle = 'white';
      ctx.fillText(
        `${Math.round((face.confidence || 0) * 100)}%`,
        x + 5,
        y + height + 12
      );

      const ageText = face.age ? `Age: ${face.age}` : 'Age: N/A';
      const emotionText = face.emotion ? `Emotion: ${face.emotion}` : 'Emotion: N/A';
      ctx.fillText(ageText, x + 5, y + height + 24);
      ctx.fillText(emotionText, x + 5, y + height + 36);

      if (face.spoof) {
        ctx.fillStyle = 'rgba(255,0,0,0.85)';
        ctx.fillRect(x, y - 20, 70, 18);
        ctx.fillStyle = 'white';
        ctx.fillText('SPOOF?', x + 5, y - 6);
      }
    });
  }, [currentFaces]);

  // Continuous drawing for video stream
  useEffect(() => {
    if (cameraStatus === 'active' && showOverlays) {
      const interval = setInterval(drawFaceOverlay, 250);
      return () => clearInterval(interval);
    }
  }, [cameraStatus, currentFaces, drawFaceOverlay, showOverlays]);

  useEffect(() => {
    if (!showOverlays) {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (canvas && ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  }, [showOverlays]);
  useEffect(() => {
    if (!showOverlays || cameraStatus !== 'active') return;
    const interval = setInterval(() => {
      if (!lastFacesAt) return;
      if (Date.now() - lastFacesAt > 2000) {
        setCurrentFaces([]);
      }
    }, 500);
    return () => clearInterval(interval);
  }, [showOverlays, cameraStatus, lastFacesAt]);
  useEffect(() => {
    if (!showOverlays || cameraStatus !== 'active') return;
    const interval = setInterval(() => {
      if (!lastEventAt) return;
      if (Date.now() - lastEventAt > 1500) {
        setCurrentFaces([]);
      }
    }, 500);
    return () => clearInterval(interval);
  }, [showOverlays, cameraStatus, lastEventAt]);
  useEffect(() => {
    setCurrentFaces([]);
    setLastFacesAt(null);
  }, [cameraStatus, connectionStatus]);

  // Handle video events
  const handleVideoReady = useCallback(() => {
    setError(null);
  }, []);

  const handleVideoError = useCallback((errorMessage: string) => {
    setError(errorMessage);
  }, []);

  // Clear error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);
  useEffect(() => {
    if (!recognizedAt) return;
    const timer = setTimeout(() => {
      setLastRecognizedPerson(null);
      setRecognizedAt(null);
    }, 3000);
    return () => clearTimeout(timer);
  }, [recognizedAt]);

  useEffect(() => {
    if (!duplicateInfo) {
      setDuplicateRemainingSec(null);
      return;
    }

    const computeRemaining = () => {
      const interval = Number(attendanceSettings.duplicatePunchIntervalSec || 0);
      let elapsed = 0;
      if (duplicateInfo.last_punch_time) {
        const lastPunchMs = new Date(duplicateInfo.last_punch_time).getTime();
        elapsed = Math.max(0, (Date.now() - lastPunchMs) / 1000);
      } else if (typeof duplicateInfo.elapsed_seconds === 'number') {
        elapsed = duplicateInfo.elapsed_seconds;
      }
      const remaining = Math.max(0, interval - elapsed);
      setDuplicateRemainingSec(remaining);
      if (remaining <= 0) {
        setDuplicateInfo(null);
      }
    };

    computeRemaining();
    const intervalId = setInterval(computeRemaining, 250);
    return () => clearInterval(intervalId);
  }, [duplicateInfo, attendanceSettings.duplicatePunchIntervalSec]);

  const handleTrainFaces = async () => {
    try {
      setIsTraining(true);
      setTrainingNotice({ open: true, message: 'Training faces...', severity: 'info' });
      const response = await fetch(`${API_BASE}/faces/reload`, { method: 'POST' });
      if (!response.ok) {
        throw new Error('Training failed');
      }
      setTrainingNotice({ open: true, message: 'Face training completed', severity: 'success' });
    } catch (err) {
      console.error('Training error:', err);
      setTrainingNotice({ open: true, message: 'Face training failed', severity: 'error' });
    } finally {
      setIsTraining(false);
    }
  };

  return (
    <Box sx={{
      display: "flex",
      gap: "16px",
      height: "100%",
      padding: "24px",
      flexDirection: "column",
    }} width="100%">
      
      <CityDataDisplay />
      
      {/* Status Monitor - Reduced gap */}
      <Box sx={{ mt: 1 }}>
        <StatusMonitor
          connectionStatus={connectionStatus}
          cameraStatus={cameraStatus}
          systemStatus={systemStatus}
          stats={stats}
        />
      </Box>

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Camera Feed Container */}
      <Box sx={{
        position: 'relative',
        borderRadius: 2,
        overflow: 'hidden',
        height: "100%",
        bgcolor: 'black',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        
        <VideoStream
          isActive={cameraStatus === 'active'}
          onVideoReady={handleVideoReady}
          onVideoError={handleVideoError}
          imgRef={imgRef}
        />

        {/* Face Detection Overlay Canvas */}
        {cameraStatus === 'active' && showOverlays && (
          <canvas
            ref={canvasRef}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
            }}
          />
        )}

        {/* Recognition Status Overlay */}
        {cameraStatus === 'active' && systemStatus.recognitionActive && showOverlays && (
          <Box
            sx={{
              position: 'absolute',
              top: 16,
              right: 16,
              bgcolor: 'rgba(0,0,0,0.7)',
              color: 'white',
              px: 2,
              py: 1,
              borderRadius: 1,
              display: 'flex',
              alignItems: 'center',
              gap: 1
            }}
          >
            <CircularProgress size={16} color="inherit" />
            <Typography variant="body2">Scanning...</Typography>
          </Box>
        )}

        {(deviceSettings.organization || deviceSettings.location) && showOverlays && (
          <Box
            sx={{
              position: 'absolute',
              bottom: 12,
              right: 16,
              bgcolor: 'rgba(0,0,0,0.6)',
              color: 'white',
              px: 2,
              py: 1,
              borderRadius: 1,
              display: 'flex',
              gap: 1.5,
              alignItems: 'center',
            }}
          >
            {deviceSettings.organization && (
              <Box display="flex" alignItems="center" gap={0.5}>
                <Building2 size={16} />
                <Typography variant="body2">
                  {deviceSettings.organization}
                </Typography>
              </Box>
            )}
            {deviceSettings.location && (
              <Box display="flex" alignItems="center" gap={0.5}>
                <MapPinIcon size={16} />
                <Typography variant="body2">
                  {deviceSettings.location}
                </Typography>
              </Box>
            )}
          </Box>
        )}

        {/* Last Recognized Person */}
        {(lastRecognizedPerson || duplicateInfo) && showOverlays && (
          <Box
            sx={{
              position: 'absolute',
              bottom: 16,
              right: 16,
              maxWidth: 420,
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: duplicateInfo ? 'warning.main' : 'success.main',
              borderRadius: 2,
              p: 2,
              boxShadow: 3
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar
                src={lastRecognizedPerson?.photo || duplicateInfo?.photo}
                alt={overlayTitle}
                sx={{ width: 48, height: 48 }}
              />
              <Box flex={1}>
                <Typography variant="h6" fontWeight="bold">
                  {overlayTitle}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {overlayDept ? overlayDept : ' '}
                </Typography>
                <Typography variant="caption" color="success.main">
                  {lastRecognizedPerson
                    ? `Recognized at ${lastRecognizedPerson.timestamp
                        ? new Date(lastRecognizedPerson.timestamp).toLocaleTimeString()
                        : '-'}`
                    : ''}
                </Typography>
                {duplicateInfo && (
                  <Typography variant="caption" color="warning.main" display="block">
                    Duplicate ignored • Try again in {duplicateRemainingSec != null ? `${duplicateRemainingSec.toFixed(1)}s` : '-'}
                  </Typography>
                )}
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'flex-end' }}>
                <Chip 
                  label={duplicateInfo ? 'Duplicate' : 'Recognized'}
                  color={duplicateInfo ? 'warning' : 'success'}
                  size="small"
                  icon={<ShieldCheckIcon size={16} />}
                />
                {lastRecognizedPerson && (
                  <Button
                    variant="outlined"
                    size="small"
                    disabled={!lastRecognizedPerson?.log_id}
                    onClick={() => {
                      const logId = lastRecognizedPerson?.log_id;
                      if (!logId) return;
                      setEditingLog({
                        id: String(logId),
                        employeeId: lastRecognizedPerson?.employee_id || lastRecognizedPerson?.name || '',
                        employeeName: lastRecognizedPerson?.employee_name || lastRecognizedPerson?.name || '',
                        type: lastRecognizedPerson?.event_type || 'check-in',
                        timestamp: lastRecognizedPerson?.timestamp || new Date().toISOString(),
                        status: 'modified',
                      } as AttendanceLog);
                    }}
                  >
                    Edit
                  </Button>
                )}
              </Box>
            </Box>
          </Box>
        )}

        {/* Face Count Indicator */}
        {currentFaces.length > 0 && showOverlays && (
          <Box
            sx={{
              position: 'absolute',
              top: 16,
              left: 16,
              bgcolor: 'rgba(0,0,0,0.7)',
              color: 'white',
              px: 2,
              py: 1,
              borderRadius: 1
            }}
          >
            <Typography variant="body2">
              {currentFaces.length} face{currentFaces.length !== 1 ? 's' : ''} detected
            </Typography>
          </Box>
        )}

        {showOverlays && systemStats && (
          <Box
            sx={{
              position: 'absolute',
              bottom: 16,
              left: 16,
              bgcolor: 'rgba(0,0,0,0.7)',
              color: 'white',
              px: 2,
              py: 1.5,
              borderRadius: 1,
              minWidth: 180
            }}
          >
            <Box display="flex" alignItems="center" gap={0.75}>
              <CpuIcon size={16} />
              <Typography
                variant="body2"
                sx={{ fontVariantNumeric: 'tabular-nums', minWidth: 120 }}
              >
                CPU: {systemStats.cpu_usage}%
              </Typography>
            </Box>
            <Box display="flex" alignItems="center" gap={0.75}>
              <MemoryStick size={16} />
              <Typography
                variant="body2"
                sx={{ fontVariantNumeric: 'tabular-nums', minWidth: 160 }}
              >
                RAM: {systemStats.ram_usage_percent}%
                {typeof systemStats.ram_used_gb === 'number' && typeof systemStats.ram_total_gb === 'number'
                  ? ` (${systemStats.ram_used_gb}/${systemStats.ram_total_gb} GB)`
                  : ''}
              </Typography>
            </Box>
            <Box display="flex" alignItems="center" gap={0.75}>
              <ThermometerIcon size={16} />
              <Typography
                variant="body2"
                sx={{ fontVariantNumeric: 'tabular-nums', minWidth: 120 }}
              >
                Temp: {systemStats.temperature ?? 'N/A'}°C
              </Typography>
            </Box>
            <Box display="flex" alignItems="center" gap={0.75}>
              <CpuIcon size={16} />
              <Typography
                variant="body2"
                sx={{ fontVariantNumeric: 'tabular-nums', minWidth: 160 }}
              >
                GPU: {systemStats.gpu_clock_mhz ?? 'N/A'} MHz
                {typeof systemStats.gpu_mem_mb === 'number' ? ` (${systemStats.gpu_mem_mb} MB)` : ''}
                {typeof systemStats.gpu_busy_percent === 'number' ? ` • ${systemStats.gpu_busy_percent}%` : ''}
              </Typography>
            </Box>
          </Box>
        )}
      </Box>

      {editingLog && (
        <EditAttendanceLogModal
          isOpen={true}
          onClose={() => setEditingLog(null)}
          onSubmit={async (logData) => {
            try {
              const response = await fetch(`${API_BASE}/attendance/${logData.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  timestamp: logData.timestamp,
                  event_type: logData.type,
                  status: logData.status === 'registered' ? 'Registered' : logData.status,
                  employee_id: logData.employeeId,
                  employee_name: logData.employeeName,
                  modified: logData.modified,
                })
              });
              if (!response.ok) {
                throw new Error('Failed to update attendance log');
              }
              setEditingLog(null);
            } catch (error) {
              console.error('Error updating attendance:', error);
            }
          }}
          log={editingLog}
        />
      )}

      <Snackbar
        open={trainingNotice.open}
        autoHideDuration={3000}
        onClose={() => setTrainingNotice(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={trainingNotice.severity} onClose={() => setTrainingNotice(prev => ({ ...prev, open: false }))}>
          {trainingNotice.message}
        </Alert>
      </Snackbar>

      {/* Control Panel */}
      <Box display="flex" justifyContent="space-between" alignItems="center" gap={2}>
        <Box display="flex" gap={1}>
          <Button
            variant="outlined"
            startIcon={<SquareIcon size={16} />}
            onClick={stopCamera}
            disabled={cameraStatus !== 'active'}
          >
            Stop Camera
          </Button>
          
          <Button
            variant="contained"
            color="primary"
            startIcon={<PlayIcon size={16} />}
            onClick={startCamera}
            disabled={cameraStatus === 'active' || cameraStatus === 'starting'}
          >
            Start Camera
          </Button>
          
          <Button
            variant="outlined"
            color="secondary"
            startIcon={<RefreshCwIcon size={16} />}
            onClick={restartCamera}
            disabled={cameraStatus === 'starting' || cameraStatus === 'stopping'}
          >
            Restart
          </Button>
          <Button
            variant="outlined"
            onClick={() => setShowOverlays(prev => !prev)}
          >
            {showOverlays ? 'Hide Overlay' : 'Show Overlay'}
          </Button>
        </Box>

        {/* Status Indicators */}
        <Box display="flex" gap={1} alignItems="center">
          {stats.lastEvent && (
            <Chip
              icon={<ClockIcon size={16} />}
              label={`Last: ${stats.lastEvent}`}
              size="small"
              variant="outlined"
            />
          )}
          
          <Chip
            icon={<WifiIcon size={16} />}
            label={connectionStatus}
            size="small"
            color={connectionStatus === 'connected' ? 'success' : 'default'}
            variant="outlined"
          />
        </Box>
      </Box>
    </Box>
  );
};

export default CameraFeed;
