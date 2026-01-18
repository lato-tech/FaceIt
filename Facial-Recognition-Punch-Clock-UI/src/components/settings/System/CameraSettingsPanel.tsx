import React from 'react';
import { Paper, Typography, Box, FormControl, InputLabel, Select, MenuItem, Switch, Slider } from '@mui/material';
import { Camera as CameraIcon } from 'lucide-react';

type Props = {
  settings: any;
  setSettings: (settings: any) => void;
};

const CameraSettingsPanel: React.FC<Props> = ({ settings, setSettings }) => {
  return (
    <Paper sx={{ p: 3, width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ mb: 2 }}>
        <CameraIcon size={20} style={{ marginRight: 6 }} /> Camera Settings
      </Typography>

      <Typography variant="body1" gutterBottom sx={{ mb: 1 }}>
        Detection Threshold ({(settings.faceDetectionThreshold * 100).toFixed(0)}%)
      </Typography>
      <Slider
        min={0}
        max={1}
        step={0.05}
        value={settings.faceDetectionThreshold}
        onChange={(e, val) => setSettings({ ...settings, faceDetectionThreshold: val as number })}
        sx={{ mb: 2 }}
      />

      <FormControl fullWidth sx={{ mt: 3 }}>
        <InputLabel>Resolution</InputLabel>
        <Select
          value={settings.cameraResolution}
          label="Resolution"
          onChange={(e) => setSettings({ ...settings, cameraResolution: e.target.value })}
        >
          <MenuItem value="720p">HD (720p)</MenuItem>
          <MenuItem value="1080p">Full HD (1080p)</MenuItem>
          <MenuItem value="1440p">2K (1440p)</MenuItem>
          <MenuItem value="2160p">4K (2160p)</MenuItem>
        </Select>
      </FormControl>

      <FormControl fullWidth sx={{ mt: 3 }}>
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

      <Box mt={3} display="flex" alignItems="center">
        <Switch
          checked={settings.enhancedLighting}
          onChange={(e) => setSettings({ ...settings, enhancedLighting: e.target.checked })}
        />
        <Typography variant="body1" sx={{ ml: 1 }}>Enhanced Lighting</Typography>
      </Box>
    </Paper>
  );
};

export default CameraSettingsPanel;
