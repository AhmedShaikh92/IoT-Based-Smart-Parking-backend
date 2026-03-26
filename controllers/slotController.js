import  {db}  from '../config/firebase.js';

export const getAllSlots = async (req, res) => {
  try {
    const slotsSnapshot = await db.collection('parkingSlots').get();

    if (slotsSnapshot.empty) {
      return res.status(200).json({
        success: true,
        message: 'No parking slots found.',
        data: [],
      });
    }

    const slots = slotsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return res.status(200).json({
      success: true,
      message: 'Parking slots retrieved successfully.',
      data: slots,
    });
  } catch (error) {
    console.error('Get slots error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error fetching slots.',
      data: null,
    });
  }
};

export const getFreeSlots = async (req, res) => {
  try {
    const freeSlots = await db.collection('parkingSlots').where('status', '==', 'free').get();

    if (freeSlots.empty) {
      return res.status(200).json({
        success: true,
        message: 'No free parking slots available.',
        data: [],
      });
    }

    const slots = freeSlots.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return res.status(200).json({
      success: true,
      message: 'Free parking slots retrieved successfully.',
      data: slots,
    });
  } catch (error) {
    console.error('Get free slots error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error fetching free slots.',
      data: null,
    });
  }
};


export const bookSlot = async (req, res) => {
  try {
    const { slotId, durationMinutes = 60 } = req.body;
    const userId = req.user.userId;
    const userName = req.user.name;
 
    if (!slotId) {
      return res.status(400).json({ success: false, message: 'slotId is required.', data: null });
    }
 
    // Clamp duration: min 15 min, max 24 hours
    const clampedDuration = Math.max(15, Math.min(1440, Number(durationMinutes)));
    const now = new Date();
    const expiresAt = new Date(now.getTime() + clampedDuration * 60 * 1000).toISOString();
 
    const result = await db.runTransaction(async (transaction) => {
      const slotRef = db.collection('parkingSlots').doc(slotId);
      const slotDoc = await transaction.get(slotRef);
 
      if (!slotDoc.exists) throw new Error('Parking slot not found.');
 
      const slotData = slotDoc.data();
      if (slotData.status !== 'free') throw new Error('Parking slot is not available.');
 
      // Check for existing active booking by this user
      const userBookings = await db
        .collection('bookings')
        .where('userId', '==', userId)
        .where('status', '==', 'active')
        .limit(1)
        .get();
 
      if (!userBookings.empty) throw new Error('User already has an active booking.');
 
      // Generate a human-readable ticket number: PK-YYYYMMDD-XXXX
      const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
      const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
      const ticketNumber = `PK-${datePart}-${randomPart}`;
 
      const bookingRef = db.collection('bookings').doc();
      const bookingData = {
        slotId,
        userId,
        userName,
        bookingTime: now.toISOString(),
        expiresAt,                        // NEW: when the slot auto-releases
        durationMinutes: clampedDuration, // NEW: how long they booked for
        ticketNumber,                     // NEW: human-readable ticket ID
        status: 'active',
      };
 
      transaction.set(bookingRef, bookingData);
      transaction.update(slotRef, {
        status: 'occupied',
        bookedBy: userId,
        expiresAt,                        // NEW: stored on slot too for easy querying
        updatedAt: now.toISOString(),
      });
 
      return { bookingId: bookingRef.id, ...bookingData };
    });
 
    return res.status(201).json({ success: true, message: 'Slot booked successfully.', data: result });
  } catch (error) {
    console.error('Book slot error:', error);
    const clientErrors = ['Parking slot not found.', 'Parking slot is not available.', 'User already has an active booking.'];
    return res.status(clientErrors.includes(error.message) ? (error.message === 'Parking slot not found.' ? 404 : 400) : 500).json({
      success: false,
      message: clientErrors.includes(error.message) ? error.message : 'Server error booking slot.',
      data: null,
    });
  }
};
 
