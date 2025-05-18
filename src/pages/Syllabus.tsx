/** @jsxImportSource react */
import * as React from 'react';
import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  LinearProgress,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Tabs,
  Tab,
  CircularProgress,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  BarChart as BarChartIcon,
  List as ListIcon,
} from '@mui/icons-material';
import Analytics from '../components/Analytics';
import { db } from '../App';
import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where
} from '@firebase/firestore';
import { User } from '../types';

interface Lecture {
  id: string;
  title: string;
  topic?: string;
  hours: number;
  status: 'not_started' | 'in_progress' | 'completed';
  notes?: string;
  lastStudied?: Date;
  progress: number;
}

interface Subtopic {
  id: string;
  title: string;
  lectures: Lecture[];
  status: 'not_started' | 'in_progress' | 'completed';
  progress: number;
}

interface Subject {
  id: string;
  title: string;
  subtopics: Subtopic[];
  status: 'not_started' | 'in_progress' | 'completed';
  progress: number;
  defaultLectureHours?: number;
}

interface Paper {
  id: string;
  title: string;
  subjects: Subject[];
  status: 'not_started' | 'in_progress' | 'completed';
  progress: number;
}

interface Syllabus {
  papers: Paper[];
}

const STORAGE_KEY = 'syllabus_progress';

const initialSyllabus: Syllabus = {
  papers: []
};

interface SyllabusProps {
  currentUser: User | null;
}

