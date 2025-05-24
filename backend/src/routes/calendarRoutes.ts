import express from 'express';
import { auth } from '../middleware/auth';
import {
  createEvent,
  updateEvent,
  deleteEvent,
  getEvents,
  getUpcomingEvents,
  generateRecurringEvents,
} from '../controllers/calendarController';

const router = express.Router();

// All routes are protected by auth middleware
router.use(auth);

// Create a new calendar event
router.post('/', createEvent);

// Update an existing event
router.put('/:id', updateEvent);

// Delete an event
router.delete('/:id', deleteEvent);

// Get events with optional filters
router.get('/', getEvents);

// Get upcoming events
router.get('/upcoming', getUpcomingEvents);

// Generate recurring events
router.post('/:id/recurring', generateRecurringEvents);

export default router; 