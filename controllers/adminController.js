import { db } from '../config/firebase.js';

export const promoteUserToAdmin = async (req, res) => {
  try {
    const { email } = req.body;

    // Validate input
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required.',
        data: null,
      });
    }

    // Find user by email
    const userSnapshot = await db.collection('users').where('email', '==', email).limit(1).get();

    if (userSnapshot.empty) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
        data: null,
      });
    }

    const userDoc = userSnapshot.docs[0];
    const user = userDoc.data();

    // Check if already admin
    if (user.role === 'admin') {
      return res.status(400).json({
        success: false,
        message: 'User is already an admin.',
        data: null,
      });
    }

    // Promote user to admin
    await userDoc.ref.update({ role: 'admin' });

    return res.status(200).json({
      success: true,
      message: `User ${email} has been promoted to admin.`,
      data: {
        userId: userDoc.id,
        name: user.name,
        email: user.email,
        role: 'admin',
      },
    });
  } catch (error) {
    console.error('Promote user error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error promoting user.',
      data: null,
    });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    const usersSnapshot = await db.collection('users').get();

    if (usersSnapshot.empty) {
      return res.status(200).json({
        success: true,
        message: 'No users found.',
        data: [],
      });
    }

    const users = usersSnapshot.docs.map((doc) => {
      const userData = doc.data();
      return {
        userId: doc.id,
        name: userData.name,
        email: userData.email,
        role: userData.role,
        createdAt: userData.createdAt,
      };
    });

    return res.status(200).json({
      success: true,
      message: 'All users retrieved successfully.',
      data: users,
    });
  } catch (error) {
    console.error('Get all users error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error fetching users.',
      data: null,
    });
  }
};

export const createSlot = async (req, res) => {
  try {
    const { slotNumber } = req.body;

    // Validate input
    if (!slotNumber) {
      return res.status(400).json({
        success: false,
        message: 'slotNumber is required.',
        data: null,
      });
    }

    // Check if slot number already exists
    const existingSlot = await db.collection('parkingSlots').where('slotNumber', '==', slotNumber).limit(1).get();

    if (!existingSlot.empty) {
      return res.status(400).json({
        success: false,
        message: 'Slot with this number already exists.',
        data: null,
      });
    }

    // Create slot
    const newSlot = {
      slotNumber,
      status: 'free',
      bookedBy: null,
      updatedAt: new Date().toISOString(),
    };

    const docRef = await db.collection('parkingSlots').add(newSlot);

    return res.status(201).json({
      success: true,
      message: 'Parking slot created successfully.',
      data: {
        id: docRef.id,
        ...newSlot,
      },
    });
  } catch (error) {
    console.error('Create slot error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error creating slot.',
      data: null,
    });
  }
};

export const updateSlotStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, bookedBy } = req.body;

    // Validate input
    if (!status || !['free', 'occupied'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Valid status ("free" or "occupied") is required.',
        data: null,
      });
    }

    const slotRef = db.collection('parkingSlots').doc(id);
    const slotDoc = await slotRef.get();

    if (!slotDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Parking slot not found.',
        data: null,
      });
    }

    // Update slot
    const updateData = {
      status,
      updatedAt: new Date().toISOString(),
    };

    if (status === 'free') {
      updateData.bookedBy = null;
    } else if (bookedBy) {
      updateData.bookedBy = bookedBy;
    }

    await slotRef.update(updateData);

    return res.status(200).json({
      success: true,
      message: 'Parking slot updated successfully.',
      data: {
        id,
        ...slotDoc.data(),
        ...updateData,
      },
    });
  } catch (error) {
    console.error('Update slot error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error updating slot.',
      data: null,
    });
  }
};

export const deleteSlot = async (req, res) => {
  try {
    const { id } = req.params;

    const slotRef = db.collection('parkingSlots').doc(id);
    const slotDoc = await slotRef.get();

    if (!slotDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Parking slot not found.',
        data: null,
      });
    }

    await slotRef.delete();

    return res.status(200).json({
      success: true,
      message: 'Parking slot deleted successfully.',
      data: {
        id,
        message: 'Slot removed from system',
      },
    });
  } catch (error) {
    console.error('Delete slot error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error deleting slot.',
      data: null,
    });
  }
};

export const getAllBookings = async (req, res) => {
  try {
    const bookingsSnapshot = await db.collection('bookings').get();

    if (bookingsSnapshot.empty) {
      return res.status(200).json({
        success: true,
        message: 'No bookings found.',
        data: [],
      });
    }

    const bookings = bookingsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return res.status(200).json({
      success: true,
      message: 'All bookings retrieved successfully.',
      data: bookings,
    });
  } catch (error) {
    console.error('Get all bookings error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error fetching bookings.',
      data: null,
    });
  }
};

export const getSlotStats = async (req, res) => {
  try {
    const slotsSnapshot = await db.collection('parkingSlots').get();
    const bookingsSnapshot = await db.collection('bookings').get();

    const totalSlots = slotsSnapshot.size;
    const occupiedSlots = slotsSnapshot.docs.filter((doc) => doc.data().status === 'occupied').length;
    const freeSlots = totalSlots - occupiedSlots;
    const totalBookings = bookingsSnapshot.size;

    return res.status(200).json({
      success: true,
      message: 'Parking statistics retrieved successfully.',
      data: {
        totalSlots,
        occupiedSlots,
        freeSlots,
        occupancyRate: totalSlots > 0 ? ((occupiedSlots / totalSlots) * 100).toFixed(2) + '%' : '0%',
        totalBookings,
      },
    });
  } catch (error) {
    console.error('Get stats error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error fetching statistics.',
      data: null,
    });
  }
};
