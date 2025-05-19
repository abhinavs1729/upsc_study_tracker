import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import theme from './theme';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { initializeApp } from '@firebase/app';
import { getAuth, onAuthStateChanged, User as FirebaseUser } from '@firebase/auth';
import { getFirestore, doc, getDoc, enableIndexedDbPersistence } from '@firebase/firestore';
import { getAnalytics } from '@firebase/analytics';
import { Box, CircularProgress, Alert, Snackbar } from '@mui/material';
import { User } from './types';
import Layout from './components/Layout';

// Pages
import Dashboard from './pages/Dashboard';
import StudyTimer from './pages/StudyTimer';
import Calendar from './pages/Calendar';
import Syllabus from './pages/Syllabus';
import Settings from './pages/Settings';

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

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

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
      <CssBaseline />
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <Router>
          <Layout currentUser={currentUser}>
            {isOffline && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                You are currently offline. Some features may be limited.
              </Alert>
            )}
            <Routes>
              <Route path="/" element={<Dashboard currentUser={currentUser} setCurrentUser={setCurrentUser} />} />
              <Route path="/study-timer" element={<StudyTimer currentUser={currentUser} />} />
              <Route path="/syllabus" element={<Syllabus currentUser={currentUser} />} />
              <Route path="/calendar" element={<Calendar currentUser={currentUser} />} />
              <Route path="/settings" element={<Settings currentUser={currentUser} />} />
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
}

export default App; 