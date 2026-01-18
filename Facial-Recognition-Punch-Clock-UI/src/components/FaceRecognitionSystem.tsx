import React from 'react';
import CameraFeed from './CameraFeed';
import { Box } from '@mui/material';

const FaceRecognitionDashboard: React.FC = () => {
  return (
    <Box sx={{ width: '100%', height: '100%' }}>
      <CameraFeed />
    </Box>
  );
};

export default FaceRecognitionDashboard;
