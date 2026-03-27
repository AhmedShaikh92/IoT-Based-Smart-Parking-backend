import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import authRoutes from './routes/auth.js';
import slotRoutes from './routes/slots.js';
import adminRoutes from './routes/admin.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: 'https://iot-based-smart-parking.vercel.app',
  credentials: true
}));
app.use(express.json());

//ping to prevent idling on Render
setInterval(() => {
  fetch('https://iot-based-smart-parking-backend.onrender.com/health')
}, 5 * 60 * 1000); // Every 5 minutes

// Routes
app.use('/auth', authRoutes);
app.use('/slots', slotRoutes);
app.use('/admin', adminRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    data: null,
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    data: null,
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    data: null,
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚗 Smart Parking Backend Server running on http://localhost:${PORT}`);
  console.log('📚 API Documentation:');
  console.log('  - POST /auth/signup');
  console.log('  - POST /auth/login');
  console.log('  - GET /slots (requires auth)');
  console.log('  - GET /slots/free (requires auth)');
  console.log('  - POST /slots/book (requires auth)');
  console.log('  - POST /admin/slot (admin only)');
  console.log('  - PATCH /admin/slot/:id (admin only)');
  console.log('  - DELETE /admin/slot/:id (admin only)');
  console.log('  - GET /admin/bookings (admin only)');
  console.log('  - GET /admin/stats (admin only)');
});
