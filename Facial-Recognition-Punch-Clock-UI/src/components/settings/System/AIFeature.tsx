import React from 'react';
import { Paper, Typography, Grid, Box, Switch } from '@mui/material';
import { Brain as BrainIcon } from 'lucide-react';

type Props = {
  aiFeatures: { [key: string]: boolean };
  setSettings: (settings: any) => void;
};

const LABELS: Record<string, string> = {
  enhancedRecognition: 'Enhanced Recognition',
  multiPersonDetection: 'Multi Person Detection',
  emotionDetection: 'Emotion Detection',
  ageEstimation: 'Age Estimation',
  maskDetection: 'Mask Detection',
  antispoofing: 'Anti Spoofing',
  behaviorAnalysis: 'Behavior Analysis',
  glassesDetection: 'Glasses Detection',
};

const AIFeaturesPanel: React.FC<Props> = ({ aiFeatures, setSettings }) => {
  return (
    <Paper sx={{ p: 3, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
      <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ mb: 2 }}>
        <BrainIcon size={20} style={{ marginRight: 6 }} /> AI Features
      </Typography>
      <Grid container spacing={1}>
        {Object.entries(aiFeatures).map(([feature, enabled]) => (
          <Grid item xs={12} key={feature}>
            <Box display="flex" alignItems="center" justifyContent="space-between" py={0.5}>
              <Typography variant="body2">{LABELS[feature] || feature.replace(/([A-Z])/g, ' $1').trim()}</Typography>
              <Switch
                size="small"
                checked={enabled}
                onChange={(e) =>
                  setSettings((prev: any) => ({
                    ...prev,
                    aiFeatures: { ...prev.aiFeatures, [feature]: e.target.checked },
                  }))
                }
              />
            </Box>
          </Grid>
        ))}
      </Grid>
    </Paper>
  );
};

export default AIFeaturesPanel;
