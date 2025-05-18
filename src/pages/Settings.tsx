import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Avatar,
  IconButton,
  Divider,
} from '@mui/material';
import { Logout as LogoutIcon } from '@mui/icons-material';
import { auth } from '../App';
import { signOut } from '@firebase/auth';
import { User } from '../types';

interface SettingsProps {
  currentUser: User | null;
}

const Settings: React.FC<SettingsProps> = ({ currentUser }) => {
  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      alert('Error signing out');
    }
  };

  if (!currentUser) {
    return null;
  }

  return (
    <Box sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
      <Typography 
        variant="h4" 
        sx={{ 
          mb: 4,
          fontFamily: 'Roboto',
          fontWeight: 500
        }}
      >
        Settings
      </Typography>

      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <Avatar sx={{ width: 64, height: 64, mr: 2 }}>
              {currentUser.email[0].toUpperCase()}
            </Avatar>
            <Box>
              <Typography variant="h6">
                {currentUser.email}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1)}
              </Typography>
            </Box>
          </Box>

          <Divider sx={{ my: 2 }} />

          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="body1">
              Account Settings
            </Typography>
            <IconButton onClick={handleLogout} color="error">
              <LogoutIcon />
            </IconButton>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Settings; 