import { Paper, Typography, FormControl, InputLabel, Select, MenuItem, Box, Switch } from '@mui/material';
import { Languages as LanguagesIcon } from 'lucide-react';
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

      <FormControl fullWidth sx={{ mb: 2 }}>
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

      <Box display="flex" alignItems="center">
        <Switch
          checked={autoTranslate}
          onChange={(e) =>
            setSettings((prev: any) => ({ ...prev, autoTranslate: e.target.checked }))
          }
        />
        <Typography sx={{ ml: 1 }}>Auto-translate employee names and departments</Typography>
      </Box>
    </Paper>
  );
};

export default LanguageSettingsPanel;
