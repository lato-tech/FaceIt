import React from 'react';
import { Paper, Typography, Box, TextField, Tooltip } from '@mui/material';
type Props = {
  deviceSettings: { organization: string; location: string };
  setDeviceSettings: (settings: { organization: string; location: string }) => void;
  deviceInfo: { internalIp?: string | null; externalIp?: string | null; tailscaleIp?: string | null };
};

const DeviceSettingsPanel: React.FC<Props> = ({ deviceSettings, setDeviceSettings, deviceInfo }) => {
  return (
    <Paper sx={{ p: 3, width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h6" fontWeight="bold" gutterBottom>
        Organization & Device
      </Typography>
      <Box display="grid" gridTemplateColumns="1fr 1fr" gap={2}>
        <Tooltip title="Your company or organization name. Shown on the punch clock display." placement="top" arrow enterDelay={400}>
          <Box sx={{ cursor: 'help', width: '100%', minWidth: 0 }}>
            <TextField label="Organization / Company" variant="outlined" fullWidth value={deviceSettings.organization} onChange={(e) => setDeviceSettings({ ...deviceSettings, organization: e.target.value })} InputLabelProps={{ shrink: true }} />
          </Box>
        </Tooltip>
        <Tooltip title="Physical location of this device (e.g. building, floor, room). Shown on the display." placement="top" arrow enterDelay={400}>
          <Box sx={{ cursor: 'help', width: '100%', minWidth: 0 }}>
            <TextField label="Device Location" variant="outlined" fullWidth value={deviceSettings.location} onChange={(e) => setDeviceSettings({ ...deviceSettings, location: e.target.value })} InputLabelProps={{ shrink: true }} />
          </Box>
        </Tooltip>
        <Tooltip title="Local network IP address. Read-only." placement="top" arrow enterDelay={400}>
          <Box sx={{ cursor: 'help', width: '100%', minWidth: 0 }}>
            <TextField label="Device IP (Internal)" variant="outlined" fullWidth value={deviceInfo.internalIp || 'N/A'} InputProps={{ readOnly: true }} InputLabelProps={{ shrink: true }} />
          </Box>
        </Tooltip>
        <Tooltip title="Public IP address (if visible). Read-only." placement="top" arrow enterDelay={400}>
          <Box sx={{ cursor: 'help', width: '100%', minWidth: 0 }}>
            <TextField label="Device IP (External)" variant="outlined" fullWidth value={deviceInfo.externalIp || 'N/A'} InputProps={{ readOnly: true }} InputLabelProps={{ shrink: true }} />
          </Box>
        </Tooltip>
        <Tooltip title="Tailscale VPN IP if Tailscale is installed. Read-only." placement="top" arrow enterDelay={400}>
          <Box sx={{ cursor: 'help', width: '100%', minWidth: 0 }}>
            <TextField label="Tailscale IP" variant="outlined" fullWidth value={deviceInfo.tailscaleIp || 'N/A'} InputProps={{ readOnly: true }} InputLabelProps={{ shrink: true }} />
          </Box>
        </Tooltip>
      </Box>
    </Paper>
  );
};

export default DeviceSettingsPanel;
