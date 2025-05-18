export interface User {
  id: string;
  email: string;
  role: 'admin' | 'user';
}

export interface StudySession {
  id: string;
  subject: string;
  duration: number;
  startTime: Date;
  isBreak: boolean;
} 