import React from 'react';
import { Paper, Typography, Box, TextField } from '@mui/material';
import { ClockIcon } from 'lucide-react';

type Props = {
  settings: {
    duplicatePunchIntervalSec: number;
  };
  setSettings: (settings: Props['settings']) => void;
};

const AttendanceSettingsPanel: React.FC<Props> = ({ settings, setSettings }) => {
  return (
    <Paper sx={{ p: 3, width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ mb: 2 }}>
        <ClockIcon size={20} style={{ marginRight: 6 }} /> Attendance Settings
      </Typography>
      <Box>
        <TextField
          label="Duplicate Punch Interval (seconds)"
          type="number"
          value={settings.duplicatePunchIntervalSec}
          onChange={(e) => setSettings({
            ...settings,
            duplicatePunchIntervalSec: Math.max(0, Number(e.target.value)),
          })}
          helperText="Within this window, additional punches are ignored"
          fullWidth
        />
      </Box>
    </Paper>
  );
};

export default AttendanceSettingsPanel;
