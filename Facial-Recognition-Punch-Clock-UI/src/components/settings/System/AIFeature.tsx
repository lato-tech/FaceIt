import React from 'react';
import { Paper, Typography, Grid, Box, Switch, Tooltip } from '@mui/material';
import { Brain as BrainIcon, HelpCircle } from 'lucide-react';

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

const DESCRIPTIONS: Record<string, string> = {
  enhancedRecognition: 'Improves face matching accuracy using advanced algorithms.',
  multiPersonDetection: 'Detect and recognize multiple faces in the frame at once.',
  emotionDetection: 'Estimate emotion (requires DeepFace). Addon feature.',
  ageEstimation: 'Estimate age (requires DeepFace). Addon feature.',
  maskDetection: 'Detect if person is wearing a face mask.',
  antispoofing: 'Detect photos or screens instead of real faces to prevent spoofing.',
  behaviorAnalysis: 'Analyze behavior patterns. Addon feature.',
  glassesDetection: 'Detect if person is wearing glasses.',
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
            <Tooltip title={DESCRIPTIONS[feature] || ''} placement="top" arrow enterDelay={400}>
              <Box display="flex" alignItems="center" justifyContent="space-between" py={0.5}>
                <Typography variant="body2" display="flex" alignItems="center" gap={0.5}>
                  {LABELS[feature] || feature.replace(/([A-Z])/g, ' $1').trim()}
                  <HelpCircle size={14} style={{ opacity: 0.6, cursor: 'help' }} />
                </Typography>
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
            </Tooltip>
          </Grid>
        ))}
      </Grid>
    </Paper>
  );
};

export default AIFeaturesPanel;
