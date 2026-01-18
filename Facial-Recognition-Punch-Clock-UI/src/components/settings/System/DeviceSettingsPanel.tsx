import React from 'react';
import { Paper, Typography, Box, TextField } from '@mui/material';

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
        <TextField
          label="Organization / Company"
          value={deviceSettings.organization}
          onChange={(e) => setDeviceSettings({ ...deviceSettings, organization: e.target.value })}
        />
        <TextField
          label="Device Location"
          value={deviceSettings.location}
          onChange={(e) => setDeviceSettings({ ...deviceSettings, location: e.target.value })}
        />
        <TextField
          label="Device IP (Internal)"
          value={deviceInfo.internalIp || 'N/A'}
          InputProps={{ readOnly: true }}
        />
        <TextField
          label="Device IP (External)"
          value={deviceInfo.externalIp || 'N/A'}
          InputProps={{ readOnly: true }}
        />
        <TextField
          label="Tailscale IP"
          value={deviceInfo.tailscaleIp || 'N/A'}
          InputProps={{ readOnly: true }}
        />
      </Box>
    </Paper>
  );
};

export default DeviceSettingsPanel;
