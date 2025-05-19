import React, { useState } from 'react';
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography,
  IconButton,
  useTheme,
  useMediaQuery,
  Avatar,
  Divider,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import {
  Dashboard as DashboardIcon,
  Timer as TimerIcon,
  MenuBook as BookIcon,
  Menu as MenuIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  CalendarMonth as CalendarIcon,
  Assignment as AssignmentIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation, Routes, Route } from 'react-router-dom';
import Dashboard from '../pages/Dashboard';
import StudyTimer from '../pages/StudyTimer';
import SyllabusTracker from '../pages/SyllabusTracker';
import Calendar from '../pages/Calendar';
import Settings from '../pages/Settings';

interface LayoutProps {
  currentUser: {
    id: string;
    email: string;
    role: string;
  } | null;
  children?: React.ReactNode;
}

const drawerWidth = 240;
const collapsedDrawerWidth = 65;

const StyledDrawer = styled(Drawer)(({ theme, open }) => ({
  width: open ? drawerWidth : collapsedDrawerWidth,
  flexShrink: 0,
  whiteSpace: 'nowrap',
  boxSizing: 'border-box',
  '& .MuiDrawer-paper': {
    width: open ? drawerWidth : collapsedDrawerWidth,
    transition: theme.transitions.create('width', {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
    overflowX: 'hidden',
    borderRight: '1px solid rgba(0, 0, 0, 0.12)',
    backgroundColor: '#fff',
  },
}));

const menuItems = [
  { text: 'Dashboard', icon: <DashboardIcon />, path: '/' },
  { text: 'Study Timer', icon: <TimerIcon />, path: '/study-timer' },
  { text: 'Syllabus Tracker', icon: <AssignmentIcon />, path: '/syllabus' },
  { text: 'Calendar', icon: <CalendarIcon />, path: '/calendar' },
  { text: 'Settings', icon: <SettingsIcon />, path: '/settings' },
];

const Layout: React.FC<LayoutProps> = ({ currentUser, children }) => {
  const [open, setOpen] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const handleDrawerToggle = () => {
    setOpen(!open);
  };

  return (
    <Box sx={{ display: 'flex', fontFamily: 'Roboto, sans-serif' }}>
      <StyledDrawer
        variant="permanent"
        open={open}
        sx={{
          '& .MuiDrawer-paper': {
            position: 'relative',
            height: '100vh',
          },
        }}
      >
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: open ? 'space-between' : 'center',
          p: 1,
          minHeight: 64,
          borderBottom: '1px solid rgba(0, 0, 0, 0.12)'
        }}>
          {open && (
            <Typography variant="h6" sx={{ ml: 2, fontWeight: 500 }}>
              Study Tracker
            </Typography>
          )}
          <IconButton onClick={handleDrawerToggle} sx={{ mr: open ? 1 : 0 }}>
            {open ? <ChevronLeftIcon /> : <ChevronRightIcon />}
          </IconButton>
        </Box>
        <List>
          {menuItems.map((item) => (
            <ListItem
              button
              key={item.text}
              onClick={() => navigate(item.path)}
              selected={location.pathname === item.path}
              sx={{
                minHeight: 48,
                justifyContent: open ? 'initial' : 'center',
                px: 2.5,
                '&.Mui-selected': {
                  backgroundColor: 'rgba(0, 0, 0, 0.04)',
                  '&:hover': {
                    backgroundColor: 'rgba(0, 0, 0, 0.08)',
                  },
                },
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 0,
                  mr: open ? 3 : 'auto',
                  justifyContent: 'center',
                  color: location.pathname === item.path ? 'primary.main' : 'inherit',
                }}
              >
                {item.icon}
              </ListItemIcon>
              {open && (
                <ListItemText 
                  primary={item.text} 
                  sx={{ 
                    opacity: 1,
                    '& .MuiTypography-root': {
                      fontFamily: 'Roboto, sans-serif',
                      fontWeight: location.pathname === item.path ? 500 : 400,
                    },
                  }} 
                />
              )}
            </ListItem>
          ))}
        </List>
      </StyledDrawer>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${open ? drawerWidth : collapsedDrawerWidth}px)` },
          ml: { sm: `${open ? drawerWidth : collapsedDrawerWidth}px` },
          transition: theme.transitions.create(['margin', 'width'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
          overflow: 'auto',
          position: 'relative',
          pt: 2
        }}
      >
        <Box sx={{ 
          maxWidth: '100%',
          width: '100%',
          overflow: 'visible'
        }}>
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            mb: 1,
            position: 'relative',
            pt: 1
          }}>
            <Typography 
              variant="h3" 
              sx={{ 
                fontFamily: 'Roboto',
                fontWeight: 700,
                fontStyle: 'italic',
                fontSize: { xs: '2rem', sm: '2.25rem', md: '2.5rem' },
                textAlign: 'center',
                lineHeight: 1.2
              }}
            >
              शीलम परम भूषणम
            </Typography>
          </Box>
          {children}
        </Box>
      </Box>
    </Box>
  );
};

export default Layout; 