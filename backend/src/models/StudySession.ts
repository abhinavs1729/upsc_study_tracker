import mongoose, { Document, Schema } from 'mongoose';
import { IUser } from './User';

export interface IStudySession extends Document {
  user: IUser['_id'];
  startTime: Date;
  endTime: Date;
  duration: number; // in minutes
  subject: string;
  topic: string;
  notes?: string;
  status: 'active' | 'completed' | 'paused';
  createdAt: Date;
  updatedAt: Date;
}

const studySessionSchema = new Schema<IStudySession>({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  startTime: {
    type: Date,
    required: true,
  },
  endTime: {
    type: Date,
  },
  duration: {
    type: Number,
    required: true,
  },
  subject: {
    type: String,
    required: true,
  },
  topic: {
    type: String,
    required: true,
  },
  notes: {
    type: String,
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'paused'],
    default: 'active',
  },
}, {
  timestamps: true,
});

// Index for efficient querying
studySessionSchema.index({ user: 1, startTime: -1 });
studySessionSchema.index({ status: 1 });

export const StudySession = mongoose.model<IStudySession>('StudySession', studySessionSchema); 