export const unbookSlot = async (req, res) => {
  try {
    const { slotId } = req.body;
    const userId = req.user.userId;
 
    if (!slotId) {
      return res.status(400).json({
        success: false,
        message: 'slotId is required.',
        data: null,
      });
    }
 
    const result = await db.runTransaction(async (transaction) => {
      const slotRef = db.collection('parkingSlots').doc(slotId);
      const slotDoc = await transaction.get(slotRef);
 
      if (!slotDoc.exists) {
        throw new Error('Parking slot not found.');
      }
 
      const slotData = slotDoc.data();
 
      if (slotData.status !== 'occupied') {
        throw new Error('Slot is not currently booked.');
      }
 
      if (slotData.bookedBy !== userId) {
        throw new Error('You can only unbook your own slot.');
      }
 
      // Find the active booking document
      const bookingQuery = await db
        .collection('bookings')
        .where('slotId', '==', slotId)
        .where('userId', '==', userId)
        .where('status', '==', 'active')
        .limit(1)
        .get();
 
      if (bookingQuery.empty) {
        throw new Error('No active booking found for this slot.');
      }
 
      const bookingRef = bookingQuery.docs[0].ref;
 
      // Mark booking completed
      transaction.update(bookingRef, {
        status: 'completed',
        unbookedAt: new Date().toISOString(),
      });
 
      // Release the slot
      transaction.update(slotRef, {
        status: 'free',
        bookedBy: null,
        updatedAt: new Date().toISOString(),
      });
 
      return { bookingId: bookingQuery.docs[0].id, slotId };
    });
 
    return res.status(200).json({
      success: true,
      message: 'Slot unbooked successfully.',
      data: result,
    });
  } catch (error) {
    console.error('Unbook slot error:', error);
 
    const clientErrors = [
      'Parking slot not found.',
      'Slot is not currently booked.',
      'You can only unbook your own slot.',
      'No active booking found for this slot.',
    ];
 
    return res.status(clientErrors.includes(error.message) ? 400 : 500).json({
      success: false,
      message: clientErrors.includes(error.message) ? error.message : 'Server error unbooking slot.',
      data: null,
    });
  }
};
 
// ─── NEW: Get current user's active booking (for ticket display) ─────────────
export const getMyBooking = async (req, res) => {
  try {
    const userId = req.user.userId;
 
    const bookingSnap = await db
      .collection('bookings')
      .where('userId', '==', userId)
      .where('status', '==', 'active')
      .limit(1)
      .get();
 
    if (bookingSnap.empty) {
      return res.status(200).json({ success: true, message: 'No active booking.', data: null });
    }
 
    const bookingDoc = bookingSnap.docs[0];
    const booking = { bookingId: bookingDoc.id, ...bookingDoc.data() };
 
    // Fetch the slot details too
    const slotDoc = await db.collection('parkingSlots').doc(booking.slotId).get();
    const slot = slotDoc.exists ? { id: slotDoc.id, ...slotDoc.data() } : null;
 
    return res.status(200).json({
      success: true,
      message: 'Active booking retrieved.',
      data: { ...booking, slot },
    });
  } catch (error) {
    console.error('Get my booking error:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching booking.', data: null });
  }
};
 
