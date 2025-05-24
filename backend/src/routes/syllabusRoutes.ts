import express from 'express';
import { auth } from '../middleware/auth';
import {
  createSyllabusItem,
  updateSyllabusItem,
  updateSubtopicStatus,
  getSyllabusItems,
  getSyllabusProgress,
} from '../controllers/syllabusController';

const router = express.Router();

// Protected routes
router.use(auth);

// Syllabus routes
router.post('/', createSyllabusItem);
router.put('/:id', updateSyllabusItem);
router.put('/:id/subtopics/:subtopicId', updateSubtopicStatus);
router.get('/', getSyllabusItems);
router.get('/progress', getSyllabusProgress);

export default router; 