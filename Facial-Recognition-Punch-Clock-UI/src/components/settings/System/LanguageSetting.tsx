import { Paper, Typography, FormControl, InputLabel, Select, MenuItem, Box, Switch, Tooltip } from '@mui/material';
import { Languages as LanguagesIcon, HelpCircle } from 'lucide-react';
import { Language } from '../../../utils/i18n';

type Props = {
  language: string;
  autoTranslate: boolean;
  setSettings: (settings: any) => void;
  setLanguage: (lang: Language) => void;
};

const LanguageSettingsPanel = ({ language, autoTranslate, setSettings, setLanguage }: Props) => {
  return (
    <Paper sx={{ p: 3, width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h6" gutterBottom>
        <LanguagesIcon size={20} style={{ marginRight: 6 }} /> Language Settings
      </Typography>

      <Tooltip title="UI language for the settings and punch clock interface. Default: English" placement="top" arrow enterDelay={400}>
        <Box sx={{ cursor: 'help' }}>
        <FormControl fullWidth variant="outlined" sx={{ mb: 2 }}>
          <InputLabel>Interface Language</InputLabel>
          <Select
            value={language}
            label="Interface Language"
            onChange={(e) => {
              setSettings((prev: any) => ({ ...prev, language: e.target.value }));
              setLanguage(e.target.value as Language);
            }}
          >
            <MenuItem value="en">English</MenuItem>
            <MenuItem value="es">Español</MenuItem>
            <MenuItem value="fr">Français</MenuItem>
            <MenuItem value="de">Deutsch</MenuItem>
            <MenuItem value="hi">हिन्दी</MenuItem>
            <MenuItem value="zh">中文</MenuItem>
          </Select>
        </FormControl>
        </Box>
      </Tooltip>

      <Tooltip title="Translates employee names and departments to the selected UI language when possible. Default: Off" placement="top" arrow enterDelay={400}>
        <Box display="flex" alignItems="center" sx={{ cursor: 'help' }}>
          <Switch
            checked={autoTranslate}
            onChange={(e) =>
              setSettings((prev: any) => ({ ...prev, autoTranslate: e.target.checked }))
            }
          />
          <Typography sx={{ ml: 1 }}>Auto-translate employee names and departments</Typography>
          <HelpCircle size={14} style={{ opacity: 0.6, cursor: 'help', marginLeft: 4 }} />
        </Box>
      </Tooltip>
    </Paper>
  );
};

export default LanguageSettingsPanel;
