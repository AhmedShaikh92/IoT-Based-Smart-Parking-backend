import express from 'express';
import { signup, login } from '../controllers/authController.js';

const router = express.Router();

/**
 * POST /auth/signup
 * Register a new user or admin
 */
router.post('/signup', signup);

/**
 * POST /auth/login
 * Login and receive JWT token
 */
router.post('/login', login);

export default router;
