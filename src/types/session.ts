export interface StudySession {
  id: string;
  userId: string;
  startTime: string;
  endTime?: string;
  duration: number;
  subject: string;
  description: string;
  status: 'active' | 'completed' | 'paused';
  createdAt: string;
  updatedAt: string;
} 