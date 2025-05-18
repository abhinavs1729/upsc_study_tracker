import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

const Settings: React.FC = () => {
  return (
    <Box sx={{ p: { xs: 1, sm: 3 }, background: '#fff', minHeight: '100vh' }}>
      <Paper sx={{ p: 4, borderRadius: 3, background: '#A7C7E7', mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: '#222' }}>
          Settings
        </Typography>
        <Typography variant="body1" sx={{ color: '#222', mt: 2 }}>
          Settings and preferences will be implemented here.
        </Typography>
      </Paper>
    </Box>
  );
};

export default Settings; 