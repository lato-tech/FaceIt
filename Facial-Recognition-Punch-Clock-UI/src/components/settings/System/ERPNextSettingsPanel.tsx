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
  Tooltip,
} from '@mui/material';
import { RefreshCw as RefreshCwIcon, Save as SaveIcon, CloudUpload as CloudUploadIcon, HelpCircle } from 'lucide-react';
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
        <Tooltip title="ERPNext instance URL (e.g. https://your-company.erpnext.com)." placement="top" arrow enterDelay={400}>
          <Box sx={{ cursor: 'help' }}>
            <TextField
              label="Server URL"
              variant="outlined"
              fullWidth
              value={settings.serverUrl}
              onChange={(e) => setSettings({ ...settings, serverUrl: e.target.value })}
            />
          </Box>
        </Tooltip>
        <Tooltip title="ERPNext company name to sync with." placement="top" arrow enterDelay={400}>
          <Box sx={{ cursor: 'help' }}>
            <TextField
              label="Company"
              variant="outlined"
              fullWidth
              value={settings.company}
              onChange={(e) => setSettings({ ...settings, company: e.target.value })}
            />
          </Box>
        </Tooltip>
        <Tooltip title="ERPNext login username." placement="top" arrow enterDelay={400}>
          <Box sx={{ cursor: 'help' }}>
            <TextField
              label="Username"
              variant="outlined"
              fullWidth
              value={settings.username}
              onChange={(e) => setSettings({ ...settings, username: e.target.value })}
            />
          </Box>
        </Tooltip>
        <Tooltip title="ERPNext login password." placement="top" arrow enterDelay={400}>
          <Box sx={{ cursor: 'help' }}>
            <TextField
              label="Password"
              variant="outlined"
              fullWidth
              type="password"
              value={settings.password}
              onChange={(e) => setSettings({ ...settings, password: e.target.value })}
            />
          </Box>
        </Tooltip>
        <Tooltip title="Optional API key for token-based auth." placement="top" arrow enterDelay={400}>
          <Box sx={{ cursor: 'help' }}>
            <TextField
              label="API Key"
              variant="outlined"
              fullWidth
              value={settings.apiKey}
              onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
            />
          </Box>
        </Tooltip>
        <Tooltip title="Optional API secret (keep secure)." placement="top" arrow enterDelay={400}>
          <Box sx={{ cursor: 'help' }}>
            <TextField
              label="API Secret"
              variant="outlined"
              fullWidth
              type="password"
              value={settings.apiSecret}
              onChange={(e) => setSettings({ ...settings, apiSecret: e.target.value })}
            />
          </Box>
        </Tooltip>
        <Tooltip title="How often to sync attendance logs to ERPNext (in minutes). Default: 5" placement="top" arrow enterDelay={400}>
          <Box sx={{ cursor: 'help' }}>
            <TextField
              label="Sync Interval (minutes)"
              variant="outlined"
              fullWidth
              type="number"
              value={settings.syncInterval}
              onChange={(e) => setSettings({ ...settings, syncInterval: Number(e.target.value) })}
            />
          </Box>
        </Tooltip>
      </Box>

      <Tooltip title="Which event types to push to ERPNext. Default: Recognition and Registration on, Unknown off." placement="top" arrow enterDelay={400}>
        <Box mt={2} sx={{ cursor: 'help' }}>
          <Typography variant="body2" fontWeight="bold" gutterBottom display="flex" alignItems="center" gap={0.5}>
            Logs To Send
            <HelpCircle size={14} style={{ opacity: 0.6, cursor: 'help' }} />
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
      </Tooltip>
    </Paper>
  );
};

export default ERPNextSettingsPanel;
