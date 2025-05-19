import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  Divider,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Avatar,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Timeline as TimelineIcon,
  TrendingUp as TrendingUpIcon,
  Star as StarIcon,
  EmojiEvents as TrophyIcon,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  LocalFireDepartment as FireIcon,
} from '@mui/icons-material';
import { differenceInDays, differenceInHours, differenceInMinutes, startOfWeek, endOfWeek, format, addWeeks, subWeeks } from 'date-fns';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { auth, db } from '../App';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  User as FirebaseUser
} from '@firebase/auth';
import { 
  doc,
  setDoc,
  getDoc,
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  onSnapshot,
  DocumentReference,
  DocumentData
} from '@firebase/firestore';
import { User } from '../types';

interface StudySession {
  id: string;
  subject: string;
  startTime: Date;
  endTime?: Date;
  duration: number;
  notes?: string;
  isBreak: boolean;
}

interface CountdownTimerProps {
  title: string;
  targetDate: Date;
  accent: string;
}

const CountdownTimer: React.FC<CountdownTimerProps> = ({ title, targetDate, accent }) => {
  const [timeLeft, setTimeLeft] = React.useState({
    days: 0,
    hours: 0,
    minutes: 0,
  });

  React.useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const days = Math.max(0, differenceInDays(targetDate, now));
      const hours = Math.max(0, differenceInHours(targetDate, now) % 24);
      const minutes = Math.max(0, differenceInMinutes(targetDate, now) % 60);
      setTimeLeft({ days, hours, minutes });
    };
    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 60000);
    return () => clearInterval(timer);
  }, [targetDate]);

  return (
    <Card sx={{ borderRadius: 3, boxShadow: '0 1px 4px rgba(0,0,0,0.04)', border: '1px solid #e0e0e0', background: '#fff' }}>
      <CardContent>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
          {title}
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'space-around', mt: 2 }}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h3" sx={{ fontWeight: 700 }}>
              {timeLeft.days}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Days
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h3" sx={{ fontWeight: 700 }}>
              {timeLeft.hours}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Hours
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h3" sx={{ fontWeight: 700 }}>
              {timeLeft.minutes}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Minutes
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

interface DashboardProps {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
}

