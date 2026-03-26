import express from 'express';
import { getAllSlots, getFreeSlots, bookSlot, unbookSlot, getMyBooking, expireBookings, extendSlot } from '../controllers/slotController.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

router.get('/', verifyToken, getAllSlots);

router.get('/free', verifyToken, getFreeSlots);

router.post('/book', verifyToken, bookSlot);

router.post('/unbook', verifyToken, unbookSlot);

router.get('/my-booking', verifyToken, getMyBooking);

router.post('/expire-check', verifyToken, expireBookings);

router.patch('/extend', verifyToken, extendSlot);

export default router;
