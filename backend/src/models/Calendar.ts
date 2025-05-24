import mongoose, { Document, Schema } from 'mongoose';
import { IUser } from './User';

export interface ICalendarEvent extends Document {
  user: IUser['_id'];
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  type: 'study' | 'exam' | 'revision' | 'other';
  subject?: string;
  topic?: string;
  location?: string;
  isRecurring: boolean;
  recurrencePattern?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    interval: number;
    daysOfWeek?: number[]; // 0-6 for Sunday-Saturday
    endDate?: Date;
  };
  status: 'scheduled' | 'completed' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
}

const calendarEventSchema = new Schema<ICalendarEvent>({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  description: String,
  startTime: {
    type: Date,
    required: true,
  },
  endTime: {
    type: Date,
    required: true,
  },
  type: {
    type: String,
    enum: ['study', 'exam', 'revision', 'other'],
    required: true,
  },
  subject: String,
  topic: String,
  location: String,
  isRecurring: {
    type: Boolean,
    default: false,
  },
  recurrencePattern: {
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly'],
    },
    interval: Number,
    daysOfWeek: [Number],
    endDate: Date,
  },
  status: {
    type: String,
    enum: ['scheduled', 'completed', 'cancelled'],
    default: 'scheduled',
  },
}, {
  timestamps: true,
});

// Indexes for efficient querying
calendarEventSchema.index({ user: 1, startTime: 1 });
calendarEventSchema.index({ type: 1 });
calendarEventSchema.index({ status: 1 });

export const CalendarEvent = mongoose.model<ICalendarEvent>('CalendarEvent', calendarEventSchema); 