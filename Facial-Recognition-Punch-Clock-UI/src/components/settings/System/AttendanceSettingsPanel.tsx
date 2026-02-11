import React from 'react';
import { Paper, Typography, Box, TextField, Tooltip } from '@mui/material';
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
      <Tooltip title="Prevents duplicate check-in/out within this period. E.g. 30 = same person can't punch again for 30 seconds. Default: 30" placement="top" arrow enterDelay={400}>
        <Box sx={{ cursor: 'help' }}>
          <TextField
            label="Duplicate Punch Interval (seconds)"
            variant="outlined"
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
      </Tooltip>
    </Paper>
  );
};

export default AttendanceSettingsPanel;
