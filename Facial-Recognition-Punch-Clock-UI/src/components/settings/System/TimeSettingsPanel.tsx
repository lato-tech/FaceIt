import React from 'react';
import { Paper, Typography, Box, FormControl, InputLabel, Select, MenuItem, TextField, Tooltip } from '@mui/material';
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

      <Tooltip title="How the device gets the current time. Auto tries Time.is first, then NTP, then system clock. Default: Auto" placement="top" arrow enterDelay={400}>
        <Box sx={{ cursor: 'help' }}>
        <FormControl fullWidth variant="outlined" sx={{ mb: 2 }}>
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
        </Box>
      </Tooltip>

      <Tooltip title="12h = AM/PM format; 24h = military format. Used for attendance timestamps. Default: 24h" placement="top" arrow enterDelay={400}>
        <Box sx={{ cursor: 'help' }}>
        <FormControl fullWidth variant="outlined" sx={{ mb: 2 }}>
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
        </Box>
      </Tooltip>

      <Tooltip title="NTP servers used when Time Source is NTP or Auto. Comma-separated list. Default: time.google.com, pool.ntp.org, time.cloudflare.com" placement="top" arrow enterDelay={400}>
        <Box sx={{ cursor: 'help' }}>
          <TextField
            label="NTP Servers (comma separated)"
            variant="outlined"
            fullWidth
            value={ntpValue}
            onChange={(e) => setSettings({
              ...settings,
              ntpServers: e.target.value.split(',').map((v) => v.trim()).filter(Boolean),
            })}
            placeholder="time.google.com, pool.ntp.org, time.cloudflare.com"
          />
        </Box>
      </Tooltip>
    </Paper>
  );
};

export default TimeSettingsPanel;
