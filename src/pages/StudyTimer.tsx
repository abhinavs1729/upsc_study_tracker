import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  Divider,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Avatar,
  CircularProgress,
} from '@mui/material';
import { Settings as SettingsIcon, Add as AddIcon, Delete as DeleteIcon, FilterList as FilterIcon, CalendarToday as CalendarIcon, Logout as LogoutIcon } from '@mui/icons-material';
import { format, startOfDay, endOfDay, isSameDay, parseISO, isValid } from 'date-fns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { auth, db } from '../App';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from '@firebase/auth';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs,
  doc,
  setDoc,
  getDoc,
  QueryDocumentSnapshot,
  DocumentData,
  deleteDoc
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
  endTime: Date;
  duration: number;
  notes?: string;
  isBreak: boolean;
}

interface StudyTimerProps {
  currentUser: User;
}

interface FirestoreSession {
  userId: string;
  subject: string;
  startTime: { toDate: () => Date };
  endTime: { toDate: () => Date };
  duration: number;
  notes?: string;
}

const StudyTimer: React.FC<StudyTimerProps> = ({ currentUser }) => {
  const [time, setTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [subject, setSubject] = useState('');
  const [notes, setNotes] = useState('');
  const [showSessionDialog, setShowSessionDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const [subjects, setSubjects] = useState<string[]>([]);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<number>();
  const startTimeRef = useRef<number | null>(null);
  const pausedTimeRef = useRef<number>(0);
  const [filterSubject, setFilterSubject] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<StudySession | null>(null);
  const [isBreak, setIsBreak] = useState(false);

  // Load timer state from localStorage on mount
  useEffect(() => {
    const savedTimerState = localStorage.getItem('timerState');
    if (savedTimerState) {
      const { isRunning: savedIsRunning, isPaused: savedIsPaused, startTime, pausedTime } = JSON.parse(savedTimerState);
      if (savedIsRunning && !savedIsPaused) {
        startTimeRef.current = startTime;
        setIsRunning(true);
        setIsPaused(false);
      } else if (savedIsPaused) {
        pausedTimeRef.current = pausedTime;
        setIsPaused(true);
        setIsRunning(false);
      }
    }
  }, []);

  // Save timer state to localStorage whenever it changes
  useEffect(() => {
    if (isRunning || isPaused) {
      localStorage.setItem('timerState', JSON.stringify({
        isRunning,
        isPaused,
        startTime: startTimeRef.current,
        pausedTime: pausedTimeRef.current
      }));
    } else {
      localStorage.removeItem('timerState');
    }
  }, [isRunning, isPaused]);

  // Update time display every second
  useEffect(() => {
    if (isRunning && !isPaused) {
      intervalRef.current = window.setInterval(() => {
        const elapsed = Math.floor((Date.now() - (startTimeRef.current || 0)) / 1000);
        setTime(elapsed);
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, isPaused]);

  // Load user data and sessions
  useEffect(() => {
    const loadUserData = async () => {
      if (!currentUser) {
        console.log('No current user found');
        setError('You must be logged in to use the study timer');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        console.log('Loading user data for:', currentUser.id);

        // Load user document to get subjects
        const userRef = doc(db, 'users', currentUser.id);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          console.log('User data loaded:', userData);
          setSubjects(userData.subjects || ['General Studies', 'Optional Subject', 'Current Affairs']);
        } else {
          console.log('Creating new user document');
          // Create user document with default subjects
          const defaultSubjects = ['General Studies', 'Optional Subject', 'Current Affairs'];
          await setDoc(userRef, {
            email: currentUser.email,
            role: 'user',
            subjects: defaultSubjects,
            createdAt: new Date().toISOString()
          });
          setSubjects(defaultSubjects);
        }

        // Load sessions
        const sessionsRef = collection(db, 'users', currentUser.id, 'sessions');
        const sessionsSnapshot = await getDocs(sessionsRef);
        console.log('Loaded sessions count:', sessionsSnapshot.size);

        const loadedSessions = sessionsSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            subject: data.subject,
            startTime: new Date(data.startTime),
            endTime: new Date(data.endTime),
            duration: data.duration,
            notes: data.notes || '',
            isBreak: data.isBreak || false
          };
        });

        console.log('Processed sessions:', loadedSessions);
        setSessions(loadedSessions);
      } catch (error: any) {
        console.error('Error loading user data:', {
          error,
          code: error.code,
          message: error.message,
          stack: error.stack
        });
        setError(error.message || 'Failed to load user data');
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, [currentUser]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleAddSubject = async () => {
    if (!newSubject || !currentUser) return;

    try {
      const updatedSubjects = [...subjects, newSubject];
      await setDoc(doc(db, 'users', currentUser.id), {
        subjects: updatedSubjects
      }, { merge: true });
      setSubjects(updatedSubjects);
      setNewSubject('');
    } catch (error) {
      console.error('Error adding subject:', error);
    }
  };

  const handleDeleteSubject = async (subjectToDelete: string) => {
    if (!currentUser) return;

    try {
      const updatedSubjects = subjects.filter(s => s !== subjectToDelete);
      await setDoc(doc(db, 'users', currentUser.id), {
        subjects: updatedSubjects
      }, { merge: true });
      setSubjects(updatedSubjects);
    } catch (error) {
      console.error('Error deleting subject:', error);
    }
  };

  const handleStart = () => {
    if (isPaused) {
      // Resume from pause
      const currentTime = Date.now();
      const elapsedTime = pausedTimeRef.current;
      startTimeRef.current = currentTime - elapsedTime;
      setIsPaused(false);
      setIsRunning(true);
    } else {
      // Start new timer
      setTime(0);
      startTimeRef.current = Date.now();
      pausedTimeRef.current = 0;
      setIsRunning(true);
      setIsPaused(false);
    }
  };

  const handlePause = () => {
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
    }
    setIsPaused(true);
    setIsRunning(false);
    pausedTimeRef.current = time;
    startTimeRef.current = null;
  };

  const handleStop = () => {
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
    }
    setIsRunning(false);
    setIsPaused(false);
    localStorage.removeItem('timerState');
    setShowSessionDialog(true);
  };

  const handleReset = () => {
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
    }
    setTime(0);
    setIsRunning(false);
    setIsPaused(false);
    startTimeRef.current = null;
    pausedTimeRef.current = 0;
    setIsBreak(false);
    localStorage.removeItem('timerState');
  };

  const handleSaveSession = async () => {
    if (startTimeRef.current && currentUser) {
      const endTime = new Date();
      const session: StudySession = {
        id: '', // Let Firestore generate the ID
        subject: isBreak ? 'Break' : subject,
        startTime: startTimeRef.current ? new Date(startTimeRef.current) : new Date(),
        endTime,
        duration: time,
        notes: notes || '',
        isBreak
      };

      try {
        // Save to Firestore using the Dashboard's saveSession method
        const sessionsRef = collection(db, 'users', currentUser.id, 'sessions');
        const sessionData = {
          subject: session.subject,
          startTime: session.startTime.toISOString(),
          endTime: session.endTime.toISOString(),
          duration: session.duration,
          notes: session.notes,
          isBreak: session.isBreak,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        const newDocRef = await addDoc(sessionsRef, sessionData);
        console.log('Session saved successfully with ID:', newDocRef.id);
        
        // Update local state
        const updatedSession = { ...session, id: newDocRef.id };
        setSessions(prev => [...prev, updatedSession]);

        setTime(0);
        setSubject('');
        setNotes('');
        setIsBreak(false);
        startTimeRef.current = null;
        pausedTimeRef.current = 0;
        setShowSessionDialog(false);
      } catch (error: any) {
        console.error('Error saving session:', {
          error,
          message: error.message,
          code: error.code
        });
        alert(`Error saving session: ${error.message || 'Unknown error occurred'}`);
      }
    }
  };

  const formatTime = (totalSeconds: number): string => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatDate = (date: Date): string => {
    if (!isValid(date)) return '-';
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const formatDay = (dateStr: string): string => {
    const date = parseISO(dateStr);
    if (!isValid(date)) return '-';
    return format(date, 'EEEE, MMMM d, yyyy');
  };

  // Filter sessions by current user
  const userSessions = sessions;

  // Get unique dates from user's sessions
  const uniqueDates = Array.from(new Set(
    userSessions
      .filter(session => isValid(session.startTime))
      .map(session => format(session.startTime, 'yyyy-MM-dd'))
  )).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  // Filter sessions by selected date and subject
  const filteredSessions = userSessions.filter(session => {
    if (!isValid(session.startTime)) return false;
    const sessionDate = format(session.startTime, 'yyyy-MM-dd');
    const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
    const matchesDate = sessionDate === selectedDateStr;
    const matchesSubject = filterSubject === 'all' || session.subject === filterSubject;
    return matchesDate && matchesSubject;
  });

  // Calculate total study time for the selected day
  const totalStudyTime = filteredSessions.reduce((total, session) => total + session.duration, 0);

  const handleDeleteSession = async (session: StudySession) => {
    if (!currentUser) return;

    try {
      // Delete from Firestore
      const sessionRef = doc(db, 'users', currentUser.id, 'sessions', session.id);
      await deleteDoc(sessionRef);

      // Update local state
      setSessions(prev => prev.filter(s => s.id !== session.id));
      setDeleteDialogOpen(false);
      setSessionToDelete(null);
    } catch (error: any) {
      console.error('Error deleting session:', error);
      alert(`Error deleting session: ${error.message}`);
    }
  };

  const confirmDelete = (session: StudySession) => {
    setSessionToDelete(session);
    setDeleteDialogOpen(true);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  if (!currentUser) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Typography>Please log in to use the study timer</Typography>
      </Box>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
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

        <Card sx={{ mb: 4, borderRadius: 2 }}>
          <CardContent>
            <Typography variant="h4" align="center" sx={{ mb: 3 }}>
              Study Timer
            </Typography>
            <Typography variant="h2" align="center" sx={{ mb: 3, fontFamily: 'monospace' }}>
              {formatTime(time)}
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mb: 2 }}>
              {!isRunning && !isPaused && (
                <FormControl sx={{ minWidth: 120 }}>
                  <InputLabel>Session Type</InputLabel>
                  <Select
                    value={isBreak ? 'break' : 'study'}
                    label="Session Type"
                    onChange={(e) => setIsBreak(e.target.value === 'break')}
                  >
                    <MenuItem value="study">Study</MenuItem>
                    <MenuItem value="break">Break</MenuItem>
                  </Select>
                </FormControl>
              )}
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
              {!isRunning && !isPaused && (
                <Button
                  variant="contained"
                  color={isBreak ? "secondary" : "primary"}
                  onClick={handleStart}
                  size="large"
                >
                  Start {isBreak ? 'Break' : 'Study'}
                </Button>
              )}
              {isRunning && (
                <Button
                  variant="contained"
                  color="warning"
                  onClick={handlePause}
                  size="large"
                >
                  Pause
                </Button>
              )}
              {isPaused && (
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleStart}
                  size="large"
                >
                  Resume
                </Button>
              )}
              {(isRunning || isPaused) && (
                <Button
                  variant="contained"
                  color="error"
                  onClick={handleStop}
                  size="large"
                >
                  Stop
                </Button>
              )}
              <Button
                variant="outlined"
                onClick={handleReset}
                disabled={isRunning}
                size="large"
              >
                Reset
              </Button>
            </Box>
          </CardContent>
        </Card>

        <Card sx={{ borderRadius: 2 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h5">
                Study Sessions
              </Typography>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <DatePicker
                  label="Select Date"
                  value={selectedDate}
                  onChange={(newDate) => newDate && setSelectedDate(newDate)}
                  slotProps={{
                    textField: {
                      sx: { minWidth: 200 },
                      InputProps: {
                        startAdornment: <CalendarIcon sx={{ mr: 1, color: 'action.active' }} />,
                      },
                    },
                  }}
                />
                <FormControl sx={{ minWidth: 200 }}>
                  <InputLabel>Filter by Subject</InputLabel>
                  <Select
                    value={filterSubject}
                    label="Filter by Subject"
                    onChange={(e) => setFilterSubject(e.target.value)}
                    startAdornment={<FilterIcon sx={{ mr: 1 }} />}
                  >
                    <MenuItem value="all">All Subjects</MenuItem>
                    {subjects.map((sub) => (
                      <MenuItem key={sub} value={sub}>{sub}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            </Box>

            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle1" color="text.secondary">
                {formatDay(format(selectedDate, 'yyyy-MM-dd'))}
              </Typography>
              <Typography variant="h6" color="primary">
                Total Study Time: {formatTime(totalStudyTime)}
              </Typography>
            </Box>

            <TableContainer component={Paper} sx={{ maxHeight: 440 }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Subject</TableCell>
                    <TableCell>Start Time</TableCell>
                    <TableCell>End Time</TableCell>
                    <TableCell>Duration</TableCell>
                    <TableCell>Notes</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredSessions.slice().reverse().map((session) => (
                    <TableRow key={session.id}>
                      <TableCell>{session.subject}</TableCell>
                      <TableCell>{formatDate(session.startTime)}</TableCell>
                      <TableCell>{formatDate(session.endTime)}</TableCell>
                      <TableCell>{formatTime(session.duration)}</TableCell>
                      <TableCell sx={{ maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {session.notes || '-'}
                      </TableCell>
                      <TableCell>
                        <IconButton
                          size="small"
                          onClick={() => confirmDelete(session)}
                          sx={{ color: '#000' }}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredSessions.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        No study sessions found for this day
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>

        <Dialog open={showSessionDialog} onClose={() => setShowSessionDialog(false)}>
          <DialogTitle>Save {isBreak ? 'Break' : 'Study'} Session</DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
              {!isBreak && (
                <FormControl fullWidth>
                  <InputLabel>Subject</InputLabel>
                  <Select
                    value={subject}
                    label="Subject"
                    onChange={(e) => setSubject(e.target.value)}
                    required
                  >
                    {subjects.map((sub) => (
                      <MenuItem key={sub} value={sub}>{sub}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
              <TextField
                label="Notes (optional)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                fullWidth
                multiline
                rows={3}
              />
              <Typography variant="body2" color="text.secondary">
                Duration: {formatTime(time)}
              </Typography>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowSessionDialog(false)}>Cancel</Button>
            <Button 
              onClick={handleSaveSession} 
              variant="contained" 
              color={isBreak ? "secondary" : "primary"}
              disabled={!isBreak && !subject}
            >
              Save {isBreak ? 'Break' : 'Study'} Session
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog open={showSettingsDialog} onClose={() => setShowSettingsDialog(false)}>
          <DialogTitle>Manage Subjects</DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  label="New Subject"
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  fullWidth
                />
                <Button
                  variant="contained"
                  onClick={handleAddSubject}
                  disabled={!newSubject}
                  startIcon={<AddIcon />}
                >
                  Add
                </Button>
              </Box>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {subjects.map((sub) => (
                  <Chip
                    key={sub}
                    label={sub}
                    onDelete={() => handleDeleteSubject(sub)}
                    deleteIcon={<DeleteIcon />}
                  />
                ))}
              </Box>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowSettingsDialog(false)}>Close</Button>
          </DialogActions>
        </Dialog>

        <Dialog
          open={deleteDialogOpen}
          onClose={() => {
            setDeleteDialogOpen(false);
            setSessionToDelete(null);
          }}
        >
          <DialogTitle>Confirm Delete</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to delete this study session? This action cannot be undone.
            </Typography>
            {sessionToDelete && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Subject: {sessionToDelete.subject}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Duration: {formatTime(sessionToDelete.duration)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Date: {formatDate(sessionToDelete.startTime)}
                </Typography>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button 
              onClick={() => {
                setDeleteDialogOpen(false);
                setSessionToDelete(null);
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={() => sessionToDelete && handleDeleteSession(sessionToDelete)}
              color="error"
              variant="contained"
            >
              Delete
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </LocalizationProvider>
  );
};

export default StudyTimer;
