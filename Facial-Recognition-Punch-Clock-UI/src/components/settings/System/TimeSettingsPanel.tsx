import React from 'react';
import { Paper, Typography, Box, FormControl, InputLabel, Select, MenuItem, TextField, Tooltip, FormControlLabel, Switch } from '@mui/material';
import { ClockIcon } from 'lucide-react';

type Props = {
  settings: {
    timeSource: string;
    ntpServers: string[];
    timeFormat: string;
    screensaverTimeoutSec?: number;
    movementSensitivityPercent?: number;
    showNewsTicker?: boolean;
    newsSource?: string;
    newsRefreshMinutes?: number;
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

      <Tooltip title="Seconds since last significant activity before idle home screen appears. Default: 15s" placement="top" arrow enterDelay={400}>
        <Box sx={{ cursor: 'help', mt: 2 }}>
          <TextField
            label="Screensaver Time (seconds)"
            variant="outlined"
            type="number"
            fullWidth
            inputProps={{ min: 3, max: 300, step: 1 }}
            value={Number(settings.screensaverTimeoutSec ?? 15)}
            onChange={(e) => setSettings({
              ...settings,
              screensaverTimeoutSec: Math.min(300, Math.max(3, Number(e.target.value) || 15)),
            })}
          />
        </Box>
      </Tooltip>

      <Tooltip title="How much frame change counts as movement. 50% means at least half the sampled pixels must change to keep camera screen active." placement="top" arrow enterDelay={400}>
        <Box sx={{ cursor: 'help', mt: 2 }}>
          <TextField
            label="Movement Sensitivity (%)"
            variant="outlined"
            type="number"
            fullWidth
            inputProps={{ min: 5, max: 95, step: 1 }}
            value={Number(settings.movementSensitivityPercent ?? 50)}
            onChange={(e) => setSettings({
              ...settings,
              movementSensitivityPercent: Math.min(95, Math.max(5, Number(e.target.value) || 50)),
            })}
          />
        </Box>
      </Tooltip>

      <Tooltip title="Show India-focused headlines on the idle screensaver. Safe fallback: hides silently if unavailable." placement="top" arrow enterDelay={400}>
        <Box sx={{ cursor: 'help', mt: 2 }}>
          <FormControlLabel
            control={(
              <Switch
                checked={Boolean(settings.showNewsTicker ?? true)}
                onChange={(e) => setSettings({
                  ...settings,
                  showNewsTicker: e.target.checked,
                })}
              />
            )}
            label="Show News Ticker on Screensaver"
          />
        </Box>
      </Tooltip>

      <Tooltip title="Choose trusted India news feed source for the screensaver ticker." placement="top" arrow enterDelay={400}>
        <Box sx={{ cursor: 'help', mt: 1 }}>
          <FormControl fullWidth variant="outlined">
            <InputLabel>News Source</InputLabel>
            <Select
              value={settings.newsSource || 'google_india'}
              label="News Source"
              onChange={(e) => setSettings({ ...settings, newsSource: String(e.target.value || 'google_india') })}
              disabled={!Boolean(settings.showNewsTicker ?? true)}
            >
              <MenuItem value="google_india">Google News India (Recommended)</MenuItem>
              <MenuItem value="hindu">The Hindu - National</MenuItem>
              <MenuItem value="indian_express">Indian Express - India</MenuItem>
              <MenuItem value="ndtv">NDTV - India</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Tooltip>

      <Tooltip title="How often to refresh headlines from source. Lower is fresher but uses more network/API calls." placement="top" arrow enterDelay={400}>
        <Box sx={{ cursor: 'help', mt: 2 }}>
          <TextField
            label="News Refresh (minutes)"
            variant="outlined"
            type="number"
            fullWidth
            disabled={!Boolean(settings.showNewsTicker ?? true)}
            inputProps={{ min: 5, max: 60, step: 1 }}
            value={Number(settings.newsRefreshMinutes ?? 15)}
            onChange={(e) => setSettings({
              ...settings,
              newsRefreshMinutes: Math.min(60, Math.max(5, Number(e.target.value) || 15)),
            })}
          />
        </Box>
      </Tooltip>
    </Paper>
  );
};

export default TimeSettingsPanel;
