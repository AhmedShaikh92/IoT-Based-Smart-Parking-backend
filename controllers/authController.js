import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../config/firebase.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export const signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@smartparking.com';

    // Validate input
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: name, email, password',
        data: null,
      });
    }

    // Check if email already exists
    const existingUser = await db.collection('users').where('email', '==', email).limit(1).get();
    if (!existingUser.empty) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered.',
        data: null,
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Automatically assign admin role if email matches predetermined admin email
    const role = email === ADMIN_EMAIL ? 'admin' : 'user';

    // Create user
    const newUser = {
      name,
      email,
      password: hashedPassword,
      role,
      createdAt: new Date().toISOString(),
    };

    const docRef = await db.collection('users').add(newUser);

    return res.status(201).json({
      success: true,
      message: 'User registered successfully.',
      data: {
        userId: docRef.id,
        name,
        email,
        role,
      },
    });
  } catch (error) {
    console.error('Signup error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during signup.',
      data: null,
    });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.',
        data: null,
      });
    }

    // Find user by email
    const userSnapshot = await db.collection('users').where('email', '==', email).limit(1).get();

    if (userSnapshot.empty) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
        data: null,
      });
    }

    const userDoc = userSnapshot.docs[0];
    const user = userDoc.data();

    // Compare password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
        data: null,
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: userDoc.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      data: {
        token,
        user: {
          userId: userDoc.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during login.',
      data: null,
    });
  }
};
