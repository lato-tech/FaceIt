import React from 'react';
import { Paper, Typography, FormControl, InputLabel, Select, MenuItem, Slider } from '@mui/material';
import { Zap as ZapIcon } from 'lucide-react';

type Props = {
  aiPerformance: {
    modelOptimization: string;
    processingUnit: string;
    confidenceThreshold: number;
  };
  setSettings: (settings: any) => void;
};

const AIPerformancePanel: React.FC<Props> = ({ aiPerformance, setSettings }) => {
  return (
    <Paper sx={{ p: 3, width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h6" gutterBottom>
        <ZapIcon size={20} style={{ marginRight: 6 }} /> AI Performance
      </Typography>

      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel>Model Optimization</InputLabel>
        <Select
          value={aiPerformance.modelOptimization}
          label="Model Optimization"
          onChange={(e) =>
            setSettings((prev: any) => ({
              ...prev,
              aiPerformance: { ...prev.aiPerformance, modelOptimization: e.target.value },
            }))
          }
        >
          <MenuItem value="speed">Speed Priority</MenuItem>
          <MenuItem value="balanced">Balanced</MenuItem>
          <MenuItem value="accuracy">Accuracy Priority</MenuItem>
        </Select>
      </FormControl>

      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel>Processing Unit</InputLabel>
        <Select
          value={aiPerformance.processingUnit}
          label="Processing Unit"
          onChange={(e) =>
            setSettings((prev: any) => ({
              ...prev,
              aiPerformance: { ...prev.aiPerformance, processingUnit: e.target.value },
            }))
          }
        >
          <MenuItem value="auto">Auto-detect</MenuItem>
          <MenuItem value="cpu">CPU Only</MenuItem>
          <MenuItem value="gpu">GPU Priority</MenuItem>
        </Select>
      </FormControl>

      <Typography gutterBottom>
        Confidence Threshold ({(aiPerformance.confidenceThreshold * 100).toFixed(0)}%)
      </Typography>
      <Slider
        min={0}
        max={1}
        step={0.05}
        value={aiPerformance.confidenceThreshold}
        onChange={(e, val) =>
          setSettings((prev: any) => ({
            ...prev,
            aiPerformance: { ...prev.aiPerformance, confidenceThreshold: val as number },
          }))
        }
      />
    </Paper>
  );
};

export default AIPerformancePanel;
