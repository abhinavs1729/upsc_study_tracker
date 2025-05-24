import { Document } from 'mongoose';

interface IUser extends Document {
  _id: string;
  email: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

declare global {
  namespace Express {
    interface Request {
      user?: IUser;
    }
  }
} 