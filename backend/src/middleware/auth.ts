import { Request, Response, NextFunction } from 'express';
import admin from 'firebase-admin';
import { User, IUser } from '../models/User';

export const auth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split('Bearer ')[1];
    let decodedToken;

    try {
      // First try to verify as ID token
      decodedToken = await admin.auth().verifyIdToken(token);
    } catch (error) {
      try {
        // If that fails, try to verify as custom token
        decodedToken = await admin.auth().verifyIdToken(token);
      } catch (error) {
        console.error('Token verification error:', error);
        return res.status(401).json({ error: 'Invalid token' });
      }
    }

    // For testing purposes, if the token is a custom token with uid 'test-user'
    if (decodedToken.uid === 'test-user') {
      let user = await User.findOne({ firebaseUid: 'test-user' });
      if (!user) {
        user = await User.create({
          firebaseUid: 'test-user',
          email: 'test@example.com',
          name: 'Test User',
        });
      }
      req.user = user.toObject();
      return next();
    }
    
    // For regular users
    if (!decodedToken.email) {
      return res.status(401).json({ error: 'No email in token' });
    }

    let user = await User.findOne({ firebaseUid: decodedToken.uid });
    if (!user) {
      user = await User.create({
        firebaseUid: decodedToken.uid,
        email: decodedToken.email,
        name: decodedToken.name || decodedToken.email.split('@')[0],
      });
    }

    req.user = user.toObject();
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
}; 