// ─── NEW: Expire overdue bookings (called by frontend polling) ───────────────
// No cron needed — the frontend calls this every 30s; it's idempotent and safe.
export const expireBookings = async (req, res) => {
  try {
    const now = new Date().toISOString();
 
    // Find all active bookings whose expiresAt has passed
    const expiredSnap = await db
      .collection('bookings')
      .where('status', '==', 'active')
      .get();
 
    const expired = expiredSnap.docs.filter(doc => {
      const data = doc.data();
      return data.expiresAt && data.expiresAt <= now;
    });
 
    if (expired.length === 0) {
      return res.status(200).json({ success: true, message: 'No expired bookings.', data: { expired: 0 } });
    }
 
    // Release each expired booking in a batch
    const batch = db.batch();
    const slotUpdates = [];
 
    for (const doc of expired) {
      const data = doc.data();
 
      // Mark booking as expired
      batch.update(doc.ref, {
        status: 'expired',
        expiredAt: now,
      });
 
      // Queue the slot release
      slotUpdates.push(data.slotId);
    }
 
    // Release the slots
    for (const slotId of slotUpdates) {
      const slotRef = db.collection('parkingSlots').doc(slotId);
      batch.update(slotRef, {
        status: 'free',
        bookedBy: null,
        expiresAt: null,
        updatedAt: now,
      });
    }
 
    await batch.commit();
 
    return res.status(200).json({
      success: true,
      message: `${expired.length} booking(s) expired and slots released.`,
      data: { expired: expired.length },
    });
  } catch (error) {
    console.error('Expire bookings error:', error);
    return res.status(500).json({ success: false, message: 'Server error expiring bookings.', data: null });
  }
};

export const extendSlot = async (req, res) => {
  try {
    const { slotId, additionalMinutes = 30 } = req.body;
    const userId = req.user.userId;
 
    if (!slotId) {
      return res.status(400).json({ success: false, message: 'slotId is required.', data: null });
    }
 
    // Clamp: allow 15–480 min extension per request
    const extra = Math.max(15, Math.min(480, Number(additionalMinutes)));
 
    const result = await db.runTransaction(async (transaction) => {
      // 1. Verify slot exists and belongs to this user
      const slotRef = db.collection('parkingSlots').doc(slotId);
      const slotDoc = await transaction.get(slotRef);
 
      if (!slotDoc.exists) throw new Error('Parking slot not found.');
      const slotData = slotDoc.data();
      if (slotData.status !== 'occupied') throw new Error('Slot is not currently occupied.');
      if (slotData.bookedBy !== userId) throw new Error('You can only extend your own booking.');
 
      // 2. Find the active booking
      const bookingQuery = await db
        .collection('bookings')
        .where('slotId', '==', slotId)
        .where('userId', '==', userId)
        .where('status', '==', 'active')
        .limit(1)
        .get();
 
      if (bookingQuery.empty) throw new Error('No active booking found for this slot.');
 
      const bookingRef = bookingQuery.docs[0].ref;
      const bookingData = bookingQuery.docs[0].data();
 
      // 3. Calculate new expiry — extend from NOW if already past expiry,
      //    or from current expiresAt if still in the future (grace extension)
      const currentExpiry = new Date(bookingData.expiresAt);
      const now = new Date();
      const baseTime = currentExpiry > now ? currentExpiry : now;
      const newExpiresAt = new Date(baseTime.getTime() + extra * 60 * 1000).toISOString();
      const newDurationMinutes = bookingData.durationMinutes + extra;
 
      // 4. Atomic update on both documents
      transaction.update(bookingRef, {
        expiresAt: newExpiresAt,
        durationMinutes: newDurationMinutes,
        lastExtendedAt: now.toISOString(),
        extensionCount: (bookingData.extensionCount || 0) + 1,
      });
 
      transaction.update(slotRef, {
        expiresAt: newExpiresAt,
        updatedAt: now.toISOString(),
      });
 
      return {
        bookingId: bookingQuery.docs[0].id,
        slotId,
        newExpiresAt,
        newDurationMinutes,
        additionalMinutes: extra,
      };
    });
 
    return res.status(200).json({
      success: true,
      message: `Booking extended by ${extra} minutes.`,
      data: result,
    });
  } catch (error) {
    console.error('Extend slot error:', error);
    const clientErrors = [
      'Parking slot not found.',
      'Slot is not currently occupied.',
      'You can only extend your own booking.',
      'No active booking found for this slot.',
    ];
    return res.status(clientErrors.includes(error.message) ? 400 : 500).json({
      success: false,
      message: clientErrors.includes(error.message) ? error.message : 'Server error extending booking.',
      data: null,
    });
  }
};
 