import express from 'express';
import { auth } from '../middleware/auth';
import {
  getDailyAnalytics,
  getWeeklyAnalytics,
  updateAnalytics,
  getStudyHistory,
} from '../controllers/analyticsController';

const router = express.Router();

// All routes are protected by auth middleware
router.use(auth);

// Get daily analytics
router.get('/daily', getDailyAnalytics);

// Get weekly analytics
router.get('/weekly', getWeeklyAnalytics);

// Update analytics
router.post('/update', updateAnalytics);

// Get study history
router.get('/history', getStudyHistory);

export default router; 