const useDrawerWidth = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [drawerWidth, setDrawerWidth] = useState(240); // Default width

  useEffect(() => {
    const handleResize = () => {
      const drawer = document.querySelector('.MuiDrawer-paper');
      if (drawer) {
        setDrawerWidth(drawer.clientWidth);
      }
    };

    handleResize(); // Initial check
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return drawerWidth;
};

const Dashboard: React.FC<DashboardProps> = ({ currentUser, setCurrentUser }) => {
  const drawerWidth = useDrawerWidth();
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [prelimsDate, setPrelimsDate] = useState<Date>(new Date('2024-05-26'));
  const [mainsDate, setMainsDate] = useState<Date>(new Date('2024-09-15'));
  const [dailyGoal, setDailyGoal] = useState<number>(6 * 60); // 6 hours in minutes
  const [weeklyGoal, setWeeklyGoal] = useState<number>(30 * 60); // 30 hours in minutes
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [tempPrelimsDate, setTempPrelimsDate] = useState<string>(
    prelimsDate.toISOString().slice(0, 16)
  );
  const [tempMainsDate, setTempMainsDate] = useState<string>(
    mainsDate.toISOString().slice(0, 16)
  );
  const [tempDailyGoal, setTempDailyGoal] = useState<number>(dailyGoal / 60);
  const [tempWeeklyGoal, setTempWeeklyGoal] = useState<number>(weeklyGoal / 60);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [showLoginDialog, setShowLoginDialog] = useState(true);
  const [showSignupDialog, setShowSignupDialog] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(true);

  // Load user settings and sessions from Firestore on login
  useEffect(() => {
    if (!currentUser) return;
    setLoading(true);
    // Load settings
    getDoc(doc(db, 'users', currentUser.id)).then(userDoc => {
      if (userDoc.exists()) {
        const data = userDoc.data();
        if (data.prelimsDate) setPrelimsDate(new Date(data.prelimsDate));
        if (data.mainsDate) setMainsDate(new Date(data.mainsDate));
        if (data.dailyGoal) setDailyGoal(data.dailyGoal);
        if (data.weeklyGoal) setWeeklyGoal(data.weeklyGoal);
      }
    });
    // Load sessions
    const sessionsRef = collection(db, 'users', currentUser.id, 'sessions');
    getDocs(sessionsRef).then(snapshot => {
      const loadedSessions: StudySession[] = snapshot.docs.map(docSnap => {
        const d = docSnap.data();
        return {
          id: docSnap.id,
          subject: d.subject,
          startTime: d.startTime ? new Date(d.startTime) : new Date(),
          endTime: d.endTime ? new Date(d.endTime) : undefined,
          duration: d.duration,
          notes: d.notes,
          isBreak: d.isBreak,
        };
      });
      setSessions(loadedSessions);
      setLoading(false);
    });
    // Optionally, use onSnapshot for real-time updates
    // const unsub = onSnapshot(sessionsRef, ...)
    // return () => unsub();
  }, [currentUser]);

  // Save settings to Firestore
  const handleSaveSettings = async () => {
    if (!currentUser) {
      console.error('No current user found');
      alert('You must be logged in to save settings');
      return;
    }

    try {
      const userRef = doc(db, 'users', currentUser.id);
      await updateDoc(userRef, {
        prelimsDate: new Date(tempPrelimsDate).toISOString(),
        mainsDate: new Date(tempMainsDate).toISOString(),
        dailyGoal: tempDailyGoal * 60,
        weeklyGoal: tempWeeklyGoal * 60
      });

      setPrelimsDate(new Date(tempPrelimsDate));
      setMainsDate(new Date(tempMainsDate));
      setDailyGoal(tempDailyGoal * 60);
      setWeeklyGoal(tempWeeklyGoal * 60);
      setShowSettingsDialog(false);
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings. Please try again.');
    }
  };

  // Save a session to Firestore
  const saveSession = async (session: StudySession) => {
    if (!currentUser) {
      console.error('No current user found');
      alert('You must be logged in to save sessions');
      return;
    }

    try {
      console.log('Starting session save process...');
      console.log('Current user:', currentUser);
      console.log('Session to save:', session);

      // First, ensure user document exists
      const userRef = doc(db, 'users', currentUser.id);
      console.log('Checking user document at:', `users/${currentUser.id}`);
      
      const userDoc = await getDoc(userRef);
      console.log('User document exists:', userDoc.exists());
      
      if (!userDoc.exists()) {
        console.log('Creating new user document...');
        // Create user document if it doesn't exist
        await setDoc(userRef, {
          email: currentUser.email,
          role: 'user',
          createdAt: new Date().toISOString(),
          subjects: ['General Studies', 'Optional Subject', 'Current Affairs']
        });
        console.log('User document created successfully');
      }

      // Validate session data
      if (!session.subject) {
        throw new Error('Subject is required');
      }
      if (!session.startTime) {
        throw new Error('Start time is required');
      }
      if (session.duration < 0) {
        throw new Error('Duration cannot be negative');
      }

      const sessionsRef = collection(db, 'users', currentUser.id, 'sessions');
      console.log('Sessions collection path:', `users/${currentUser.id}/sessions`);

      // Prepare session data - only include necessary fields
      const sessionData = {
        subject: session.subject,
        startTime: session.startTime.toISOString(),
        endTime: session.endTime ? session.endTime.toISOString() : null,
        duration: Number(session.duration), // Ensure it's a number
        notes: session.notes || '',
        isBreak: Boolean(session.isBreak), // Ensure it's a boolean
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      console.log('Prepared session data:', sessionData);

      let docRef: DocumentReference<DocumentData>;
      if (!session.id) {
        // New session
        console.log('Creating new session...');
        try {
          const newDocRef = await addDoc(sessionsRef, sessionData);
          console.log('New session created with ID:', newDocRef.id);
          docRef = newDocRef;
          setSessions(prev => [...prev, { ...session, id: newDocRef.id }]);
        } catch (addError: any) {
          console.error('Error adding new session:', {
            error: addError,
            code: addError.code,
            message: addError.message
          });
          throw addError;
        }
      } else {
        // Update existing session
        console.log('Updating existing session:', session.id);
        try {
          docRef = doc(sessionsRef, session.id);
          await setDoc(docRef, {
            ...sessionData,
            updatedAt: new Date().toISOString()
          });
          console.log('Session updated successfully');
          setSessions(prev => prev.map(s => s.id === session.id ? session : s));
        } catch (updateError: any) {
          console.error('Error updating session:', {
            error: updateError,
            code: updateError.code,
            message: updateError.message
          });
          throw updateError;
        }
      }

      return docRef.id;
    } catch (error: any) {
      console.error('Detailed error saving session:', {
        error,
        message: error.message,
        code: error.code,
        stack: error.stack,
        name: error.name
      });
      
      // More specific error messages
      if (error.code === 'permission-denied') {
        alert('You do not have permission to save sessions. Please try logging in again.');
      } else if (error.code === 'invalid-argument') {
        alert('Invalid session data. Please check all fields and try again.');
      } else if (error.code === 'not-found') {
        alert('The session or user document was not found. Please try again.');
      } else {
        alert(`Error saving session: ${error.message || 'Unknown error occurred'}`);
      }
      throw error; // Re-throw to handle in the calling function
    }
  };

  // Check for existing auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user: FirebaseUser | null) => {
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          setCurrentUser({
            id: user.uid,
            email: user.email || '',
            role: userDoc.data().role || 'user'
          });
        }
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
      if (userDoc.exists()) {
        setCurrentUser({
          id: userCredential.user.uid,
          email: userCredential.user.email || '',
          role: userDoc.data().role || 'user'
        });
      }
    } catch (error) {
      alert('Invalid email or password');
    }
  };

  const handleSignup = async () => {
    try {
      // Validate email and password
      if (!email || !password) {
        alert('Please enter both email and password');
        return;
      }

      if (password.length < 6) {
        alert('Password must be at least 6 characters long');
        return;
      }

      // Create user account
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Create user document in Firestore
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        email: userCredential.user.email,
        role: 'user',
        createdAt: new Date(),
        subjects: ['General Studies', 'Optional Subject', 'Current Affairs'] // Default subjects
      });

      // Update local state
      setCurrentUser({
        id: userCredential.user.uid,
        email: userCredential.user.email || '',
        role: 'user'
      });

      // Close the dialog
      setShowSignupDialog(false);
      setEmail('');
      setPassword('');
    } catch (error: any) {
      console.error('Signup error:', error);
      if (error.code === 'auth/email-already-in-use') {
        alert('This email is already registered. Please login instead.');
      } else if (error.code === 'auth/invalid-email') {
        alert('Please enter a valid email address.');
      } else if (error.code === 'auth/weak-password') {
        alert('Password is too weak. Please use a stronger password.');
      } else {
        alert(`Error creating account: ${error.message}`);
      }
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setCurrentUser(null);
    } catch (error) {
      alert('Error signing out');
    }
  };

  const handleOpenSettings = () => {
    setTempPrelimsDate(prelimsDate.toISOString().slice(0, 16));
    setTempMainsDate(mainsDate.toISOString().slice(0, 16));
    setTempDailyGoal(dailyGoal / 60);
    setTempWeeklyGoal(weeklyGoal / 60);
    setShowSettingsDialog(true);
  };

  const getTodayStats = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todaySessions = sessions.filter(session => {
      const sessionDate = new Date(session.startTime);
      sessionDate.setHours(0, 0, 0, 0);
      return sessionDate.getTime() === today.getTime();
    });

    return {
      studyTime: todaySessions
        .filter(session => !session.isBreak)
        .reduce((total, session) => total + (session.duration / 60), 0), // Convert seconds to minutes
      breakTime: todaySessions
        .filter(session => session.isBreak)
        .reduce((total, session) => total + (session.duration / 60), 0), // Convert seconds to minutes
    };
  };

  const getWeeklyStats = () => {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const weekSessions = sessions.filter(session => {
      const sessionDate = new Date(session.startTime);
      sessionDate.setHours(0, 0, 0, 0);
      return sessionDate >= startOfWeek && sessionDate <= today;
    });

    const studyTime = weekSessions
      .filter(session => !session.isBreak)
      .reduce((total, session) => total + (session.duration / 60), 0); // Convert seconds to minutes

    const breakTime = weekSessions
      .filter(session => session.isBreak)
      .reduce((total, session) => total + (session.duration / 60), 0); // Convert seconds to minutes

    return {
      studyTime,
      breakTime
    };
  };

  const getStreak = () => {
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 7; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() - i);
      
      const hasStudySession = sessions.some(session => {
        const sessionDate = new Date(session.startTime);
        sessionDate.setHours(0, 0, 0, 0);
        return sessionDate.getTime() === checkDate.getTime() && !session.isBreak;
      });

      if (hasStudySession) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  };

  const formatTime = (minutes: number): string => {
    const days = Math.floor(minutes / (24 * 60));
    const hours = Math.floor((minutes % (24 * 60)) / 60);
    const mins = minutes % 60;
    
    if (days > 0) {
      return `${days}d ${hours}h ${mins}m`;
    }
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const formatTimeForProgress = (minutes: number): string => {
    if (!minutes || minutes < 0) return '0h 0m';
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  const todayStats = getTodayStats();
  const weeklyStats = getWeeklyStats();
  const streak = getStreak();

  const getWeeklyStudyData = () => {
    const today = new Date();
    const data = [];
    
    // Get data for the last 12 weeks
    for (let i = 11; i >= 0; i--) {
      const weekStart = startOfWeek(subWeeks(today, i));
      const weekEnd = endOfWeek(subWeeks(today, i));
      
      const weekSessions = sessions.filter(session => {
        const sessionDate = new Date(session.startTime);
        return sessionDate >= weekStart && sessionDate <= weekEnd && !session.isBreak;
      });

      const totalHours = weekSessions.reduce((total, session) => total + session.duration, 0) / 3600; // Convert seconds to hours

      data.push({
        week: format(weekStart, 'MMM d'),
        weekEnd: format(weekEnd, 'MMM d'),
        hours: Math.round(totalHours * 10) / 10, // Round to 1 decimal place
      });
    }

    return data;
  };

  const chartData = getWeeklyStudyData();

  const getCountdownColor = (days: number) => {
    if (days > 180) return '#2E7D32'; // Green
    if (days > 90) return '#ED6C02'; // Orange
    return '#D32F2F'; // Red
  };

  const getStreakMessage = (streak: number) => {
    if (streak === 0) return "Start your study journey today!";
    if (streak < 3) return "Keep the momentum going!";
    if (streak < 7) return "You're building a great habit!";
    if (streak < 14) return "Impressive dedication!";
    return "You're unstoppable!";
  };

  const getNextMilestone = (streak: number) => {
    if (streak < 3) return 3;
    if (streak < 7) return 7;
    if (streak < 14) return 14;
    if (streak < 30) return 30;
    return 100;
  };

  const getCountdownDetails = (targetDate: Date) => {
    const now = new Date();
    const totalMinutes = differenceInMinutes(targetDate, now);
    const days = Math.floor(totalMinutes / (24 * 60));
    const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
    const minutes = totalMinutes % 60;
    return { days, hours, minutes };
  };

  const getResponsiveFontSize = () => {
    if (drawerWidth > 200) {
      return {
        number: { xs: '2.5rem', sm: '2.75rem', md: '3rem', lg: '3.25rem' },
        label: { xs: '1rem', sm: '1.125rem' }
      };
    } else {
      return {
        number: { xs: '2.25rem', sm: '2.5rem', md: '2.75rem', lg: '3rem' },
        label: { xs: '0.875rem', sm: '1rem' }
      };
    }
  };

  const fontSize = getResponsiveFontSize();

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: 'Roboto, sans-serif' }}>
      <Typography>Loading...</Typography>
    </Box>;
  }

  if (!currentUser) {
    return (
      <Dialog open={true} onClose={() => {}} sx={{ '& .MuiDialog-paper': { fontFamily: 'Roboto, sans-serif' } }}>
        <DialogTitle>
          {showSignupDialog ? 'Sign Up' : 'Login'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              fullWidth
            />
            <TextField
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSignupDialog(!showSignupDialog)}>
            {showSignupDialog ? 'Already have an account? Login' : 'Need an account? Sign Up'}
          </Button>
          <Button
            variant="contained"
            onClick={showSignupDialog ? handleSignup : handleLogin}
            disabled={!email || !password}
          >
            {showSignupDialog ? 'Sign Up' : 'Login'}
          </Button>
        </DialogActions>
      </Dialog>
    );
  }

  console.log('Current user:', auth.currentUser);

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto', fontFamily: 'Roboto, sans-serif' }}>
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        mb: 4,
        position: 'relative'
      }}>
        <IconButton 
          onClick={handleOpenSettings}
          sx={{ 
            position: 'absolute',
            right: 0,
            top: '50%',
            transform: 'translateY(-50%)',
            bgcolor: '#f5f5f5',
            '&:hover': { bgcolor: '#e0e0e0' }
          }}
        >
          <SettingsIcon />
        </IconButton>
      </Box>

      <Grid container spacing={3}>
        {/* Countdown Timers */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%', position: 'relative', overflow: 'visible' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ flex: 1, fontFamily: 'Roboto' }}>
                  Prelims Countdown
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'Roboto' }}>
                  {format(prelimsDate, 'MMMM d, yyyy')}
                </Typography>
              </Box>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                position: 'relative',
                height: 200,
                overflow: 'hidden'
              }}>
                <Box sx={{ 
                  position: 'absolute',
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 2,
                  px: 2
                }}>
                  {(() => {
                    const { days, hours, minutes } = getCountdownDetails(prelimsDate);
                    return (
                      <>
                        <Box sx={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: { xs: 2, sm: 3, md: 4 },
                          width: '100%',
                          justifyContent: 'space-between'
                        }}>
                          <Box sx={{ 
                            display: 'flex', 
                            flexDirection: 'column', 
                            alignItems: 'center',
                            flex: 1,
                            minWidth: 0
                          }}>
                            <Typography 
                              variant="h1" 
                              sx={{ 
                                fontSize: fontSize.number,
                                fontWeight: 700,
                                color: getCountdownColor(days),
                                lineHeight: 1,
                                width: '100%',
                                textAlign: 'center'
                              }}
                            >
                              {days}
                            </Typography>
                            <Typography 
                              variant="h6" 
                              color="text.secondary"
                              sx={{ 
                                fontWeight: 500,
                                fontSize: fontSize.label
                              }}
                            >
                              days
                            </Typography>
                          </Box>
                          <Box sx={{ 
                            display: 'flex', 
                            flexDirection: 'column', 
                            alignItems: 'center',
                            flex: 1,
                            minWidth: 0
                          }}>
                            <Typography 
                              variant="h1" 
                              sx={{ 
                                fontSize: fontSize.number,
                                fontWeight: 700,
                                color: getCountdownColor(days),
                                lineHeight: 1,
                                width: '100%',
                                textAlign: 'center'
                              }}
                            >
                              {hours}
                            </Typography>
                            <Typography 
                              variant="h6" 
                              color="text.secondary"
                              sx={{ 
                                fontWeight: 500,
                                fontSize: fontSize.label
                              }}
                            >
                              hours
                            </Typography>
                          </Box>
                          <Box sx={{ 
                            display: 'flex', 
                            flexDirection: 'column', 
                            alignItems: 'center',
                            flex: 1,
                            minWidth: 0
                          }}>
                            <Typography 
                              variant="h1" 
                              sx={{ 
                                fontSize: fontSize.number,
                                fontWeight: 700,
                                color: getCountdownColor(days),
                                lineHeight: 1,
                                width: '100%',
                                textAlign: 'center'
                              }}
                            >
                              {minutes}
                            </Typography>
                            <Typography 
                              variant="h6" 
                              color="text.secondary"
                              sx={{ 
                                fontWeight: 500,
                                fontSize: fontSize.label
                              }}
                            >
                              minutes
                            </Typography>
                          </Box>
                        </Box>
                      </>
                    );
                  })()}
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%', position: 'relative', overflow: 'visible' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ flex: 1 }}>
                  Mains Countdown
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {format(mainsDate, 'MMMM d, yyyy')}
                </Typography>
              </Box>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                position: 'relative',
                height: 200
              }}>
                <Box sx={{ 
                  position: 'absolute',
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 2
                }}>
                  {(() => {
                    const { days, hours, minutes } = getCountdownDetails(mainsDate);
                    return (
                      <>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <Typography 
                              variant="h1" 
                              sx={{ 
                                fontSize: fontSize.number,
                                fontWeight: 700,
                                color: getCountdownColor(days),
                                lineHeight: 1,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              {days}
                            </Typography>
                            <Typography 
                              variant="h6" 
                              color="text.secondary"
                              sx={{ 
                                fontWeight: 500,
                                fontSize: fontSize.label
                              }}
                            >
                              days
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <Typography 
                              variant="h1" 
                              sx={{ 
                                fontSize: fontSize.number,
                                fontWeight: 700,
                                color: getCountdownColor(days),
                                lineHeight: 1,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              {hours}
                            </Typography>
                            <Typography 
                              variant="h6" 
                              color="text.secondary"
                              sx={{ 
                                fontWeight: 500,
                                fontSize: fontSize.label
                              }}
                            >
                              hours
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <Typography 
                              variant="h1" 
                              sx={{ 
                                fontSize: fontSize.number,
                                fontWeight: 700,
                                color: getCountdownColor(days),
                                lineHeight: 1,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              {minutes}
                            </Typography>
                            <Typography 
                              variant="h6" 
                              color="text.secondary"
                              sx={{ 
                                fontWeight: 500,
                                fontSize: fontSize.label
                              }}
                            >
                              minutes
                            </Typography>
                          </Box>
                        </Box>
                      </>
                    );
                  })()}
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Today's Progress */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ flex: 1 }}>
                  Today's Progress
                </Typography>
                <IconButton onClick={handleOpenSettings} size="small">
                  <SettingsIcon />
                </IconButton>
              </Box>
              <Box sx={{ mb: 2 }}>
                <Typography variant="h3" sx={{ mb: 1 }}>
                  {formatTimeForProgress(todayStats.studyTime)}
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  {Math.round((todayStats.studyTime / dailyGoal) * 100)}% of daily goal
                </Typography>
              </Box>
              <Box sx={{ mb: 2 }}>
                <LinearProgress 
                  variant="determinate" 
                  value={Math.min((todayStats.studyTime / dailyGoal) * 100, 100)}
                  sx={{ 
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: '#f5f5f5',
                    '& .MuiLinearProgress-bar': {
                      borderRadius: 4,
                      backgroundColor: '#2E7D32'
                    }
                  }}
                />
              </Box>
              <Typography variant="body2" color="text.secondary">
                {formatTimeForProgress(dailyGoal - todayStats.studyTime)} remaining to reach daily goal
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Weekly Progress */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ flex: 1 }}>
                  Weekly Progress
                </Typography>
                <IconButton onClick={handleOpenSettings} size="small">
                  <SettingsIcon />
                </IconButton>
              </Box>
              <Box sx={{ mb: 2 }}>
                <Typography variant="h3" sx={{ mb: 1 }}>
                  {formatTimeForProgress(weeklyStats.studyTime)}
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  {Math.round((weeklyStats.studyTime / weeklyGoal) * 100)}% of weekly goal
                </Typography>
              </Box>
              <Box sx={{ mb: 2 }}>
                <LinearProgress 
                  variant="determinate" 
                  value={Math.min((weeklyStats.studyTime / weeklyGoal) * 100, 100)}
                  sx={{ 
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: '#f5f5f5',
                    '& .MuiLinearProgress-bar': {
                      borderRadius: 4,
                      backgroundColor: '#2E7D32'
                    }
                  }}
                />
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  {formatTimeForProgress(weeklyGoal - weeklyStats.studyTime)} remaining this week
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Avg: {formatTimeForProgress(Math.round(weeklyStats.studyTime / 7))}/day
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Study Streak */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ flex: 1 }}>
                  Study Streak
                </Typography>
                <FireIcon sx={{ color: '#FF5722', mr: 1 }} />
                <Typography variant="h6" color="primary">
                  {streak} days
                </Typography>
              </Box>
              <Typography variant="body1" sx={{ mb: 2 }}>
                {getStreakMessage(streak)}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">
                  Longest streak: {streak} days
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {getNextMilestone(streak) - streak} days to next milestone
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Study Chart */}
        <Grid item xs={12}>
          <Card sx={{ borderRadius: 0, boxShadow: '0 1px 4px rgba(0,0,0,0.04)', border: '1px solid #e0e0e0' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Weekly Study Hours
              </Typography>
              <Box sx={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    <XAxis dataKey="week" stroke="#666" />
                    <YAxis stroke="#666" />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="hours" 
                      stroke="#1976d2" 
                      strokeWidth={2}
                      dot={{ fill: '#1976d2' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Settings Dialog */}
      <Dialog open={showSettingsDialog} onClose={() => setShowSettingsDialog(false)}>
        <DialogTitle>Settings</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Prelims Date"
              type="datetime-local"
              value={tempPrelimsDate}
              onChange={(e) => setTempPrelimsDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <TextField
              label="Mains Date"
              type="datetime-local"
              value={tempMainsDate}
              onChange={(e) => setTempMainsDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <TextField
              label="Daily Goal (hours)"
              type="number"
              value={tempDailyGoal}
              onChange={(e) => setTempDailyGoal(Number(e.target.value))}
              fullWidth
            />
            <TextField
              label="Weekly Goal (hours)"
              type="number"
              value={tempWeeklyGoal}
              onChange={(e) => setTempWeeklyGoal(Number(e.target.value))}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSettingsDialog(false)}>Cancel</Button>
          <Button onClick={handleSaveSettings} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Dashboard; 