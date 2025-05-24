import express from 'express';
import { auth } from '../middleware/auth';
import {
  createUser,
  getUser,
  updateUser,
  deleteUser,
} from '../controllers/userController';

const router = express.Router();

// Protected routes
router.use(auth);

// User routes
router.post('/', createUser);
router.get('/:id', getUser);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);

export default router; 