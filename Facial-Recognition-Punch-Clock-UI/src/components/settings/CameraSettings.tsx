import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  Paper,
  Stack,
  Switch,
  FormControlLabel,
  Alert,
  Chip,
  Divider,
  Tooltip,
} from '@mui/material';
import { Save as SaveIcon, RefreshCw as RefreshCwIcon } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || (window.location.protocol + '//' + window.location.hostname + ':5002/api');

const CameraSettings: React.FC = () => {
  const [onvifEnabled, setOnvifEnabled] = useState(false);
  const [onvifStatus, setOnvifStatus] = useState<any>(null);
  const [onvifConfig, setOnvifConfig] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Fetch ONVIF status and config
  useEffect(() => {
    fetchOnvifStatus();
    fetchOnvifConfig();
    const interval = setInterval(fetchOnvifStatus, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchOnvifStatus = async () => {
    try {
      const response = await fetch(`${API_BASE}/onvif/status`);
      if (response.ok) {
        const data = await response.json();
        setOnvifStatus(data);
        setOnvifEnabled(data.running || false);
      }
    } catch (error) {
      console.error('Error fetching ONVIF status:', error);
    }
  };

  const fetchOnvifConfig = async () => {
    try {
      const response = await fetch(`${API_BASE}/onvif/config`);
      if (response.ok) {
        const data = await response.json();
        setOnvifConfig(data);
      }
    } catch (error) {
      console.error('Error fetching ONVIF config:', error);
    }
  };

  const handleStartONVIF = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/onvif/start`, { method: 'POST' });
      const data = await response.json();
      if (response.ok) {
        setMessage({ type: 'success', text: 'ONVIF server started successfully' });
        await fetchOnvifStatus();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to start ONVIF server' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error starting ONVIF server' });
    } finally {
      setLoading(false);
    }
  };

  const handleStopONVIF = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/onvif/stop`, { method: 'POST' });
      const data = await response.json();
      if (response.ok) {
        setMessage({ type: 'success', text: 'ONVIF server stopped' });
        await fetchOnvifStatus();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to stop ONVIF server' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error stopping ONVIF server' });
    } finally {
      setLoading(false);
    }
  };

  const handleRestartONVIF = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/onvif/restart`, { method: 'POST' });
      const data = await response.json();
      if (response.ok) {
        setMessage({ type: 'success', text: 'ONVIF server restarted' });
        await fetchOnvifStatus();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to restart ONVIF server' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error restarting ONVIF server' });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateONVIFConfig = async () => {
    setLoading(true);
    try {
      const updates: any = {
        ServicePort: parseInt(onvifConfig.ServicePort || '8081'),
        RTSPPort: parseInt(onvifConfig.RTSPPort || '8554'),
        Username: onvifConfig.Username || 'admin',
        Password: onvifConfig.Password || 'admin',
      };

      if (onvifConfig.DeviceInformation) {
        updates.DeviceInformation = onvifConfig.DeviceInformation;
      }

      const response = await fetch(`${API_BASE}/onvif/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      const data = await response.json();
      if (response.ok) {
        setMessage({ type: 'success', text: 'ONVIF configuration updated' });
        await fetchOnvifConfig();
        if (onvifEnabled) {
          await handleRestartONVIF();
        }
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to update configuration' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error updating configuration' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box 
      sx={{
        padding: "24px",
      }}
    >
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5" fontWeight="bold">
          Camera Settings
        </Typography>
        <Button
          variant="contained"
          size="large"
          sx={{ 
            px: 3, 
            py: 1.5,
            fontSize: '1rem',
            fontWeight: 'bold',
            textTransform: 'none',
          }}
          startIcon={<SaveIcon size={20} />}
          onClick={handleUpdateONVIFConfig}
          disabled={loading}
        >
          Save Settings
        </Button>
      </Box>

      {message && (
        <Alert 
          severity={message.type} 
          sx={{ mb: 2 }} 
          onClose={() => setMessage(null)}
        >
          {message.text}
        </Alert>
      )}

      {/* ONVIF Server Section */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6" fontWeight="bold">
            ONVIF Server (for NVR Integration)
          </Typography>
          <Chip
            label={onvifStatus?.running ? 'Running' : 'Stopped'}
            color={onvifStatus?.running ? 'success' : 'default'}
            size="small"
          />
        </Box>

        <Stack spacing={2}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="body1">Enable ONVIF Server</Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={onvifEnabled}
                  onChange={(e) => {
                    if (e.target.checked) {
                      handleStartONVIF();
                    } else {
                      handleStopONVIF();
                    }
                  }}
                  disabled={loading}
                />
              }
              label={onvifEnabled ? 'ON' : 'OFF'}
            />
          </Box>

          {onvifStatus && (
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Connection Information:
              </Typography>
              <Typography variant="body2">
                <strong>ONVIF Service:</strong> {onvifStatus.onvif_url || 'N/A'}
              </Typography>
              <Typography variant="body2">
                <strong>RTSP Stream:</strong> {onvifStatus.rtsp_url || 'N/A'}
              </Typography>
              <Typography variant="body2">
                <strong>Port:</strong> {onvifStatus.port || 'N/A'} | <strong>RTSP Port:</strong> {onvifStatus.rtsp_port || 'N/A'}
              </Typography>
            </Box>
          )}

          <Divider />

          <Typography variant="subtitle2" fontWeight="bold">
            ONVIF Configuration
          </Typography>

          <Tooltip title="Port for ONVIF device service. Default: 8081" placement="top" arrow enterDelay={400}>
            <Box sx={{ cursor: 'help' }}>
              <TextField
                label="ONVIF Service Port"
                variant="outlined"
                type="number"
                value={onvifConfig.ServicePort || 8081}
                onChange={(e) => setOnvifConfig({ ...onvifConfig, ServicePort: e.target.value })}
                fullWidth
                helperText="Port for ONVIF device service (default: 8081)"
              />
            </Box>
          </Tooltip>
          <Tooltip title="Port for RTSP streaming. Default: 8554" placement="top" arrow enterDelay={400}>
            <Box sx={{ cursor: 'help' }}>
              <TextField
                label="RTSP Port"
                variant="outlined"
                type="number"
                value={onvifConfig.RTSPPort || 8554}
                onChange={(e) => setOnvifConfig({ ...onvifConfig, RTSPPort: e.target.value })}
                fullWidth
                helperText="Port for RTSP streaming (default: 8554)"
              />
            </Box>
          </Tooltip>
          <Tooltip title="ONVIF authentication username. Default: admin" placement="top" arrow enterDelay={400}>
            <Box sx={{ cursor: 'help' }}>
              <TextField
                label="Username"
                variant="outlined"
                value={onvifConfig.Username || 'admin'}
                onChange={(e) => setOnvifConfig({ ...onvifConfig, Username: e.target.value })}
                fullWidth
              />
            </Box>
          </Tooltip>
          <Tooltip title="ONVIF authentication password." placement="top" arrow enterDelay={400}>
            <Box sx={{ cursor: 'help' }}>
              <TextField
                label="Password"
                variant="outlined"
                type="password"
                value={onvifConfig.Password || ''}
                onChange={(e) => setOnvifConfig({ ...onvifConfig, Password: e.target.value })}
                fullWidth
              />
            </Box>
          </Tooltip>
          {onvifConfig.DeviceInformation && (
            <>
              <Tooltip title="Device manufacturer name shown in ONVIF. Default: Raspberry Pi" placement="top" arrow enterDelay={400}>
                <Box sx={{ cursor: 'help' }}>
                  <TextField
                    label="Manufacturer"
                    variant="outlined"
                    value={onvifConfig.DeviceInformation.Manufacturer || 'Raspberry Pi'}
                onChange={(e) => setOnvifConfig({
                  ...onvifConfig,
                  DeviceInformation: {
                    ...onvifConfig.DeviceInformation,
                    Manufacturer: e.target.value
                  }
                })}
                fullWidth
              />
                </Box>
              </Tooltip>
              <Tooltip title="Device model name shown in ONVIF. Default: RPi5 Facial Recognition System" placement="top" arrow enterDelay={400}>
                <Box sx={{ cursor: 'help' }}>
                  <TextField
                    label="Model"
                    variant="outlined"
                    value={onvifConfig.DeviceInformation.Model || 'RPi5 Facial Recognition System'}
                onChange={(e) => setOnvifConfig({
                  ...onvifConfig,
                  DeviceInformation: {
                    ...onvifConfig.DeviceInformation,
                    Model: e.target.value
                  }
                })}
                fullWidth
              />
                </Box>
              </Tooltip>
            </>
          )}

          <Box display="flex" gap={2} justifyContent="flex-end">
            <Button
              variant="outlined"
              onClick={handleRestartONVIF}
              disabled={loading || !onvifEnabled}
              startIcon={<RefreshCwIcon size={16} />}
            >
              Restart
            </Button>
          </Box>
        </Stack>
      </Paper>
    </Box>
  );
};

export default CameraSettings;
