import mongoose, { Document, Schema } from 'mongoose';
import { IUser } from './User';

export interface IAnalytics extends Document {
  user: IUser['_id'];
  date: Date;
  totalStudyTime: number; // in minutes
  subjects: {
    name: string;
    timeSpent: number; // in minutes
    topics: {
      name: string;
      timeSpent: number; // in minutes
    }[];
  }[];
  goals: {
    daily: number; // in minutes
    weekly: number; // in minutes
    monthly: number; // in minutes
  };
  achievements: {
    name: string;
    description: string;
    unlockedAt: Date;
  }[];
  streak: {
    current: number;
    longest: number;
    lastUpdated: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

const analyticsSchema = new Schema<IAnalytics>({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  totalStudyTime: {
    type: Number,
    default: 0,
  },
  subjects: [{
    name: {
      type: String,
      required: true,
    },
    timeSpent: {
      type: Number,
      default: 0,
    },
    topics: [{
      name: {
        type: String,
        required: true,
      },
      timeSpent: {
        type: Number,
        default: 0,
      },
    }],
  }],
  goals: {
    daily: {
      type: Number,
      default: 0,
    },
    weekly: {
      type: Number,
      default: 0,
    },
    monthly: {
      type: Number,
      default: 0,
    },
  },
  achievements: [{
    name: {
      type: String,
      required: true,
    },
    description: String,
    unlockedAt: {
      type: Date,
      required: true,
    },
  }],
  streak: {
    current: {
      type: Number,
      default: 0,
    },
    longest: {
      type: Number,
      default: 0,
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
}, {
  timestamps: true,
});

// Indexes for efficient querying
analyticsSchema.index({ user: 1, date: 1 });
analyticsSchema.index({ 'subjects.name': 1 });

export const Analytics = mongoose.model<IAnalytics>('Analytics', analyticsSchema); 