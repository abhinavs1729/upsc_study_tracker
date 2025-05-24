import mongoose, { Document, Schema } from 'mongoose';
import { IUser } from './User';

export interface ISyllabusItem extends Document {
  user: IUser['_id'];
  subject: string;
  topic: string;
  subtopics: {
    name: string;
    status: 'not_started' | 'in_progress' | 'completed';
    notes?: string;
    completedAt?: Date;
  }[];
  status: 'not_started' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  targetDate?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const syllabusItemSchema = new Schema<ISyllabusItem>({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
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
  subtopics: [{
    name: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['not_started', 'in_progress', 'completed'],
      default: 'not_started',
    },
    notes: String,
    completedAt: Date,
  }],
  status: {
    type: String,
    enum: ['not_started', 'in_progress', 'completed'],
    default: 'not_started',
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium',
  },
  targetDate: Date,
  completedAt: Date,
}, {
  timestamps: true,
});

// Indexes for efficient querying
syllabusItemSchema.index({ user: 1, subject: 1 });
syllabusItemSchema.index({ status: 1 });
syllabusItemSchema.index({ priority: 1 });

export const SyllabusItem = mongoose.model<ISyllabusItem>('SyllabusItem', syllabusItemSchema); 