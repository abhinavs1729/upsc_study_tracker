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
  LinearProgress,
  Grid,
  SelectChangeEvent,
} from '@mui/material';
import { Settings as SettingsIcon, Add as AddIcon, Delete as DeleteIcon, FilterList as FilterIcon, CalendarToday as CalendarIcon, Logout as LogoutIcon, PlayArrow as PlayArrowIcon, Pause as PauseIcon, Stop as StopIcon, Refresh as RefreshIcon, Edit as EditIcon } from '@mui/icons-material';
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

interface EditingSession extends Omit<StudySession, 'startTime' | 'endTime'> {
  startTime: string;
  endTime: string;
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

type TimePeriod = 'daily' | 'weekly' | 'monthly';

interface TargetHours {
  daily: number;
  weekly: number;
  monthly: number;
}

const StudyTimer = ({ currentUser }: StudyTimerProps): JSX.Element => {
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
  const [showAddSessionDialog, setShowAddSessionDialog] = useState(false);
  const [newSession, setNewSession] = useState({
    subject: '',
    startTime: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    endTime: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    notes: '',
    isBreak: false
  });
  const [showEditSessionDialog, setShowEditSessionDialog] = useState(false);
  const [editingSession, setEditingSession] = useState<EditingSession | null>(null);

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

      // Clear the paused time reference
      pausedTimeRef.current = 0;
    } else {
      // Start new timer
      setTime(0);
      startTimeRef.current = Date.now();
      pausedTimeRef.current = 0;
      setIsRunning(true);
      setIsPaused(false);
    }
  };

  const handlePause = async () => {
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
    }
    setIsPaused(true);
    setIsRunning(false);
    pausedTimeRef.current = time * 1000; // store milliseconds
    // Do NOT set startTimeRef.current = null here; preserve it for saving.
    // Do NOT save a session on pause. Only stop should save.
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
        startTimeRef.current = null; // Only clear after saving
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
    
    // Always show HH:MM:SS format for consistency
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
  const filteredSessions = userSessions
    .filter(session => {
      if (!isValid(session.startTime)) return false;
      const sessionDate = format(session.startTime, 'yyyy-MM-dd');
      const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
      const matchesDate = sessionDate === selectedDateStr;
      const matchesSubject = filterSubject === 'all' || session.subject === filterSubject;
      return matchesDate && matchesSubject;
    })
    .sort((a, b) => {
      // Sort by start time in descending order (most recent first)
      return b.startTime.getTime() - a.startTime.getTime();
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

  // Update the session table to use the new format
  const renderSessionDuration = (session: StudySession) => {
    return formatTime(session.duration);
  };

  const handleAddSession = async () => {
    try {
      const startTime = new Date(newSession.startTime);
      const endTime = new Date(newSession.endTime);
      const duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000); // Convert to seconds

      if (!currentUser) {
        throw new Error('You must be logged in to save sessions');
      }

      const sessionData = {
        subject: newSession.subject,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        duration: duration,
        notes: newSession.notes,
        isBreak: newSession.isBreak,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Save to Firestore
      const sessionsRef = collection(db, 'users', currentUser.id, 'sessions');
      const newDocRef = await addDoc(sessionsRef, sessionData);
      console.log('Session saved successfully with ID:', newDocRef.id);
      
      // Update local state
      const updatedSession = {
        id: newDocRef.id,
        subject: newSession.subject,
        startTime,
        endTime,
        duration,
        notes: newSession.notes,
        isBreak: newSession.isBreak
      };
      setSessions(prev => [...prev, updatedSession]);

      setShowAddSessionDialog(false);
      setNewSession({
        subject: '',
        startTime: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
        endTime: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
        notes: '',
        isBreak: false
      });
    } catch (error: any) {
      console.error('Error adding session:', {
        error,
        message: error.message,
        code: error.code
      });
      alert(`Error adding session: ${error.message || 'Unknown error occurred'}`);
    }
  };

  const handleEditSession = async () => {
    if (!currentUser || !editingSession) return;

    try {
      const startTime = new Date(editingSession.startTime);
      const endTime = new Date(editingSession.endTime);
      const duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);

      const sessionData = {
        subject: editingSession.subject,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        duration: duration,
        notes: editingSession.notes,
        isBreak: editingSession.isBreak,
        updatedAt: new Date().toISOString()
      };

      // Update in Firestore
      const sessionRef = doc(db, 'users', currentUser.id, 'sessions', editingSession.id);
      await setDoc(sessionRef, sessionData, { merge: true });

      // Update local state
      setSessions(prev => prev.map(session => 
        session.id === editingSession.id 
          ? { 
              ...session, 
              ...sessionData, 
              startTime, 
              endTime, 
              duration 
            }
          : session
      ));

      setShowEditSessionDialog(false);
      setEditingSession(null);
    } catch (error: any) {
      console.error('Error updating session:', {
        error,
        message: error.message,
        code: error.code
      });
      alert(`Error updating session: ${error.message || 'Unknown error occurred'}`);
    }
  };

  const startEditingSession = (session: StudySession) => {
    setEditingSession({
      ...session,
      startTime: format(session.startTime, "yyyy-MM-dd'T'HH:mm"),
      endTime: format(session.endTime, "yyyy-MM-dd'T'HH:mm")
    });
    setShowEditSessionDialog(true);
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

        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box sx={{ textAlign: 'center', mb: 3 }}>
                  <Typography variant="h2" component="div" sx={{ fontFamily: 'monospace' }}>
                    {formatTime(time)}
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, mb: 3 }}>
                  <Box sx={{ display: 'flex', gap: 2 }}>
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

                  <Button
                    variant="contained"
                    onClick={() => setShowAddSessionDialog(true)}
                    startIcon={<AddIcon />}
                    sx={{ minWidth: 200 }}
                  >
                    Add Manual Session
                  </Button>
                </Box>

                <Divider sx={{ my: 3 }} />

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

                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle1" color="text.secondary">
                    Total Study Time: {formatTime(totalStudyTime)}
                  </Typography>
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
                          <TableCell>{renderSessionDuration(session)}</TableCell>
                          <TableCell>{session.notes}</TableCell>
                          <TableCell align="right">
                            <IconButton
                              size="small"
                              onClick={() => startEditingSession(session)}
                              sx={{ mr: 1 }}
                            >
                              <EditIcon />
                            </IconButton>
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
          </Grid>
        </Grid>

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
              <Typography variant="body2" color="text.secondary">
                {time > 0 ? `This session lasted ${formatTime(time)}` : 'No time recorded'}
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

        {/* Add Session Dialog */}
        <Dialog 
          open={showAddSessionDialog} 
          onClose={() => setShowAddSessionDialog(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Add Study Session</DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <FormControl fullWidth>
                <InputLabel>Subject</InputLabel>
                <Select
                  value={newSession.subject}
                  label="Subject"
                  onChange={(e: SelectChangeEvent) => setNewSession({ ...newSession, subject: e.target.value })}
                >
                  <MenuItem value="General Studies">General Studies</MenuItem>
                  <MenuItem value="Optional Subject">Optional Subject</MenuItem>
                  <MenuItem value="Current Affairs">Current Affairs</MenuItem>
                </Select>
              </FormControl>
              <TextField
                label="Start Time"
                type="datetime-local"
                value={newSession.startTime}
                onChange={(e) => setNewSession({ ...newSession, startTime: e.target.value })}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
              <TextField
                label="End Time"
                type="datetime-local"
                value={newSession.endTime}
                onChange={(e) => setNewSession({ ...newSession, endTime: e.target.value })}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
              <TextField
                label="Notes"
                multiline
                rows={3}
                value={newSession.notes}
                onChange={(e) => setNewSession({ ...newSession, notes: e.target.value })}
                fullWidth
              />
              <FormControl fullWidth>
                <InputLabel>Session Type</InputLabel>
                <Select
                  value={newSession.isBreak ? 'break' : 'study'}
                  label="Session Type"
                  onChange={(e: SelectChangeEvent) => setNewSession({ ...newSession, isBreak: e.target.value === 'break' })}
                >
                  <MenuItem value="study">Study Session</MenuItem>
                  <MenuItem value="break">Break</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowAddSessionDialog(false)}>Cancel</Button>
            <Button 
              onClick={handleAddSession} 
              variant="contained"
              disabled={!newSession.subject || !newSession.startTime || !newSession.endTime}
            >
              Add Session
            </Button>
          </DialogActions>
        </Dialog>

        {/* Edit Session Dialog */}
        <Dialog 
          open={showEditSessionDialog} 
          onClose={() => {
            setShowEditSessionDialog(false);
            setEditingSession(null);
          }}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Edit Study Session</DialogTitle>
          <DialogContent>
            {editingSession && (
              <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <FormControl fullWidth>
                  <InputLabel>Subject</InputLabel>
                  <Select
                    value={editingSession.subject}
                    label="Subject"
                    onChange={(e: SelectChangeEvent) => setEditingSession({ ...editingSession, subject: e.target.value })}
                  >
                    {subjects.map((sub) => (
                      <MenuItem key={sub} value={sub}>
                        {sub}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <TextField
                  label="Start Time"
                  type="datetime-local"
                  value={editingSession.startTime}
                  onChange={(e) => setEditingSession({ ...editingSession, startTime: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />
                <TextField
                  label="End Time"
                  type="datetime-local"
                  value={editingSession.endTime}
                  onChange={(e) => setEditingSession({ ...editingSession, endTime: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />
                <TextField
                  label="Notes"
                  multiline
                  rows={3}
                  value={editingSession.notes}
                  onChange={(e) => setEditingSession({ ...editingSession, notes: e.target.value })}
                  fullWidth
                />
                <FormControl fullWidth>
                  <InputLabel>Session Type</InputLabel>
                  <Select
                    value={editingSession.isBreak ? 'break' : 'study'}
                    label="Session Type"
                    onChange={(e: SelectChangeEvent) => setEditingSession({ ...editingSession, isBreak: e.target.value === 'break' })}
                  >
                    <MenuItem value="study">Study Session</MenuItem>
                    <MenuItem value="break">Break</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => {
              setShowEditSessionDialog(false);
              setEditingSession(null);
            }}>
              Cancel
            </Button>
            <Button 
              onClick={handleEditSession} 
              variant="contained"
              disabled={!editingSession?.subject || !editingSession?.startTime || !editingSession?.endTime}
            >
              Save Changes
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </LocalizationProvider>
  );
};

export default StudyTimer;
