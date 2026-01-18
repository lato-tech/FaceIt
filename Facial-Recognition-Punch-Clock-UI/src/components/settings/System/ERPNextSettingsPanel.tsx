import React from 'react';
import {
  Paper,
  Typography,
  Box,
  TextField,
  Button,
  FormGroup,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import { RefreshCw as RefreshCwIcon, Save as SaveIcon, CloudUpload as CloudUploadIcon } from 'lucide-react';
import { ERPNextConfig } from '../../../utils/types';

type Props = {
  settings: ERPNextConfig;
  setSettings: (settings: ERPNextConfig) => void;
  onSave: () => void;
  onTest: () => void;
  onSync: () => void;
  saving?: boolean;
};

const ERPNextSettingsPanel: React.FC<Props> = ({
  settings,
  setSettings,
  onSave,
  onTest,
  onSync,
  saving,
}) => {
  return (
    <Paper sx={{ p: 3, width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6" fontWeight="bold">
          ERPNext Settings
        </Typography>
        <Box display="flex" gap={1}>
          <Button variant="outlined" size="small" onClick={onTest} startIcon={<RefreshCwIcon size={16} />}>
            Test
          </Button>
          <Button variant="outlined" size="small" onClick={onSync} startIcon={<CloudUploadIcon size={16} />}>
            Sync Logs
          </Button>
          <Button variant="contained" size="small" onClick={onSave} startIcon={<SaveIcon size={16} />} disabled={saving}>
            Save
          </Button>
        </Box>
      </Box>

      <Box display="grid" gridTemplateColumns="1fr 1fr" gap={2}>
        <TextField
          label="Server URL"
          value={settings.serverUrl}
          onChange={(e) => setSettings({ ...settings, serverUrl: e.target.value })}
        />
        <TextField
          label="Company"
          value={settings.company}
          onChange={(e) => setSettings({ ...settings, company: e.target.value })}
        />
        <TextField
          label="Username"
          value={settings.username}
          onChange={(e) => setSettings({ ...settings, username: e.target.value })}
        />
        <TextField
          label="Password"
          type="password"
          value={settings.password}
          onChange={(e) => setSettings({ ...settings, password: e.target.value })}
        />
        <TextField
          label="API Key"
          value={settings.apiKey}
          onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
        />
        <TextField
          label="API Secret"
          type="password"
          value={settings.apiSecret}
          onChange={(e) => setSettings({ ...settings, apiSecret: e.target.value })}
        />
        <TextField
          label="Sync Interval (minutes)"
          type="number"
          value={settings.syncInterval}
          onChange={(e) => setSettings({ ...settings, syncInterval: Number(e.target.value) })}
        />
      </Box>

      <Box mt={2}>
        <Typography variant="body2" fontWeight="bold" gutterBottom>
          Logs To Send
        </Typography>
        <FormGroup row>
          <FormControlLabel
            control={
              <Checkbox
                checked={settings.sendLogs.recognition}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    sendLogs: { ...settings.sendLogs, recognition: e.target.checked },
                  })
                }
              />
            }
            label="Recognition"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={settings.sendLogs.registration}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    sendLogs: { ...settings.sendLogs, registration: e.target.checked },
                  })
                }
              />
            }
            label="Registration"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={settings.sendLogs.unknown}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    sendLogs: { ...settings.sendLogs, unknown: e.target.checked },
                  })
                }
              />
            }
            label="Unknown"
          />
        </FormGroup>
      </Box>
    </Paper>
  );
};

export default ERPNextSettingsPanel;
