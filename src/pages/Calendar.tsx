import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  LinearProgress,
  Button,
} from '@mui/material';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';
import { format, startOfDay, endOfDay, isSameDay } from 'date-fns';
import { PickersDay, PickersDayProps } from '@mui/x-date-pickers/PickersDay';
import { User, StudySession } from '../types';

const subjectColors: { [key: string]: string } = {
  'General Studies': '#2E7D32',
  'Optional Subject': '#1976D2',
  'Current Affairs': '#ED6C02',
  'Essay': '#9C27B0',
  'Break': '#757575'
};

interface CalendarProps {
  currentUser: User | null;
}

const Calendar: React.FC<CalendarProps> = ({ currentUser }) => {
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [subjects, setSubjects] = useState<string[]>([]);

  useEffect(() => {
    const savedSessions = localStorage.getItem('study_sessions');
    if (savedSessions) {
      const parsedSessions = JSON.parse(savedSessions).map((session: any) => ({
        ...session,
        startTime: new Date(session.startTime)
      }));
      setSessions(parsedSessions);
      
      // Extract unique subjects
      const uniqueSubjects = Array.from(new Set(parsedSessions.map((s: StudySession) => s.subject)));
      setSubjects(uniqueSubjects as string[]);
    }
  }, []);

  const getStudyHoursForDate = (date: Date): number => {
    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);
    
    return sessions
      .filter(session => {
        const sessionDate = new Date(session.startTime);
        return (
          sessionDate >= dayStart &&
          sessionDate <= dayEnd &&
          !session.isBreak &&
          (selectedSubject === 'all' || session.subject === selectedSubject)
        );
      })
      .reduce((total, session) => total + session.duration, 0) / 60; // Convert minutes to hours
  };

  const getDayDetails = (date: Date) => {
    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);
    
    const daySessions = sessions.filter(session => {
      const sessionDate = new Date(session.startTime);
      return (
        sessionDate >= dayStart &&
        sessionDate <= dayEnd &&
        (selectedSubject === 'all' || session.subject === selectedSubject)
      );
    });

    const studySessions = daySessions.filter(s => !s.isBreak);
    const breakSessions = daySessions.filter(s => s.isBreak);

    const totalStudyHours = studySessions.reduce((total, session) => total + session.duration, 0) / 60;
    const totalBreakHours = breakSessions.reduce((total, session) => total + session.duration, 0) / 60;

    return {
      studySessions,
      breakSessions,
      totalStudyHours,
      totalBreakHours
    };
  };

  const renderDay = (day: Date, selectedDays: Date[], pickersDayProps: PickersDayProps<Date>) => {
    const studyHours = getStudyHoursForDate(day);
    const dayStart = startOfDay(day);
    const dayEnd = endOfDay(day);
    
    const daySessions = sessions.filter(session => {
      const sessionDate = new Date(session.startTime);
      return (
        sessionDate >= dayStart &&
        sessionDate <= dayEnd &&
        !session.isBreak &&
        (selectedSubject === 'all' || session.subject === selectedSubject)
      );
    });

    const uniqueSubjects = Array.from(new Set(daySessions.map(s => s.subject)));

    return (
      <Box 
        sx={{ 
          position: 'relative',
          width: '100%',
          height: '100%',
          minHeight: 80,
          border: '1px solid #e0e0e0',
          borderRadius: 1,
          backgroundColor: studyHours > 0 ? '#f8f9fa' : 'transparent',
          transition: 'all 0.2s ease',
          '&:hover': {
            backgroundColor: studyHours > 0 ? '#f0f0f0' : '#f8f9fa',
            transform: 'translateY(-2px)',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }
        }}
      >
        <Box sx={{ 
          position: 'absolute',
          top: 4,
          left: 4,
          right: 4,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 0.5
        }}>
          <Typography 
            variant="caption" 
            sx={{ 
              fontSize: '0.75rem',
              color: '#666',
              fontWeight: 500
            }}
          >
            {format(day, 'd')}
          </Typography>
          {studyHours > 0 && (
            <>
              <Typography 
                variant="body2" 
                sx={{ 
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: '#000',
                  textAlign: 'center'
                }}
              >
                {studyHours.toFixed(1)}h
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                {uniqueSubjects.map((subject, index) => (
                  <Box
                    key={index}
                    sx={{
                      width: 4,
                      height: 4,
                      borderRadius: '50%',
                      backgroundColor: subjectColors[subject] || '#000',
                    }}
                  />
                ))}
              </Box>
            </>
          )}
        </Box>
        <PickersDay 
          {...pickersDayProps} 
          day={day}
          sx={{
            width: '100%',
            height: '100%',
            margin: 0,
            padding: 0,
            '&.Mui-selected': {
              backgroundColor: 'transparent',
              color: '#000',
              '&:hover': {
                backgroundColor: 'transparent',
              },
            },
            '&.MuiPickersDay-today': {
              border: 'none',
            },
          }}
        />
      </Box>
    );
  };

  const selectedDayDetails = getDayDetails(selectedDate);

  return (
    <Box sx={{ p: { xs: 1, sm: 3 }, background: '#fff', minHeight: '100vh' }}>
      <Grid container spacing={4}>
        <Grid item xs={12} md={8}>
          <Card sx={{ border: '2px solid #000', borderRadius: 3 }}>
            <CardContent>
              <Box sx={{ mb: 3 }}>
                <FormControl fullWidth>
                  <InputLabel>Filter by Subject</InputLabel>
                  <Select
                    value={selectedSubject}
                    onChange={(e) => setSelectedSubject(e.target.value)}
                    label="Filter by Subject"
                    sx={{
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#000',
                      },
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#333',
                      },
                    }}
                  >
                    <MenuItem value="all">All Subjects</MenuItem>
                    {subjects.map((subject) => (
                      <MenuItem key={subject} value={subject}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box
                            sx={{
                              width: 12,
                              height: 12,
                              borderRadius: '50%',
                              backgroundColor: subjectColors[subject] || '#000',
                            }}
                          />
                          {subject}
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
              <Box sx={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(7, 1fr)',
                gap: 1,
                mb: 2
              }}>
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <Typography 
                    key={day} 
                    variant="caption" 
                    sx={{ 
                      textAlign: 'center',
                      color: '#666',
                      fontWeight: 500,
                      fontSize: '0.75rem'
                    }}
                  >
                    {day}
                  </Typography>
                ))}
              </Box>
              <Box sx={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(7, 1fr)',
                gap: 1,
                minHeight: 400
              }}>
                {Array.from({ length: 42 }, (_, i) => {
                  const date = new Date(selectedDate);
                  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
                  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
                  const startOffset = firstDay.getDay();
                  const dayNumber = i - startOffset + 1;
                  const currentDate = new Date(date.getFullYear(), date.getMonth(), dayNumber);
                  
                  if (dayNumber < 1 || dayNumber > lastDay.getDate()) {
                    return <Box key={i} />;
                  }

                  const studyHours = getStudyHoursForDate(currentDate);
                  const daySessions = sessions.filter(session => {
                    const sessionDate = new Date(session.startTime);
                    return (
                      sessionDate.getDate() === dayNumber &&
                      sessionDate.getMonth() === date.getMonth() &&
                      sessionDate.getFullYear() === date.getFullYear() &&
                      !session.isBreak &&
                      (selectedSubject === 'all' || session.subject === selectedSubject)
                    );
                  });

                  const uniqueSubjects = Array.from(new Set(daySessions.map(s => s.subject)));

                  return (
                    <Box
                      key={i}
                      onClick={() => setSelectedDate(currentDate)}
                      sx={{
                        aspectRatio: '1',
                        border: '1px solid #e0e0e0',
                        borderRadius: 1,
                        backgroundColor: studyHours > 0 ? '#f8f9fa' : 'transparent',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        position: 'relative',
                        '&:hover': {
                          backgroundColor: studyHours > 0 ? '#f0f0f0' : '#f8f9fa',
                          transform: 'translateY(-2px)',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        }
                      }}
                    >
                      <Box sx={{ 
                        position: 'absolute',
                        top: 4,
                        left: 4,
                        right: 4,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 0.5
                      }}>
                        <Typography 
                          variant="caption" 
                          sx={{ 
                            fontSize: '0.75rem',
                            color: '#666',
                            fontWeight: 500
                          }}
                        >
                          {dayNumber}
                        </Typography>
                        {studyHours > 0 && (
                          <>
                            <Typography 
                              variant="body2" 
                              sx={{ 
                                fontSize: '0.875rem',
                                fontWeight: 600,
                                color: '#000',
                                textAlign: 'center'
                              }}
                            >
                              {studyHours.toFixed(1)}h
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                              {uniqueSubjects.map((subject, index) => (
                                <Box
                                  key={index}
                                  sx={{
                                    width: 4,
                                    height: 4,
                                    borderRadius: '50%',
                                    backgroundColor: subjectColors[subject] || '#000',
                                  }}
                                />
                              ))}
                            </Box>
                          </>
                        )}
                      </Box>
                    </Box>
                  );
                })}
              </Box>
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                mt: 2
              }}>
                <Button
                  onClick={() => {
                    const newDate = new Date(selectedDate);
                    newDate.setMonth(newDate.getMonth() - 1);
                    setSelectedDate(newDate);
                  }}
                  sx={{
                    color: '#000',
                    '&:hover': {
                      backgroundColor: '#f0f0f0'
                    }
                  }}
                >
                  Previous Month
                </Button>
                <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                  {format(selectedDate, 'MMMM yyyy')}
                </Typography>
                <Button
                  onClick={() => {
                    const newDate = new Date(selectedDate);
                    newDate.setMonth(newDate.getMonth() + 1);
                    setSelectedDate(newDate);
                  }}
                  sx={{
                    color: '#000',
                    '&:hover': {
                      backgroundColor: '#f0f0f0'
                    }
                  }}
                >
                  Next Month
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ border: '2px solid #000', borderRadius: 3, mb: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ color: '#000', fontWeight: 600, mb: 2 }}>
                {format(selectedDate, 'MMMM d, yyyy')}
              </Typography>
              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" sx={{ color: '#666', mb: 1 }}>
                  Study Time: {selectedDayDetails.totalStudyHours.toFixed(1)} hours
                </Typography>
                <Typography variant="body2" sx={{ color: '#666' }}>
                  Break Time: {selectedDayDetails.totalBreakHours.toFixed(1)} hours
                </Typography>
              </Box>

              {/* Subject-wise Breakdown */}
              <Typography variant="subtitle1" sx={{ color: '#000', fontWeight: 500, mb: 1 }}>
                Subject-wise Breakdown
              </Typography>
              {Array.from(new Set(selectedDayDetails.studySessions.map(s => s.subject))).map(subject => {
                const subjectHours = selectedDayDetails.studySessions
                  .filter(s => s.subject === subject)
                  .reduce((total, s) => total + s.duration, 0) / 60;
                
                return (
                  <Box key={subject} sx={{ mb: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                      <Typography variant="body2" sx={{ color: '#000', fontWeight: 500 }}>
                        {subject}
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#666' }}>
                        {subjectHours.toFixed(1)}h
                      </Typography>
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={(subjectHours / selectedDayDetails.totalStudyHours) * 100} 
                      sx={{ 
                        height: 4, 
                        borderRadius: 2,
                        backgroundColor: '#f5f5f5',
                        '& .MuiLinearProgress-bar': {
                          backgroundColor: subjectColors[subject] || '#000'
                        }
                      }} 
                    />
                  </Box>
                );
              })}

              {/* Study Sessions */}
              <Typography variant="subtitle1" sx={{ color: '#000', fontWeight: 500, mb: 1, mt: 3 }}>
                Study Sessions
              </Typography>
              {selectedDayDetails.studySessions.map((session) => (
                <Box
                  key={session.id}
                  sx={{
                    p: 1,
                    mb: 1,
                    borderLeft: `4px solid ${subjectColors[session.subject] || '#000'}`,
                    backgroundColor: '#f5f5f5',
                  }}
                >
                  <Typography variant="body2" sx={{ color: '#000', fontWeight: 500 }}>
                    {session.subject}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#666' }}>
                    {format(new Date(session.startTime), 'h:mm a')} - {(session.duration / 60).toFixed(1)} hours
                  </Typography>
                </Box>
              ))}

              {/* Break Sessions */}
              <Typography variant="subtitle1" sx={{ color: '#000', fontWeight: 500, mb: 1, mt: 3 }}>
                Break Sessions
              </Typography>
              {selectedDayDetails.breakSessions.map((session) => (
                <Box
                  key={session.id}
                  sx={{
                    p: 1,
                    mb: 1,
                    borderLeft: '4px solid #757575',
                    backgroundColor: '#f5f5f5',
                  }}
                >
                  <Typography variant="body2" sx={{ color: '#000', fontWeight: 500 }}>
                    Break
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#666' }}>
                    {format(new Date(session.startTime), 'h:mm a')} - {(session.duration / 60).toFixed(1)} hours
                  </Typography>
                </Box>
              ))}

              {selectedDayDetails.studySessions.length === 0 && selectedDayDetails.breakSessions.length === 0 && (
                <Typography variant="body2" sx={{ color: '#666', fontStyle: 'italic' }}>
                  No sessions recorded for this day
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Calendar; 