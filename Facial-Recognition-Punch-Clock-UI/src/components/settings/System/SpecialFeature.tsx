import React from 'react';
import { Paper, Typography, Box, Button } from '@mui/material';
import { Link } from 'react-router-dom';
import { Sliders as SlidersIcon } from 'lucide-react';

type Industry = {
  id: string;
  name: string;
  icon: React.ElementType;
  path: string;
};

type Props = {
  industries: Industry[];
};

const SpecialFeaturesPanel: React.FC<Props> = ({ industries }) => {
  return (
    <Paper sx={{ p: 3, width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h6" gutterBottom>
        <SlidersIcon size={20} style={{ marginRight: 6 }} /> Special Features
      </Typography>
      <Box display="flex" flexDirection="column" gap={1}>
        {industries.map((industry) => {
          const Icon = industry.icon;
          return (
            <Button
              key={industry.id}
              component={Link}
              to={industry.path}
              startIcon={<Icon size={18} />}
              variant="outlined"
              sx={{ justifyContent: 'flex-start' }}
            >
              {industry.name}
            </Button>
          );
        })}
      </Box>
    </Paper>
  );
};

export default SpecialFeaturesPanel;
