import React from 'react';
import { Paper, Typography, Box, FormControl, InputLabel, Select, MenuItem, Switch, Slider, Tooltip } from '@mui/material';
import { Camera as CameraIcon, HelpCircle } from 'lucide-react';

type Props = {
  settings: any;
  setSettings: (settings: any) => void;
};

const CameraSettingsPanel: React.FC<Props> = ({ settings, setSettings }) => {
  const streamResolution = settings.streamResolution ?? '720p';
  const streamQuality = settings.streamQuality ?? 90;
  const streamFps = settings.streamFps ?? 30;
  const recognitionDistance = settings.recognitionDistance ?? 0.5;

  return (
    <Paper sx={{ p: 3, width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ mb: 2 }}>
        <CameraIcon size={20} style={{ marginRight: 6 }} /> Camera Settings
      </Typography>

      <Tooltip title="Minimum confidence (0–100%) to accept a face match. Higher = stricter, fewer false positives. Default: 85%" placement="top" arrow enterDelay={400}>
        <Box sx={{ cursor: 'help' }}>
        <Typography variant="body1" gutterBottom sx={{ mb: 1 }} component="span" display="flex" alignItems="center" gap={0.5}>
          Detection Threshold ({(settings.faceDetectionThreshold * 100).toFixed(0)}%)
          <HelpCircle size={14} style={{ opacity: 0.6, cursor: 'help' }} />
        </Typography>
      <Slider
        min={0}
        max={1}
        step={0.05}
        value={settings.faceDetectionThreshold}
        onChange={(e, val) => setSettings({ ...settings, faceDetectionThreshold: val as number })}
        sx={{ mb: 2 }}
      />
        </Box>
      </Tooltip>

      <Tooltip title="Recognition distance threshold. Lower = stricter match (fewer false positives). 0.4 = very strict, 0.6 = lenient. Default: 0.5" placement="top" arrow enterDelay={400}>
        <Box sx={{ cursor: 'help' }}>
        <Typography variant="body1" gutterBottom sx={{ mb: 1 }} component="span" display="flex" alignItems="center" gap={0.5}>
          Recognition Distance ({recognitionDistance.toFixed(2)})
          <HelpCircle size={14} style={{ opacity: 0.6, cursor: 'help' }} />
        </Typography>
      <Slider
        min={0.35}
        max={0.7}
        step={0.05}
        value={recognitionDistance}
        onChange={(e, val) => setSettings({ ...settings, recognitionDistance: val as number })}
        valueLabelDisplay="auto"
        valueLabelFormat={(v) => v.toFixed(2)}
        sx={{ mb: 2 }}
      />
        </Box>
      </Tooltip>

      <Tooltip title="Camera capture resolution. Higher = sharper but more CPU. Requires camera restart when changed. Default: 1080p" placement="top" arrow enterDelay={400}>
        <Box sx={{ cursor: 'help' }}>
        <FormControl fullWidth variant="outlined" sx={{ mt: 2 }}>
          <InputLabel>Resolution</InputLabel>
          <Select
            value={settings.cameraResolution}
            label="Resolution"
            onChange={(e) => setSettings({ ...settings, cameraResolution: e.target.value })}
          >
            <MenuItem value="720p">HD (720p)</MenuItem>
            <MenuItem value="1080p">1080p (Very Sharp)</MenuItem>
            <MenuItem value="1440p">2K (1440p)</MenuItem>
            <MenuItem value="2160p">4K (2160p)</MenuItem>
          </Select>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
            Camera capture resolution (requires restart when changed)
          </Typography>
        </FormControl>
        </Box>
      </Tooltip>

      <Tooltip title="Video feed resolution sent to the browser. Lower = less bandwidth, faster streaming. Default: 720p" placement="top" arrow enterDelay={400}>
        <Box sx={{ cursor: 'help' }}>
        <FormControl fullWidth variant="outlined" sx={{ mt: 2 }}>
          <InputLabel>Stream Resolution</InputLabel>
          <Select
            value={streamResolution}
            label="Stream Resolution"
            onChange={(e) => setSettings({ ...settings, streamResolution: e.target.value })}
          >
            <MenuItem value="480p">480p</MenuItem>
            <MenuItem value="720p">720p (Sharp)</MenuItem>
            <MenuItem value="1080p">1080p (Very Sharp)</MenuItem>
          </Select>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
            Video feed size sent to browser (applies on Save)
          </Typography>
        </FormControl>
        </Box>
      </Tooltip>

      <Tooltip title="JPEG quality for MJPEG stream. Higher = better image quality, more bandwidth. Default: 90" placement="top" arrow enterDelay={400}>
        <Box sx={{ cursor: 'help' }}>
        <Typography variant="body1" gutterBottom sx={{ mt: 2, mb: 1 }} component="span" display="flex" alignItems="center" gap={0.5}>
          Stream Quality ({streamQuality})
          <HelpCircle size={14} style={{ opacity: 0.6, cursor: 'help' }} />
        </Typography>
      <Slider
        min={50}
        max={100}
        step={5}
        value={streamQuality}
        onChange={(e, val) => setSettings({ ...settings, streamQuality: val as number })}
        valueLabelDisplay="auto"
        sx={{ mb: 1 }}
      />
        </Box>
      </Tooltip>

      <Tooltip title="Frames per second for the video stream. Higher = smoother but more CPU and bandwidth. Default: 30" placement="top" arrow enterDelay={400}>
        <Box sx={{ cursor: 'help' }}>
        <Typography variant="body1" gutterBottom sx={{ mt: 2, mb: 1 }} component="span" display="flex" alignItems="center" gap={0.5}>
          Stream FPS ({streamFps})
          <HelpCircle size={14} style={{ opacity: 0.6, cursor: 'help' }} />
        </Typography>
      <Slider
        min={10}
        max={60}
        step={1}
        value={streamFps}
        onChange={(e, val) => setSettings({ ...settings, streamFps: val as number })}
        valueLabelDisplay="auto"
        sx={{ mb: 1 }}
      />
        </Box>
      </Tooltip>

      <Tooltip title="Color processing applied to the camera feed. Natural = default; Low Light = brighter in dim environments. Default: Natural" placement="top" arrow enterDelay={400}>
        <Box sx={{ cursor: 'help' }}>
        <FormControl fullWidth variant="outlined" sx={{ mt: 2 }}>
          <InputLabel>Color Tone</InputLabel>
          <Select
            value={settings.colorTone}
            label="Color Tone"
            onChange={(e) => setSettings({ ...settings, colorTone: e.target.value })}
          >
            <MenuItem value="natural">Natural</MenuItem>
            <MenuItem value="vivid">Vivid</MenuItem>
            <MenuItem value="low-light">Low Light</MenuItem>
            <MenuItem value="bright">Bright</MenuItem>
            <MenuItem value="grayscale">Grayscale</MenuItem>
            <MenuItem value="high-contrast">High Contrast</MenuItem>
          </Select>
        </FormControl>
        </Box>
      </Tooltip>

      <Tooltip title="Improves visibility in low-light conditions by adjusting brightness and contrast. Default: On" placement="top" arrow enterDelay={400}>
        <Box mt={3} display="flex" alignItems="center" sx={{ cursor: 'help' }}>
          <Switch
            checked={settings.enhancedLighting}
            onChange={(e) => setSettings({ ...settings, enhancedLighting: e.target.checked })}
          />
          <Typography variant="body1" sx={{ ml: 1 }}>Enhanced Lighting</Typography>
          <HelpCircle size={14} style={{ opacity: 0.6, cursor: 'help', marginLeft: 4 }} />
        </Box>
      </Tooltip>
    </Paper>
  );
};

export default CameraSettingsPanel;
