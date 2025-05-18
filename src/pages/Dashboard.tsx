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
} from '@mui/material';
import {
  Timeline as TimelineIcon,
  TrendingUp as TrendingUpIcon,
  Star as StarIcon,
  EmojiEvents as TrophyIcon,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
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

interface User {
  id: string;
  email: string;
  role: 'admin' | 'user';
}

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

const Dashboard: React.FC = () => {
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
  const [currentUser, setCurrentUser] = useState<User | null>(null);
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
  const handleSaveSettings = () => {
    setPrelimsDate(new Date(tempPrelimsDate));
    setMainsDate(new Date(tempMainsDate));
    setDailyGoal(tempDailyGoal * 60);
    setWeeklyGoal(tempWeeklyGoal * 60);
    setShowSettingsDialog(false);
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
    setSettingsOpen(true);
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
        .reduce((total, session) => total + session.duration, 0),
      breakTime: todaySessions
        .filter(session => session.isBreak)
        .reduce((total, session) => total + session.duration, 0),
    };
  };

  const getWeeklyStats = () => {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const weekSessions = sessions.filter(session => {
      const sessionDate = new Date(session.startTime);
      return sessionDate >= startOfWeek;
    });

    return {
      studyTime: weekSessions
        .filter(session => !session.isBreak)
        .reduce((total, session) => total + session.duration, 0),
      breakTime: weekSessions
        .filter(session => session.isBreak)
        .reduce((total, session) => total + session.duration, 0),
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

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
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

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <Typography>Loading...</Typography>
    </Box>;
  }

  if (!currentUser) {
    return (
      <Dialog open={true} onClose={() => {}}>
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
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Avatar>{currentUser.email[0].toUpperCase()}</Avatar>
          <Typography variant="subtitle1">
            {currentUser.email} ({currentUser.role})
          </Typography>
        </Box>
        <Box>
          <IconButton onClick={() => setShowSettingsDialog(true)}>
            <SettingsIcon />
          </IconButton>
          <IconButton onClick={handleLogout}>
            <LogoutIcon />
          </IconButton>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Countdown Timers */}
        <Grid item xs={12} md={6}>
          <CountdownTimer title="Prelims" targetDate={prelimsDate} accent="#1976d2" />
        </Grid>
        <Grid item xs={12} md={6}>
          <CountdownTimer title="Mains" targetDate={mainsDate} accent="#1976d2" />
        </Grid>

        {/* Today's Progress */}
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 0, boxShadow: '0 1px 4px rgba(0,0,0,0.04)', border: '1px solid #e0e0e0' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Today's Progress
                </Typography>
                <IconButton onClick={() => setShowSettingsDialog(true)} size="small">
                  <SettingsIcon />
                </IconButton>
              </Box>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {formatTime(getTodayStats().studyTime)} / {formatTime(dailyGoal)}
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={(getTodayStats().studyTime / dailyGoal) * 100} 
                  sx={{ height: 8, borderRadius: 0 }}
                />
              </Box>
              <Typography variant="body2" color="text.secondary">
                {getTodayStats().breakTime ? formatTime(getTodayStats().breakTime) : 'No break time'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Weekly Progress */}
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 0, boxShadow: '0 1px 4px rgba(0,0,0,0.04)', border: '1px solid #e0e0e0' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Weekly Progress
                </Typography>
                <IconButton onClick={() => setShowSettingsDialog(true)} size="small">
                  <SettingsIcon />
                </IconButton>
              </Box>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {formatTime(getWeeklyStats().studyTime)} / {formatTime(weeklyGoal)}
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={(getWeeklyStats().studyTime / weeklyGoal) * 100} 
                  sx={{ height: 8, borderRadius: 0 }}
                />
              </Box>
              <Typography variant="body2" color="text.secondary">
                {getWeeklyStats().breakTime ? formatTime(getWeeklyStats().breakTime) : 'No break time'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Study Streak */}
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 0, boxShadow: '0 1px 4px rgba(0,0,0,0.04)', border: '1px solid #e0e0e0' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Study Streak
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="h3" sx={{ fontWeight: 700 }}>
                  {streak}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  days
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