import React from 'react';
import { Paper, Typography, Box, FormControl, InputLabel, Select, MenuItem, TextField } from '@mui/material';
import { ClockIcon } from 'lucide-react';

type Props = {
  settings: {
    timeSource: string;
    ntpServers: string[];
    timeFormat: string;
  };
  setSettings: (settings: Props['settings']) => void;
};

const TimeSettingsPanel: React.FC<Props> = ({ settings, setSettings }) => {
  const ntpValue = (settings.ntpServers || []).join(', ');

  return (
    <Paper sx={{ p: 3, width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ mb: 2 }}>
        <ClockIcon size={20} style={{ marginRight: 6 }} /> Time Settings
      </Typography>

      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel>Time Source</InputLabel>
        <Select
          value={settings.timeSource}
          label="Time Source"
          onChange={(e) => setSettings({ ...settings, timeSource: e.target.value })}
        >
          <MenuItem value="auto">Auto (Time.is → NTP → System)</MenuItem>
          <MenuItem value="time.is">Time.is</MenuItem>
          <MenuItem value="ntp">NTP Servers</MenuItem>
          <MenuItem value="system">System Clock</MenuItem>
        </Select>
      </FormControl>

      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel>Time Format</InputLabel>
        <Select
          value={settings.timeFormat}
          label="Time Format"
          onChange={(e) => setSettings({ ...settings, timeFormat: e.target.value })}
        >
          <MenuItem value="12h">12 Hour</MenuItem>
          <MenuItem value="24h">24 Hour</MenuItem>
        </Select>
      </FormControl>

      <Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          NTP Servers (comma separated)
        </Typography>
        <TextField
          fullWidth
          value={ntpValue}
          onChange={(e) => setSettings({
            ...settings,
            ntpServers: e.target.value.split(',').map((v) => v.trim()).filter(Boolean),
          })}
          placeholder="time.google.com, pool.ntp.org, time.cloudflare.com"
        />
      </Box>
    </Paper>
  );
};

export default TimeSettingsPanel;
