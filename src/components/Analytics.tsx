import React from 'react';
import {
  Box,
  Typography,
  LinearProgress,
} from '@mui/material';

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
}

interface Paper {
  id: string;
  title: string;
  subjects: Subject[];
  status: 'not_started' | 'in_progress' | 'completed';
  progress: number;
}

interface AnalyticsProps {
  papers: Paper[];
}

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

const Analytics: React.FC<AnalyticsProps> = ({ papers }) => {
  const analytics = calculateAnalytics(papers);
  const overallProgress = calculateOverallProgress(papers);

  return (
    <Box sx={{ p: 3, background: '#fff', minHeight: '100vh' }}>
      <Typography variant="h6" sx={{ color: '#000', fontWeight: 600, mb: 3 }}>
        Analytics Dashboard
      </Typography>

      <Box sx={{ 
        display: 'grid', 
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
        gap: 2,
        p: 2,
        bgcolor: '#f5f5f5',
        borderRadius: 2
      }}>
        {/* Overall Progress */}
        <Box sx={{ 
          p: 2, 
          bgcolor: '#fff', 
          borderRadius: 1,
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <Typography variant="subtitle2" sx={{ color: '#666', mb: 1 }}>
            Overall Progress
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <LinearProgress 
              variant="determinate" 
              value={overallProgress} 
              sx={{ 
                height: 8, 
                borderRadius: 4,
                backgroundColor: '#e0e0e0',
                flex: 1,
                '& .MuiLinearProgress-bar': {
                  backgroundColor: '#2E7D32'
                }
              }} 
            />
            <Typography variant="body2" sx={{ color: '#000', fontWeight: 500, minWidth: 60 }}>
              {Math.round(overallProgress)}%
            </Typography>
          </Box>
        </Box>

        {/* Time Statistics */}
        <Box sx={{ 
          p: 2, 
          bgcolor: '#fff', 
          borderRadius: 1,
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <Typography variant="subtitle2" sx={{ color: '#666', mb: 1 }}>
            Time Statistics
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Typography variant="body2" sx={{ color: '#000' }}>
              Total Hours: {Math.round(analytics.totalHours)}h
            </Typography>
            <Typography variant="body2" sx={{ color: '#2E7D32' }}>
              Completed: {Math.round(analytics.completedHours)}h
            </Typography>
            <Typography variant="body2" sx={{ color: '#FFA726' }}>
              In Progress: {Math.round(analytics.inProgressHours)}h
            </Typography>
          </Box>
        </Box>

        {/* Content Statistics */}
        <Box sx={{ 
          p: 2, 
          bgcolor: '#fff', 
          borderRadius: 1,
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <Typography variant="subtitle2" sx={{ color: '#666', mb: 1 }}>
            Content Statistics
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Typography variant="body2" sx={{ color: '#000' }}>
              Papers: {analytics.totalPapers}
            </Typography>
            <Typography variant="body2" sx={{ color: '#000' }}>
              Subjects: {analytics.totalSubjects}
            </Typography>
            <Typography variant="body2" sx={{ color: '#000' }}>
              Subtopics: {analytics.totalSubtopics}
            </Typography>
            <Typography variant="body2" sx={{ color: '#000' }}>
              Lectures: {analytics.totalLectures}
            </Typography>
          </Box>
        </Box>

        {/* Lecture Status */}
        <Box sx={{ 
          p: 2, 
          bgcolor: '#fff', 
          borderRadius: 1,
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <Typography variant="subtitle2" sx={{ color: '#666', mb: 1 }}>
            Lecture Status
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Typography variant="body2" sx={{ color: '#2E7D32' }}>
              Completed: {analytics.completedLectures}
            </Typography>
            <Typography variant="body2" sx={{ color: '#FFA726' }}>
              In Progress: {analytics.inProgressLectures}
            </Typography>
            <Typography variant="body2" sx={{ color: '#757575' }}>
              Not Started: {analytics.notStartedLectures}
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default Analytics; 