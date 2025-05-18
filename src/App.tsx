import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { initializeApp } from '@firebase/app';
import { getAuth, onAuthStateChanged, User as FirebaseUser } from '@firebase/auth';
import { getFirestore, doc, getDoc, enableIndexedDbPersistence } from '@firebase/firestore';
import { getAnalytics } from '@firebase/analytics';
import { Box, CircularProgress, Alert, Snackbar } from '@mui/material';

// Pages
import Dashboard from './pages/Dashboard';
import StudyTimer from './pages/StudyTimer';
import Calendar from './pages/Calendar';
import Syllabus from './pages/Syllabus';
import Settings from './pages/Settings';

// Components
import Layout from './components/Layout';

const theme = createTheme({
  palette: {
    mode: 'light',
    background: {
      default: '#fff',
      paper: '#fff',
    },
    text: {
      primary: '#222',
      secondary: '#555',
    },
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
    divider: '#E0E0E0',
  },
  shape: {
    borderRadius: 0,
  },
  typography: {
    fontFamily: 'Roboto',
    allVariants: {
      fontFamily: 'Roboto',
    },
    h1: {
      fontSize: '2.5rem',
      fontWeight: 500,
      fontFamily: 'Roboto',
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 500,
      fontFamily: 'Roboto',
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 500,
      fontFamily: 'Roboto',
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 500,
      fontFamily: 'Roboto',
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 500,
      fontFamily: 'Roboto',
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 500,
      fontFamily: 'Roboto',
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.5,
      fontFamily: 'Roboto',
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.43,
      fontFamily: 'Roboto',
    },
    button: {
      textTransform: 'none',
      fontWeight: 500,
      fontFamily: 'Roboto',
    },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          borderRadius: 0,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 0,
          textTransform: 'none',
          fontWeight: 500,
          backgroundColor: '#f5f5f5',
          color: '#222',
          fontFamily: 'Roboto',
          '&:hover': {
            backgroundColor: '#e0e0e0',
          },
        },
        contained: {
          backgroundColor: '#1976d2',
          color: '#fff',
          '&:hover': {
            backgroundColor: '#1565c0',
          },
        },
      },
    },
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          fontFamily: 'Roboto',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: '#fff',
          border: '1px solid #e0e0e0',
          borderRadius: 0,
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#fff',
          color: '#222',
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          borderRadius: 0,
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiInputBase-input': {
            fontFamily: 'Roboto',
          },
          '& .MuiInputLabel-root': {
            fontFamily: 'Roboto',
          },
          '& .MuiOutlinedInput-root': {
            borderRadius: 0,
          },
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          fontFamily: 'Roboto',
        },
      },
    },
    MuiDialogContentText: {
      styleOverrides: {
        root: {
          fontFamily: 'Roboto',
        },
      },
    },
    MuiListItemText: {
      styleOverrides: {
        primary: {
          fontFamily: 'Roboto',
        },
        secondary: {
          fontFamily: 'Roboto',
        },
      },
    },
    MuiInputBase: {
      styleOverrides: {
        root: {
          fontFamily: 'Roboto',
          '& .MuiOutlinedInput-root': {
            borderRadius: 0,
          },
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          fontFamily: 'Roboto',
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        root: {
          fontFamily: 'Roboto',
          borderRadius: 0,
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          fontFamily: 'Roboto',
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          fontFamily: 'Roboto',
          borderRadius: 0,
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          fontFamily: 'Roboto',
          borderRadius: 0,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontFamily: 'Roboto',
          borderRadius: 0,
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 0,
        },
      },
    },
    MuiCardContent: {
      styleOverrides: {
        root: {
          '&:last-child': {
            paddingBottom: 16,
          },
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 0,
        },
      },
    },
  },
});

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCzfSFikXn5BUeagUupTnd-mPUlULFp-hI",
  authDomain: "upsc-tracker-7749d.firebaseapp.com",
  projectId: "upsc-tracker-7749d",
  storageBucket: "upsc-tracker-7749d.firebasestorage.app",
  messagingSenderId: "57983066588",
  appId: "1:57983066588:web:c3f8c31b64bdb72f292f19",
  measurementId: "G-1GGFSSTG4G"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const analytics = getAnalytics(app);

// Export Firebase instances
export { auth, db, analytics };

interface User {
  id: string;
  email: string;
  role: 'admin' | 'user';
}

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle offline/online status
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      setError(null);
    };

    const handleOffline = () => {
      setIsOffline(true);
      setError('You are currently offline. Some features may be limited.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check initial online status
    setIsOffline(!navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Enable offline persistence
  useEffect(() => {
    const enablePersistence = async () => {
      try {
        await enableIndexedDbPersistence(db);
        console.log('Offline persistence enabled');
      } catch (error) {
        console.error('Error enabling offline persistence:', error);
      }
    };

    enablePersistence();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        console.log('User authenticated:', user);
        setCurrentUser({
          id: user.uid,
          email: user.email || '',
          role: 'user'
        });
      } else {
        console.log('No user authenticated');
        setCurrentUser(null);
      }
      setLoading(false);
    }, (error) => {
      console.error('Auth state change error:', error);
      setError('Authentication error. Please try again.');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleCloseError = () => {
    setError(null);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <CssBaseline />
        <Router>
          <Layout>
            {isOffline && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                You are currently offline. Some features may be limited.
              </Alert>
            )}
            <Routes>
              <Route path="/" element={<Dashboard />} />
              {currentUser && (
                <>
                  <Route path="/study-timer" element={<StudyTimer currentUser={currentUser} />} />
                  <Route path="/syllabus" element={<Syllabus currentUser={currentUser} />} />
                  <Route path="/calendar" element={<Calendar />} />
                </>
              )}
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Layout>
        </Router>
        <Snackbar 
          open={!!error} 
          autoHideDuration={6000} 
          onClose={handleCloseError}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert onClose={handleCloseError} severity="error" sx={{ width: '100%' }}>
            {error}
          </Alert>
        </Snackbar>
      </LocalizationProvider>
    </ThemeProvider>
  );
};

export default App; 