const Syllabus: React.FC<SyllabusProps> = ({ currentUser }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [syllabus, setSyllabus] = useState<Syllabus>({ papers: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<{ type: 'paper' | 'subject' | 'subtopic' | 'lecture', id: string } | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editTopic, setEditTopic] = useState('');
  const [editHours, setEditHours] = useState(0);
  const [editMinutes, setEditMinutes] = useState(0);
  const [editStatus, setEditStatus] = useState<'not_started' | 'in_progress' | 'completed'>('not_started');
  const [editNotes, setEditNotes] = useState('');
  const [addType, setAddType] = useState<'paper' | 'subject' | 'lecture'>('paper');
  const [parentId, setParentId] = useState<string>('');
  const [bulkLectures, setBulkLectures] = useState('');
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [selectedSubjectForBulk, setSelectedSubjectForBulk] = useState<{ paperId: string, subjectId: string } | null>(null);
  const [bulkLectureCount, setBulkLectureCount] = useState(1);
  const [bulkLectureHours, setBulkLectureHours] = useState(0);
  const [bulkLectureMinutes, setBulkLectureMinutes] = useState(0);
  const [bulkLecturePrefix, setBulkLecturePrefix] = useState('Lecture');
  const [selectedSubtopicForBulk, setSelectedSubtopicForBulk] = useState<string | null>(null);
  const [subtopicDialogOpen, setSubtopicDialogOpen] = useState(false);
  const [newLectureDialogOpen, setNewLectureDialogOpen] = useState(false);
  const [newLectureTitle, setNewLectureTitle] = useState('');
  const [newLectureTopic, setNewLectureTopic] = useState('');
  const [newLectureHours, setNewLectureHours] = useState(0);
  const [newLectureMinutes, setNewLectureMinutes] = useState(0);
  const [newLectureStatus, setNewLectureStatus] = useState<'not_started' | 'in_progress' | 'completed'>('not_started');
  const [newLectureNotes, setNewLectureNotes] = useState('');
  const [selectedSubtopicForLecture, setSelectedSubtopicForLecture] = useState<{ paperId: string, subjectId: string, subtopicId: string } | null>(null);
  const [newSubtopicDialogOpen, setNewSubtopicDialogOpen] = useState(false);
  const [newSubtopicTitle, setNewSubtopicTitle] = useState('');
  const [selectedSubjectForSubtopic, setSelectedSubjectForSubtopic] = useState<{ paperId: string, subjectId: string } | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ type: 'paper' | 'subject' | 'subtopic' | 'lecture', id: string } | null>(null);

  // Migrate data from localStorage to Firestore
  const migrateFromLocalStorage = async () => {
    try {
      const storedData = localStorage.getItem(STORAGE_KEY);
      if (storedData) {
        const parsedData = JSON.parse(storedData);
        // Convert dates back to Date objects
        const migratedData = {
          papers: parsedData.papers.map((paper: Paper) => ({
            ...paper,
            subjects: paper.subjects.map((subject: Subject) => ({
              ...subject,
              subtopics: subject.subtopics.map((subtopic: Subtopic) => ({
                ...subtopic,
                lectures: subtopic.lectures.map((lecture: Lecture) => ({
                  ...lecture,
                  lastStudied: lecture.lastStudied ? new Date(lecture.lastStudied) : undefined
                }))
              }))
            }))
          }))
        };
        
        // Save to Firestore
        const syllabusRef = doc(db, 'users', currentUser?.id || '', 'syllabus', 'current');
        await setDoc(syllabusRef, {
          papers: migratedData.papers.map((paper: Paper) => ({
            ...paper,
            subjects: paper.subjects.map((subject: Subject) => ({
              ...subject,
              subtopics: subject.subtopics.map((subtopic: Subtopic) => ({
                ...subtopic,
                lectures: subtopic.lectures.map((lecture: Lecture) => ({
                  ...lecture,
                  lastStudied: lecture.lastStudied ? lecture.lastStudied.toISOString() : null
                }))
              }))
            }))
          }))
        });

        // Clear localStorage after successful migration
        localStorage.removeItem(STORAGE_KEY);
        console.log('Successfully migrated syllabus data from localStorage to Firestore');
      }
    } catch (err) {
      console.error('Error migrating data:', err);
      setError('Failed to migrate data from localStorage to Firestore');
    }
  };

  // Load syllabus from Firestore
  useEffect(() => {
    const loadSyllabus = async () => {
      if (!currentUser) {
        console.log('No current user found, skipping syllabus load');
        return;
      }
      
      try {
        setLoading(true);
        setError(null);
        console.log('Starting syllabus load for user:', currentUser.id);

        // First, try to migrate any existing data from localStorage
        await migrateFromLocalStorage();

        // Get the current user's syllabus document
        const syllabusRef = doc(db, 'users', currentUser.id, 'syllabus', 'current');
        console.log('Fetching syllabus from:', syllabusRef.path);
        
        const syllabusDoc = await getDoc(syllabusRef);
        console.log('Syllabus document exists:', syllabusDoc.exists());

        if (syllabusDoc.exists()) {
          const data = syllabusDoc.data();
          console.log('Loaded syllabus data:', data);
          
          setSyllabus({
            papers: data.papers.map((paper: Paper) => ({
              ...paper,
              subjects: paper.subjects.map((subject: Subject) => ({
                ...subject,
                subtopics: subject.subtopics.map((subtopic: Subtopic) => ({
                  ...subtopic,
                  lectures: subtopic.lectures.map((lecture: Lecture) => ({
                    ...lecture,
                    lastStudied: lecture.lastStudied ? new Date(lecture.lastStudied) : undefined
                  }))
                }))
              }))
            }))
          });
        } else {
          console.log('No existing syllabus found, creating new document');
          // Create initial syllabus document if it doesn't exist
          await setDoc(syllabusRef, { papers: [] });
          setSyllabus({ papers: [] });
        }
      } catch (err: any) {
        console.error('Error loading syllabus:', {
          error: err,
          code: err.code,
          message: err.message,
          stack: err.stack
        });
        setError(err.message || 'Failed to load syllabus');
      } finally {
        setLoading(false);
      }
    };

    loadSyllabus();
  }, [currentUser]);

  // Save syllabus to Firestore
  const saveSyllabus = async (updatedSyllabus: Syllabus) => {
    if (!currentUser) {
      console.error('No current user found');
      setError('You must be logged in to save syllabus data');
      return;
    }

    try {
      console.log('Starting syllabus save for user:', currentUser.id);
      const syllabusRef = doc(db, 'users', currentUser.id, 'syllabus', 'current');
      
      // Convert dates to ISO strings for Firestore
      const syllabusData = {
        papers: updatedSyllabus.papers.map(paper => ({
          ...paper,
          subjects: paper.subjects.map(subject => ({
            ...subject,
            subtopics: subject.subtopics.map(subtopic => ({
              ...subtopic,
              lectures: subtopic.lectures.map(lecture => ({
                ...lecture,
                lastStudied: lecture.lastStudied ? lecture.lastStudied.toISOString() : null
              }))
            }))
          }))
        }))
      };

      console.log('Saving syllabus data:', syllabusData);
      await setDoc(syllabusRef, syllabusData);
      console.log('Syllabus saved successfully');
      
      setSyllabus(updatedSyllabus);
    } catch (err: any) {
      console.error('Error saving syllabus:', {
        error: err,
        code: err.code,
        message: err.message,
        stack: err.stack
      });
      setError(err.message || 'Failed to save syllabus');
      throw err;
    }
  };

  const calculateLectureProgress = (lectures: Lecture[]) => {
    if (lectures.length === 0) return 0;
    const totalHours = lectures.reduce((acc, lecture) => acc + lecture.hours, 0);
    if (totalHours === 0) return 0;
    const completedHours = lectures.reduce((acc, lecture) => {
      const progress = lecture.status === 'completed' ? lecture.hours : 
                      lecture.status === 'in_progress' ? lecture.hours * 0.5 : 0;
      return acc + progress;
    }, 0);
    return (completedHours / totalHours) * 100;
  };

  const calculateSubjectProgress = (subjects: Subject[]) => {
    if (subjects.length === 0) return 0;
    let totalHours = 0;
    let completedHours = 0;

    subjects.forEach(subject => {
      subject.subtopics.forEach(subtopic => {
        const subtopicHours = subtopic.lectures.reduce((acc, lecture) => acc + lecture.hours, 0);
        totalHours += subtopicHours;
        completedHours += (subtopic.progress / 100) * subtopicHours;
      });
    });

    return totalHours === 0 ? 0 : (completedHours / totalHours) * 100;
  };

  const calculateOverallProgress = (papers: Paper[]) => {
    if (papers.length === 0) return 0;
    let totalHours = 0;
    let completedHours = 0;

    papers.forEach(paper => {
      paper.subjects.forEach(subject => {
        subject.subtopics.forEach(subtopic => {
          const subtopicHours = subtopic.lectures.reduce((acc, lecture) => acc + lecture.hours, 0);
          totalHours += subtopicHours;
          completedHours += (subtopic.progress / 100) * subtopicHours;
        });
      });
    });

    return totalHours === 0 ? 0 : (completedHours / totalHours) * 100;
  };

  const calculateAnalytics = (papers: Paper[]) => {
    let totalHours = 0;
    let completedHours = 0;
    let inProgressHours = 0;
    let totalLectures = 0;
    let completedLectures = 0;
    let inProgressLectures = 0;
    let notStartedLectures = 0;
    let totalSubjects = 0;
    let totalSubtopics = 0;

    papers.forEach(paper => {
      totalSubjects += paper.subjects.length;
      paper.subjects.forEach(subject => {
        totalSubtopics += subject.subtopics.length;
        subject.subtopics.forEach(subtopic => {
          subtopic.lectures.forEach(lecture => {
            totalHours += lecture.hours;
            totalLectures++;
            
            if (lecture.status === 'completed') {
              completedHours += lecture.hours;
              completedLectures++;
            } else if (lecture.status === 'in_progress') {
              inProgressHours += lecture.hours * 0.5;
              inProgressLectures++;
            } else {
              notStartedLectures++;
            }
          });
        });
      });
    });

    return {
      totalHours,
      completedHours,
      inProgressHours,
      totalLectures,
      completedLectures,
      inProgressLectures,
      notStartedLectures,
      totalSubjects,
      totalSubtopics,
      totalPapers: papers.length
    };
  };

  const handleAdd = async () => {
    if (!editTitle) return;

    try {
      const newSyllabus = { ...syllabus, papers: [...(syllabus.papers || [])] };

      if (addType === 'paper') {
        newSyllabus.papers.push({
          id: Date.now().toString(),
          title: editTitle,
          subjects: [],
          status: 'not_started',
          progress: 0
        });
      } else if (addType === 'subject' && selectedItem) {
        const [paperId] = selectedItem.id.split('.');
        const paper = newSyllabus.papers.find(p => p.id === paperId);
        
        if (paper) {
          paper.subjects.push({
            id: Date.now().toString(),
            title: editTitle,
            subtopics: [],
            status: 'not_started',
            progress: 0
          });
        }
      } else if (selectedItem) {
        const [paperId, subjectId, subtopicId] = selectedItem.id.split('.');
        const paper = newSyllabus.papers.find(p => p.id === paperId);
        
        if (paper) {
          if (selectedItem.type === 'subject') {
            const subject = paper.subjects.find(s => s.id === subjectId);
            if (subject) {
              subject.subtopics.push({
                id: Date.now().toString(),
                title: editTitle,
                lectures: [],
                status: 'not_started',
                progress: 0
              });
            }
          } else if (selectedItem.type === 'subtopic') {
            const subject = paper.subjects.find(s => s.id === subjectId);
            if (subject) {
              const subtopic = subject.subtopics.find(st => st.id === subtopicId);
              if (subtopic) {
                subtopic.lectures.push({
                  id: Date.now().toString(),
                  title: editTitle,
                  topic: editTopic,
                  hours: parseFloat(editHours.toString()) || 0,
                  status: editStatus,
                  notes: editNotes,
                  progress: editStatus === 'completed' ? 100 : editStatus === 'in_progress' ? 50 : 0
                });
              }
            }
          }
        }
      }

      await saveSyllabus(newSyllabus);
      
      setEditTitle('');
      setEditTopic('');
      setEditHours(0);
      setEditMinutes(0);
      setEditStatus('not_started');
      setEditNotes('');
      setEditDialogOpen(false);
      setAddDialogOpen(false);
    } catch (err: any) {
      alert(`Error adding item: ${err.message}`);
    }
  };

  const handleEdit = async () => {
    if (!selectedItem || !editTitle) return;

    try {
      const [paperId, subjectId, subtopicId, lectureId] = selectedItem.id.split('.');
      const newSyllabus = { ...syllabus };
      const paper = newSyllabus.papers.find(p => p.id === paperId);

      if (paper) {
        if (selectedItem.type === 'paper') {
          paper.title = editTitle;
        } else if (selectedItem.type === 'subject') {
          const subject = paper.subjects.find(s => s.id === subjectId);
          if (subject) {
            subject.title = editTitle;
          }
        } else if (selectedItem.type === 'subtopic') {
          const subject = paper.subjects.find(s => s.id === subjectId);
          if (subject) {
            const subtopic = subject.subtopics.find(st => st.id === subtopicId);
            if (subtopic) {
              subtopic.title = editTitle;
            }
          }
        } else if (selectedItem.type === 'lecture') {
          const subject = paper.subjects.find(s => s.id === subjectId);
          if (subject) {
            const subtopic = subject.subtopics.find(st => st.id === subtopicId);
            if (subtopic) {
              const lecture = subtopic.lectures.find(l => l.id === lectureId);
              if (lecture) {
                const totalHours = editHours + (editMinutes / 60);
                lecture.title = editTitle;
                lecture.topic = editTopic;
                lecture.hours = totalHours;
                lecture.status = editStatus;
                lecture.notes = editNotes;
              }
            }
          }
        }
      }

      await saveSyllabus(newSyllabus);
      
      setEditTitle('');
      setEditTopic('');
      setEditHours(0);
      setEditMinutes(0);
      setEditStatus('not_started');
      setEditNotes('');
      setEditDialogOpen(false);
    } catch (err: any) {
      alert(`Error editing item: ${err.message}`);
    }
  };

  const handleDelete = async (type: 'paper' | 'subject' | 'subtopic' | 'lecture', id: string) => {
    try {
      const [paperId, subjectId, subtopicId, lectureId] = id.split('.');
      const newSyllabus = { ...syllabus };

      if (type === 'paper') {
        newSyllabus.papers = newSyllabus.papers.filter(p => p.id !== paperId);
      } else {
        const paper = newSyllabus.papers.find(p => p.id === paperId);
        if (paper) {
          if (type === 'subject') {
            paper.subjects = paper.subjects.filter(s => s.id !== subjectId);
          } else if (type === 'subtopic') {
            const subject = paper.subjects.find(s => s.id === subjectId);
            if (subject) {
              subject.subtopics = subject.subtopics.filter(st => st.id !== subtopicId);
            }
          } else if (type === 'lecture') {
            const subject = paper.subjects.find(s => s.id === subjectId);
            if (subject) {
              const subtopic = subject.subtopics.find(st => st.id === subtopicId);
              if (subtopic) {
                subtopic.lectures = subtopic.lectures.filter(l => l.id !== lectureId);
              }
            }
          }
        }
      }

      await saveSyllabus(newSyllabus);
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    } catch (err: any) {
      alert(`Error deleting item: ${err.message}`);
    }
  };

  const confirmDelete = (type: 'paper' | 'subject' | 'subtopic' | 'lecture', id: string) => {
    setItemToDelete({ type, id });
    setDeleteDialogOpen(true);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#2E7D32' }} />;
      case 'in_progress':
        return <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#FFA726' }} />;
      default:
        return <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#757575' }} />;
    }
  };

  const handleBulkAddLectures = () => {
    if (!selectedSubtopicForBulk || !selectedSubjectForBulk || bulkLectureCount < 1) return;

    const newSyllabus = { ...syllabus };
    const paper = newSyllabus.papers.find(p => p.id === selectedSubjectForBulk.paperId);
    
    if (paper) {
      const subject = paper.subjects.find(s => s.id === selectedSubjectForBulk.subjectId);
      if (subject) {
        const subtopic = subject.subtopics.find(st => st.id === selectedSubtopicForBulk);
        if (subtopic) {
          const totalHours = bulkLectureHours + (bulkLectureMinutes / 60);
          
          // Add lectures to the selected subtopic with full lecture properties
          for (let i = 1; i <= bulkLectureCount; i++) {
            subtopic.lectures.push({
              id: Date.now().toString() + i,
              title: `${bulkLecturePrefix} ${i}`,
              topic: '',
              hours: totalHours,
              status: 'not_started',
              notes: '',
              progress: 0
            });
          }

          // Update subtopic progress
          subtopic.progress = calculateLectureProgress(subtopic.lectures);
          // Update subject progress
          subject.progress = calculateSubjectProgress([subject]);
        }
      }
    }

    setSyllabus(newSyllabus);
    setBulkDialogOpen(false);
    setBulkLectureCount(1);
    setBulkLectureHours(0);
    setBulkLectureMinutes(0);
    setBulkLecturePrefix('Lecture');
    setSelectedSubtopicForBulk(null);
    setSelectedSubjectForBulk(null);
  };

  const handleQuickComplete = async (paperId: string, subjectId: string, subtopicId: string, lectureId: string) => {
    try {
      const newSyllabus = { ...syllabus };
      const paper = newSyllabus.papers.find(p => p.id === paperId);
      
      if (paper) {
        const subject = paper.subjects.find(s => s.id === subjectId);
        if (subject) {
          const subtopic = subject.subtopics.find(st => st.id === subtopicId);
          if (subtopic) {
            const lecture = subtopic.lectures.find(l => l.id === lectureId);
            if (lecture) {
              lecture.status = lecture.status === 'completed' ? 'not_started' : 'completed';
              lecture.progress = lecture.status === 'completed' ? 100 : 0;
              lecture.lastStudied = lecture.status === 'completed' ? new Date() : undefined;

              // Update subtopic progress
              subtopic.progress = calculateLectureProgress(subtopic.lectures);
              // Update subject progress based on subtopics
              subject.progress = subject.subtopics.length > 0 
                ? subject.subtopics.reduce((acc, st) => acc + st.progress, 0) / subject.subtopics.length 
                : 0;
              // Update paper progress
              paper.progress = calculateSubjectProgress(paper.subjects);
            }
          }
        }
      }

      await saveSyllabus(newSyllabus);
    } catch (err: any) {
      alert(`Error updating lecture status: ${err.message}`);
    }
  };

  const handleAddLecture = () => {
    if (!selectedSubtopicForLecture || !newLectureTitle) return;

    const newSyllabus = { ...syllabus };
    const paper = newSyllabus.papers.find(p => p.id === selectedSubtopicForLecture.paperId);
    
    if (paper) {
      const subject = paper.subjects.find(s => s.id === selectedSubtopicForLecture.subjectId);
      if (subject) {
        const subtopic = subject.subtopics.find(st => st.id === selectedSubtopicForLecture.subtopicId);
        if (subtopic) {
          const totalHours = newLectureHours + (newLectureMinutes / 60);
          subtopic.lectures.push({
            id: Date.now().toString(),
            title: newLectureTitle,
            topic: newLectureTopic,
            hours: totalHours,
            status: newLectureStatus,
            notes: newLectureNotes,
            progress: newLectureStatus === 'completed' ? 100 : newLectureStatus === 'in_progress' ? 50 : 0
          });
          setSyllabus(newSyllabus);
        }
      }
    }

    setNewLectureDialogOpen(false);
    setNewLectureTitle('');
    setNewLectureTopic('');
    setNewLectureHours(0);
    setNewLectureMinutes(0);
    setNewLectureStatus('not_started');
    setNewLectureNotes('');
    setSelectedSubtopicForLecture(null);
  };

  const handleAddSubtopic = () => {
    if (!selectedSubjectForSubtopic || !newSubtopicTitle) return;

    const newSyllabus = { ...syllabus };
    const paper = newSyllabus.papers.find(p => p.id === selectedSubjectForSubtopic.paperId);
    
    if (paper) {
      const subject = paper.subjects.find(s => s.id === selectedSubjectForSubtopic.subjectId);
      if (subject) {
        subject.subtopics.push({
          id: Date.now().toString(),
          title: newSubtopicTitle,
          lectures: [],
          status: 'not_started',
          progress: 0
        });
        setSyllabus(newSyllabus);
      }
    }

    setNewSubtopicDialogOpen(false);
    setNewSubtopicTitle('');
    setSelectedSubjectForSubtopic(null);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="error">{error}</Typography>
        <Button onClick={() => window.location.reload()} sx={{ mt: 2 }}>
          Retry
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 1, sm: 3 }, background: '#fff', minHeight: '100vh' }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" sx={{ color: '#000', fontWeight: 600 }}>
            Syllabus Tracker
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tabs 
              value={activeTab} 
              onChange={(_, newValue) => setActiveTab(newValue)}
              sx={{ 
                '& .MuiTab-root': { 
                  color: '#666',
                  '&.Mui-selected': { color: '#000' }
                }
              }}
            >
              <Tab icon={<ListIcon />} label="Syllabus" />
              <Tab icon={<BarChartIcon />} label="Analytics" />
            </Tabs>
            {activeTab === 0 && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => {
                  setSelectedItem(null);
                  setEditTitle('');
                  setAddType('paper');
                  setAddDialogOpen(true);
                }}
                size="small"
                sx={{
                  bgcolor: '#000',
                  color: '#fff',
                  '&:hover': { bgcolor: '#333' }
                }}
              >
                Add Paper
              </Button>
            )}
          </Box>
        </Box>
      </Box>

      {activeTab === 0 ? (
        !syllabus?.papers || syllabus.papers.length === 0 ? (
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center', 
            minHeight: '150px',
            border: '2px dashed #000',
            borderRadius: 2,
            p: 3
          }}>
            <Typography variant="subtitle1" sx={{ color: '#666', mb: 1 }}>
              No papers added yet
            </Typography>
            <Typography variant="body2" sx={{ color: '#666', textAlign: 'center' }}>
              Click the "Add Paper" button above to start tracking your syllabus
            </Typography>
          </Box>
        ) : (
          <Box>
            {syllabus.papers.map((paper) => (
              <Accordion key={paper.id} sx={{ 
                mb: 2, 
                border: '2px solid #000', 
                borderRadius: 3,
                '&:before': { display: 'none' },
                '& .MuiAccordionSummary-root': {
                  borderBottom: '2px solid #000',
                  borderRadius: '8px 8px 0 0',
                  minHeight: '64px !important',
                  margin: 0,
                  padding: '0 16px'
                },
                '& .MuiAccordionDetails-root': {
                  borderTop: '2px solid #000',
                  padding: '16px'
                },
                '& .MuiCollapse-root': {
                  marginTop: 0
                }
              }}>
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  sx={{
                    backgroundColor: '#f5f5f5',
                    '&:hover': { backgroundColor: '#eeeeee' }
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, flex: 1 }}>
                      <Typography variant="h6" sx={{ color: '#000', fontWeight: 600 }}>
                        {paper.title}
                      </Typography>
                      <LinearProgress 
                        variant="determinate" 
                        value={paper.progress} 
                        sx={{ 
                          height: 4, 
                          borderRadius: 2,
                          backgroundColor: '#e0e0e0',
                          '& .MuiLinearProgress-bar': {
                            backgroundColor: '#2E7D32'
                          }
                        }} 
                      />
                      <Typography variant="caption" sx={{ color: '#666', fontSize: '0.7rem' }}>
                        {Math.round(paper.progress)}%
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1, ml: 'auto' }}>
                      <IconButton
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedItem({ type: 'paper', id: paper.id });
                          setEditTitle(paper.title);
                          setEditDialogOpen(true);
                        }}
                        sx={{ color: '#000' }}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        onClick={(e) => {
                          e.stopPropagation();
                          confirmDelete('paper', paper.id);
                        }}
                        sx={{ color: '#000' }}
                      >
                        <DeleteIcon />
                      </IconButton>
                      <Button
                        variant="contained"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedItem({ type: 'subject', id: paper.id });
                          setEditTitle('');
                          setAddType('subject');
                          setAddDialogOpen(true);
                        }}
                        sx={{
                          bgcolor: '#000',
                          color: '#fff',
                          '&:hover': { bgcolor: '#333' }
                        }}
                      >
                        Add Subject
                      </Button>
                    </Box>
                  </Box>
                </AccordionSummary>
                <AccordionDetails sx={{ p: 2 }}>
                  {paper.subjects.map((subject) => (
                    <Accordion key={subject.id} sx={{ 
                      mb: 1,
                      border: '1px solid #e0e0e0',
                      borderRadius: 2,
                      '&:before': { display: 'none' },
                      '& .MuiAccordionSummary-root': {
                        borderBottom: '1px solid #e0e0e0',
                        borderRadius: '4px 4px 0 0',
                        minHeight: '48px !important',
                        margin: 0,
                        padding: '0 16px'
                      },
                      '& .MuiAccordionDetails-root': {
                        borderTop: '1px solid #e0e0e0',
                        padding: '8px'
                      },
                      '& .MuiCollapse-root': {
                        marginTop: 0
                      }
                    }}>
                      <AccordionSummary
                        expandIcon={<ExpandMoreIcon />}
                        sx={{
                          backgroundColor: '#f8f9fa',
                          '&:hover': { backgroundColor: '#f0f0f0' }
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, flex: 1 }}>
                            <Typography sx={{ color: '#000', fontWeight: 500 }}>
                              {subject.title}
                            </Typography>
                            <LinearProgress 
                              variant="determinate" 
                              value={subject.progress} 
                              sx={{ 
                                height: 4, 
                                borderRadius: 2,
                                backgroundColor: '#e0e0e0',
                                '& .MuiLinearProgress-bar': {
                                  backgroundColor: '#2E7D32'
                                }
                              }} 
                            />
                            <Typography variant="caption" sx={{ color: '#666', fontSize: '0.7rem' }}>
                              {Math.round(subject.progress)}%
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', gap: 1, ml: 'auto' }}>
                            <IconButton
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedItem({ type: 'subject', id: `${paper.id}.${subject.id}` });
                                setEditTitle(subject.title);
                                setEditDialogOpen(true);
                              }}
                              size="small"
                              sx={{ color: '#000' }}
                            >
                              <EditIcon />
                            </IconButton>
                            <IconButton
                              onClick={(e) => {
                                e.stopPropagation();
                                confirmDelete('subject', `${paper.id}.${subject.id}`);
                              }}
                              size="small"
                              sx={{ color: '#000' }}
                            >
                              <DeleteIcon />
                            </IconButton>
                            <Button
                              variant="contained"
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedSubjectForSubtopic({
                                  paperId: paper.id,
                                  subjectId: subject.id
                                });
                                setNewSubtopicDialogOpen(true);
                              }}
                              sx={{
                                bgcolor: '#000',
                                color: '#fff',
                                '&:hover': { bgcolor: '#333' }
                              }}
                            >
                              Add Subtopic
                            </Button>
                          </Box>
                        </Box>
                      </AccordionSummary>
                      <AccordionDetails sx={{ p: 0.5 }}>
                        <List dense sx={{ 
                          py: 0,
                          display: 'flex',
                          flexDirection: 'row',
                          flexWrap: 'wrap',
                          gap: 1
                        }}>
                          {subject.subtopics.map((subtopic) => (
                            <Accordion key={subtopic.id} sx={{ 
                              mb: 1, 
                              width: '100%',
                              border: '1px solid #e0e0e0',
                              borderRadius: 2,
                              '&:before': { display: 'none' },
                              '& .MuiAccordionSummary-root': {
                                borderBottom: '1px solid #e0e0e0',
                                borderRadius: '4px 4px 0 0',
                                minHeight: '48px !important',
                                margin: 0,
                                padding: '0 16px'
                              },
                              '& .MuiAccordionDetails-root': {
                                borderTop: '1px solid #e0e0e0',
                                padding: '8px'
                              },
                              '& .MuiCollapse-root': {
                                marginTop: 0
                              }
                            }}>
                              <AccordionSummary
                                expandIcon={<ExpandMoreIcon />}
                                sx={{
                                  backgroundColor: '#f8f9fa',
                                  '&:hover': { backgroundColor: '#f0f0f0' }
                                }}
                              >
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, flex: 1 }}>
                                    <Typography sx={{ color: '#000', fontWeight: 500 }}>
                                      {subtopic.title}
                                    </Typography>
                                    <LinearProgress 
                                      variant="determinate" 
                                      value={subtopic.progress} 
                                      sx={{ 
                                        height: 4, 
                                        borderRadius: 2,
                                        backgroundColor: '#e0e0e0',
                                        '& .MuiLinearProgress-bar': {
                                          backgroundColor: '#2E7D32'
                                        }
                                      }} 
                                    />
                                    <Typography variant="caption" sx={{ color: '#666', fontSize: '0.7rem' }}>
                                      {Math.round(subtopic.progress)}%
                                    </Typography>
                                  </Box>
                                  <Box sx={{ display: 'flex', gap: 1, ml: 'auto' }}>
                                    <IconButton
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedItem({ type: 'subtopic', id: `${paper.id}.${subject.id}.${subtopic.id}` });
                                        setEditTitle(subtopic.title);
                                        setEditDialogOpen(true);
                                      }}
                                      size="small"
                                      sx={{ color: '#000' }}
                                    >
                                      <EditIcon />
                                    </IconButton>
                                    <IconButton
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        confirmDelete('subtopic', `${paper.id}.${subject.id}.${subtopic.id}`);
                                      }}
                                      size="small"
                                      sx={{ color: '#000' }}
                                    >
                                      <DeleteIcon />
                                    </IconButton>
                                    <Button
                                      variant="contained"
                                      size="small"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedSubtopicForLecture({
                                          paperId: paper.id,
                                          subjectId: subject.id,
                                          subtopicId: subtopic.id
                                        });
                                        setNewLectureDialogOpen(true);
                                      }}
                                      sx={{
                                        bgcolor: '#000',
                                        color: '#fff',
                                        '&:hover': { bgcolor: '#333' }
                                      }}
                                    >
                                      Add Lecture
                                    </Button>
                                    <Button
                                      variant="contained"
                                      size="small"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedSubtopicForBulk(subtopic.id);
                                        setSelectedSubjectForBulk({
                                          paperId: paper.id,
                                          subjectId: subject.id
                                        });
                                        setBulkDialogOpen(true);
                                      }}
                                      sx={{
                                        bgcolor: '#000',
                                        color: '#fff',
                                        '&:hover': { bgcolor: '#333' }
                                      }}
                                    >
                                      Bulk Add
                                    </Button>
                                  </Box>
                                </Box>
                              </AccordionSummary>
                              <AccordionDetails sx={{ p: 0.5 }}>
                                <List dense sx={{ 
                                  py: 0,
                                  display: 'flex',
                                  flexDirection: 'row',
                                  flexWrap: 'wrap',
                                  gap: 1
                                }}>
                                  {subtopic.lectures.map((lecture) => (
                                    <ListItem
                                      key={lecture.id}
                                      sx={{
                                        border: '1px solid #e0e0e0',
                                        borderRadius: 2,
                                        backgroundColor: '#f5f5f5',
                                        p: 1,
                                        width: 'auto',
                                        minWidth: 120,
                                        maxWidth: 150,
                                        aspectRatio: '1',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'space-between',
                                        minHeight: 100,
                                        flex: '0 0 auto',
                                        '&:hover': {
                                          borderColor: '#000',
                                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                        }
                                      }}
                                    >
                                      <Box sx={{ width: '100%' }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                                          <IconButton
                                            size="small"
                                            onClick={() => handleQuickComplete(paper.id, subject.id, subtopic.id, lecture.id)}
                                            sx={{
                                              color: lecture.status === 'completed' ? '#2E7D32' : '#757575',
                                              '&:hover': { color: lecture.status === 'completed' ? '#1B5E20' : '#424242' },
                                              p: 0.25,
                                              minWidth: 20,
                                              width: 20,
                                              height: 20
                                            }}
                                          >
                                            {lecture.status === 'completed' ? '✓' : '○'}
                                          </IconButton>
                                          <Typography 
                                            variant="caption" 
                                            sx={{ 
                                              color: '#000', 
                                              fontWeight: 500, 
                                              fontSize: '0.75rem',
                                              lineHeight: 1.2,
                                              overflow: 'hidden',
                                              textOverflow: 'ellipsis',
                                              display: '-webkit-box',
                                              WebkitLineClamp: 2,
                                              WebkitBoxOrient: 'vertical'
                                            }}
                                          >
                                            {lecture.title}
                                          </Typography>
                                        </Box>
                                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                                          {lecture.topic && (
                                            <Typography variant="caption" sx={{ color: '#666', fontSize: '0.7rem', lineHeight: 1.2 }}>
                                              {lecture.topic}
                                            </Typography>
                                          )}
                                          <Typography variant="caption" sx={{ color: '#666', fontSize: '0.7rem', lineHeight: 1.2 }}>
                                            {lecture.hours}h
                                          </Typography>
                                          {lecture.notes && (
                                            <Typography 
                                              variant="caption" 
                                              sx={{ 
                                                color: '#666', 
                                                fontSize: '0.7rem',
                                                lineHeight: 1.2,
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                display: '-webkit-box',
                                                WebkitLineClamp: 2,
                                                WebkitBoxOrient: 'vertical'
                                              }}
                                            >
                                              {lecture.notes}
                                            </Typography>
                                          )}
                                          {lecture.lastStudied && (
                                            <Typography variant="caption" sx={{ color: '#666', fontSize: '0.7rem', lineHeight: 1.2 }}>
                                              {new Date(lecture.lastStudied).toLocaleDateString()}
                                            </Typography>
                                          )}
                                          <LinearProgress 
                                            variant="determinate" 
                                            value={lecture.progress} 
                                            sx={{ 
                                              height: 4, 
                                              borderRadius: 2,
                                              backgroundColor: '#e0e0e0',
                                              '& .MuiLinearProgress-bar': {
                                                backgroundColor: '#2E7D32'
                                              }
                                            }} 
                                          />
                                          <Typography variant="caption" sx={{ color: '#666', fontSize: '0.7rem' }}>
                                            {Math.round(lecture.progress)}%
                                          </Typography>
                                        </Box>
                                      </Box>
                                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                                        <IconButton
                                          size="small"
                                          onClick={() => {
                                            setSelectedItem({ type: 'lecture', id: `${paper.id}.${subject.id}.${subtopic.id}.${lecture.id}` });
                                            setEditTitle(lecture.title);
                                            setEditTopic(lecture.topic || '');
                                            setEditHours(Math.floor(lecture.hours));
                                            setEditMinutes(Math.round((lecture.hours % 1) * 60));
                                            setEditStatus(lecture.status);
                                            setEditNotes(lecture.notes || '');
                                            setEditDialogOpen(true);
                                          }}
                                          sx={{ 
                                            color: '#000',
                                            p: 0.25,
                                            minWidth: 20,
                                            width: 20,
                                            height: 20
                                          }}
                                        >
                                          <EditIcon sx={{ fontSize: '0.875rem' }} />
                                        </IconButton>
                                        <IconButton
                                          size="small"
                                          onClick={() => confirmDelete('lecture', `${paper.id}.${subject.id}.${subtopic.id}.${lecture.id}`)}
                                          sx={{ 
                                            color: '#000',
                                            p: 0.25,
                                            minWidth: 20,
                                            width: 20,
                                            height: 20
                                          }}
                                        >
                                          <DeleteIcon sx={{ fontSize: '0.875rem' }} />
                                        </IconButton>
                                      </Box>
                                    </ListItem>
                                  ))}
                                </List>
                              </AccordionDetails>
                            </Accordion>
                          ))}
                        </List>
                      </AccordionDetails>
                    </Accordion>
                  ))}
                </AccordionDetails>
              </Accordion>
            ))}
          </Box>
        )
      ) : (
        <Analytics papers={syllabus.papers} />
      )}

      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)}>
        <DialogTitle>
          {selectedItem ? (
            selectedItem.type === 'paper' ? 'Edit Paper' :
            selectedItem.type === 'subject' ? (addType === 'subject' ? 'Add New Subject' : 'Edit Subject') :
            selectedItem.type === 'subtopic' ? 'Edit Subtopic' :
            'Edit Lecture'
          ) : 'Add New Paper'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Title"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              sx={{ mb: 3 }}
            />
            {(selectedItem?.type === 'lecture' || !selectedItem) && (
              <>
                <TextField
                  fullWidth
                  label="Topic (optional)"
                  value={editTopic}
                  onChange={(e) => setEditTopic(e.target.value)}
                  sx={{ mb: 3 }}
                />
                <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                  <TextField
                    label="Hours"
                    type="number"
                    value={editHours}
                    onChange={(e) => setEditHours(Math.max(0, parseInt(e.target.value) || 0))}
                    sx={{ flex: 1 }}
                  />
                  <TextField
                    label="Minutes"
                    type="number"
                    value={editMinutes}
                    onChange={(e) => setEditMinutes(Math.min(59, Math.max(0, parseInt(e.target.value) || 0)))}
                    sx={{ flex: 1 }}
                  />
                </Box>
                <FormControl fullWidth sx={{ mb: 3 }}>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={editStatus}
                    label="Status"
                    onChange={(e) => setEditStatus(e.target.value as 'not_started' | 'in_progress' | 'completed')}
                  >
                    <MenuItem value="not_started">Not Started</MenuItem>
                    <MenuItem value="in_progress">In Progress</MenuItem>
                    <MenuItem value="completed">Completed</MenuItem>
                  </Select>
                </FormControl>
                <TextField
                  fullWidth
                  label="Notes (optional)"
                  multiline
                  rows={2}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                />
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button onClick={selectedItem ? handleEdit : handleAdd} variant="contained">
            {selectedItem ? 'Save Changes' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={bulkDialogOpen} onClose={() => setBulkDialogOpen(false)}>
        <DialogTitle>Bulk Add Lectures</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Number of Lectures"
              type="number"
              value={bulkLectureCount}
              onChange={(e) => setBulkLectureCount(Math.max(1, parseInt(e.target.value) || 1))}
              sx={{ mb: 3 }}
            />
            <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
              <TextField
                label="Hours"
                type="number"
                value={bulkLectureHours}
                onChange={(e) => setBulkLectureHours(Math.max(0, parseInt(e.target.value) || 0))}
                sx={{ flex: 1 }}
              />
              <TextField
                label="Minutes"
                type="number"
                value={bulkLectureMinutes}
                onChange={(e) => setBulkLectureMinutes(Math.min(59, Math.max(0, parseInt(e.target.value) || 0)))}
                sx={{ flex: 1 }}
              />
            </Box>
            <TextField
              fullWidth
              label="Title Prefix"
              value={bulkLecturePrefix}
              onChange={(e) => setBulkLecturePrefix(e.target.value)}
              sx={{ mb: 3 }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleBulkAddLectures} variant="contained">
            Add Lectures
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={subtopicDialogOpen} onClose={() => setSubtopicDialogOpen(false)}>
        <DialogTitle>Select Subtopic</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            {selectedSubjectForBulk && (
              <>
                <Typography variant="subtitle1" sx={{ mb: 2 }}>
                  Choose a subtopic to add lectures to:
                </Typography>
                <List>
                  {(() => {
                    const paper = syllabus.papers.find(p => p.id === selectedSubjectForBulk.paperId);
                    const subject = paper?.subjects.find(s => s.id === selectedSubjectForBulk.subjectId);
                    return subject?.subtopics.map((subtopic) => (
                      <ListItem
                        key={subtopic.id}
                        button
                        selected={selectedSubtopicForBulk === subtopic.id}
                        onClick={() => setSelectedSubtopicForBulk(subtopic.id)}
                      >
                        <ListItemText primary={subtopic.title} />
                      </ListItem>
                    ));
                  })()}
                </List>
                <Button
                  variant="contained"
                  onClick={() => {
                    const paper = syllabus.papers.find(p => p.id === selectedSubjectForBulk.paperId);
                    const subject = paper?.subjects.find(s => s.id === selectedSubjectForBulk.subjectId);
                    if (subject) {
                      subject.subtopics.push({
                        id: Date.now().toString(),
                        title: 'New Subtopic',
                        lectures: [],
                        status: 'not_started',
                        progress: 0
                      });
                      setSyllabus({ ...syllabus });
                    }
                  }}
                  sx={{ mt: 2 }}
                >
                  Create New Subtopic
                </Button>
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSubtopicDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={() => {
              setSubtopicDialogOpen(false);
              handleBulkAddLectures();
            }} 
            variant="contained"
            disabled={!selectedSubtopicForBulk}
          >
            Continue
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={newLectureDialogOpen} onClose={() => setNewLectureDialogOpen(false)}>
        <DialogTitle>Add New Lecture</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Title"
              value={newLectureTitle}
              onChange={(e) => setNewLectureTitle(e.target.value)}
              sx={{ mb: 3 }}
            />
            <TextField
              fullWidth
              label="Topic (optional)"
              value={newLectureTopic}
              onChange={(e) => setNewLectureTopic(e.target.value)}
              sx={{ mb: 3 }}
            />
            <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
              <TextField
                label="Hours"
                type="number"
                value={newLectureHours}
                onChange={(e) => setNewLectureHours(Math.max(0, parseInt(e.target.value) || 0))}
                sx={{ flex: 1 }}
              />
              <TextField
                label="Minutes"
                type="number"
                value={newLectureMinutes}
                onChange={(e) => setNewLectureMinutes(Math.min(59, Math.max(0, parseInt(e.target.value) || 0)))}
                sx={{ flex: 1 }}
              />
            </Box>
            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={newLectureStatus}
                label="Status"
                onChange={(e) => setNewLectureStatus(e.target.value as 'not_started' | 'in_progress' | 'completed')}
              >
                <MenuItem value="not_started">Not Started</MenuItem>
                <MenuItem value="in_progress">In Progress</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="Notes (optional)"
              multiline
              rows={2}
              value={newLectureNotes}
              onChange={(e) => setNewLectureNotes(e.target.value)}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewLectureDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleAddLecture} 
            variant="contained"
            disabled={!newLectureTitle}
          >
            Add
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={newSubtopicDialogOpen} onClose={() => setNewSubtopicDialogOpen(false)}>
        <DialogTitle>Add New Subtopic</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Subtopic Title"
              value={newSubtopicTitle}
              onChange={(e) => setNewSubtopicTitle(e.target.value)}
              sx={{ mb: 3 }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewSubtopicDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleAddSubtopic} 
            variant="contained"
            disabled={!newSubtopicTitle}
          >
            Add
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)}>
        <DialogTitle>
          {addType === 'paper' ? 'Add New Paper' : 'Add New Subject'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Title"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              sx={{ mb: 3 }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleAdd} variant="contained">
            Add
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setItemToDelete(null);
        }}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this {itemToDelete?.type}? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => {
              setDeleteDialogOpen(false);
              setItemToDelete(null);
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={() => itemToDelete && handleDelete(itemToDelete.type, itemToDelete.id)}
            color="error"
            variant="contained"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Syllabus; 