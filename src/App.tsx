import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { initializeApp } from '@firebase/app';
import { getAuth, onAuthStateChanged, User as FirebaseUser } from '@firebase/auth';
import { getFirestore, doc, getDoc } from '@firebase/firestore';
import { getAnalytics } from '@firebase/analytics';
import { Box, CircularProgress } from '@mui/material';

// Pages
import Dashboard from './pages/Dashboard';
import StudyTimer from './pages/StudyTimer';
import Calendar from './pages/Calendar';
import Syllabus from './pages/Syllabus';
import Settings from './pages/Settings';

// Components
import Layout from './components/Layout';

const pastel = {
  blue: '#A7C7E7',
  green: '#B5EAD7',
  pink: '#FFDAC1',
  yellow: '#FFF5BA',
  purple: '#C7CEEA',
};

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
      main: pastel.blue,
      contrastText: '#222',
    },
    secondary: {
      main: pastel.pink,
      contrastText: '#222',
    },
    success: {
      main: pastel.green,
    },
    warning: {
      main: pastel.yellow,
    },
    info: {
      main: pastel.purple,
    },
    divider: '#E0E0E0',
  },
  shape: {
    borderRadius: 12,
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    fontSize: 16,
    h1: { fontWeight: 700 },
    h2: { fontWeight: 600 },
    h3: { fontWeight: 600 },
    h4: { fontWeight: 600 },
    h5: { fontWeight: 500 },
    h6: { fontWeight: 500 },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 500,
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
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!currentUser) {
    return (
      <ThemeProvider theme={theme}>
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <CssBaseline />
          <Router>
            <Layout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Layout>
          </Router>
        </LocalizationProvider>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <CssBaseline />
        <Router>
          <Layout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/study-timer" element={<StudyTimer currentUser={currentUser} />} />
              <Route path="/syllabus" element={<Syllabus currentUser={currentUser} />} />
              <Route path="/calendar" element={<Calendar />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Layout>
        </Router>
      </LocalizationProvider>
    </ThemeProvider>
  );
};

export default App; 