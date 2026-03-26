import express from 'express';
import {
  promoteUserToAdmin,
  getAllUsers,
  createSlot,
  updateSlotStatus,
  deleteSlot,
  getAllBookings,
  getSlotStats,
} from '../controllers/adminController.js';
import { verifyToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Apply auth middleware to all admin routes
router.use(verifyToken, requireAdmin);

/**
 * POST /admin/promote-user
 * Promote a user to admin (admin only)
 */
router.post('/promote-user', promoteUserToAdmin);

/**
 * GET /admin/users
 * Get all users (admin only)
 */
router.get('/users', getAllUsers);

/**
 * POST /admin/slot
 * Create a new parking slot (admin only)
 */
router.post('/slot', createSlot);

/**
 * PATCH /admin/slot/:id
 * Update parking slot status (admin only)
 */
router.patch('/slot/:id', updateSlotStatus);

/**
 * DELETE /admin/slot/:id
 * Delete a parking slot (admin only)
 */
router.delete('/slot/:id', deleteSlot);

/**
 * GET /admin/bookings
 * Get all bookings (admin only)
 */
router.get('/bookings', getAllBookings);

/**
 * GET /admin/stats
 * Get parking system statistics (admin only)
 */
router.get('/stats', getSlotStats);

export default router;
