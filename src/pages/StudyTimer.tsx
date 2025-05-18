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
import { Settings as SettingsIcon, Add as AddIcon, Delete as DeleteIcon, FilterList as FilterIcon, CalendarToday as CalendarIcon, Logout as LogoutIcon, PlayArrow as PlayArrowIcon, Pause as PauseIcon, Stop as StopIcon, Refresh as RefreshIcon } from '@mui/icons-material';
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
import { User } from '../types';

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
  currentUser: User | null;
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
      const elapsedTime = pausedTimeRef.current || 0; // milliseconds
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
    pausedTimeRef.current = time * 1000; // store milliseconds
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
          <Typography variant="h4" component="h1">
            Study Timer
          </Typography>
          <Box>
            <IconButton onClick={() => setShowSettingsDialog(true)}>
              <SettingsIcon />
            </IconButton>
          </Box>
        </Box>

        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ textAlign: 'center', mb: 3 }}>
              <Typography variant="h2" component="div" sx={{ fontFamily: 'monospace' }}>
                {formatTime(time)}
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mb: 3 }}>
              {!isRunning && !isPaused && (
                <Button
                  variant="contained"
                  onClick={handleStart}
                  startIcon={<PlayArrowIcon />}
                >
                  Start
                </Button>
              )}
              {isRunning && (
                <Button
                  variant="outlined"
                  onClick={handlePause}
                  startIcon={<PauseIcon />}
                >
                  Pause
                </Button>
              )}
              {isPaused && (
                <Button
                  variant="contained"
                  onClick={handleStart}
                  startIcon={<PlayArrowIcon />}
                >
                  Resume
                </Button>
              )}
              {(isRunning || isPaused) && (
                <Button
                  variant="outlined"
                  onClick={handleStop}
                  startIcon={<StopIcon />}
                >
                  Stop
                </Button>
              )}
              <Button
                variant="outlined"
                onClick={handleReset}
                startIcon={<RefreshIcon />}
              >
                Reset
              </Button>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <Button
                variant="outlined"
                onClick={() => setIsBreak(!isBreak)}
                sx={{ minWidth: 120 }}
              >
                {isBreak ? 'End Break' : 'Take Break'}
              </Button>
            </Box>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Today's Sessions</Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel>Subject</InputLabel>
                  <Select
                    value={filterSubject}
                    onChange={(e) => setFilterSubject(e.target.value)}
                    label="Subject"
                  >
                    <MenuItem value="all">All Subjects</MenuItem>
                    {subjects.map((sub) => (
                      <MenuItem key={sub} value={sub}>
                        {sub}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <DatePicker
                  label="Date"
                  value={selectedDate}
                  onChange={(newValue) => newValue && setSelectedDate(newValue)}
                  slotProps={{ textField: { size: 'small' } }}
                />
              </Box>
            </Box>

            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Subject</TableCell>
                    <TableCell>Start Time</TableCell>
                    <TableCell>End Time</TableCell>
                    <TableCell>Duration</TableCell>
                    <TableCell>Notes</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredSessions.map((session) => (
                    <TableRow key={session.id}>
                      <TableCell>{session.subject}</TableCell>
                      <TableCell>{formatDate(session.startTime)}</TableCell>
                      <TableCell>{formatDate(session.endTime)}</TableCell>
                      <TableCell>{formatTime(session.duration)}</TableCell>
                      <TableCell>{session.notes}</TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          onClick={() => confirmDelete(session)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>

        {/* Settings Dialog */}
        <Dialog open={showSettingsDialog} onClose={() => setShowSettingsDialog(false)}>
          <DialogTitle>Manage Subjects</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <TextField
                size="small"
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                placeholder="New subject name"
              />
              <Button
                variant="contained"
                onClick={handleAddSubject}
                disabled={!newSubject.trim()}
              >
                Add
              </Button>
            </Box>
            <List>
              {subjects.map((sub) => (
                <ListItem
                  key={sub}
                  secondaryAction={
                    <IconButton
                      edge="end"
                      onClick={() => handleDeleteSubject(sub)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  }
                >
                  <ListItemText primary={sub} />
                </ListItem>
              ))}
            </List>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowSettingsDialog(false)}>Close</Button>
          </DialogActions>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
          <DialogTitle>Delete Session</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to delete this session? This action cannot be undone.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => sessionToDelete && handleDeleteSession(sessionToDelete)}
              color="error"
            >
              Delete
            </Button>
          </DialogActions>
        </Dialog>

        {/* Session Dialog */}
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
                      <MenuItem key={sub} value={sub}>
                        {sub}
                      </MenuItem>
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
              disabled={!isBreak && !subject}
            >
              Save {isBreak ? 'Break' : 'Study'} Session
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </LocalizationProvider>
  );
};

export default StudyTimer;
