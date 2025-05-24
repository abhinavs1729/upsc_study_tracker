import express from 'express';
import { auth } from '../middleware/auth';
import {
  createSession,
  endSession,
  pauseSession,
  resumeSession,
  getSessions,
  getTodaySessions,
} from '../controllers/studySessionController';

const router = express.Router();

// Protected routes
router.use(auth);

// Study session routes
router.post('/', createSession);
router.post('/:id/end', endSession);
router.post('/:id/pause', pauseSession);
router.post('/:id/resume', resumeSession);
router.get('/', getSessions);
router.get('/today', getTodaySessions);

export default router; 