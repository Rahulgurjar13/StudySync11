import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import User from '../models/User.js';

const router = express.Router();

// Register
router.post('/register',
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('fullName').trim().notEmpty(),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password, fullName } = req.body;

      // Check if user exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ error: 'User already exists' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const user = new User({
        email,
        password: hashedPassword,
        fullName
      });

      await user.save();

      // Generate JWT
      const token = jwt.sign(
        { id: user._id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.status(201).json({
        token,
        user: {
          id: user._id,
          email: user.email,
          fullName: user.fullName
        }
      });
    } catch (error) {
      console.error('Register error:', error);
      res.status(500).json({ error: 'Server error during registration' });
    }
  }
);

// Login
router.post('/login',
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password } = req.body;

      // Find user
      const user = await User.findOne({ email });
      if (!user) {
        console.log('[AUTH] Login failed - user not found:', email);
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Check password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        console.log('[AUTH] Login failed - invalid password for:', email);
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Update last active
      user.profile.lastActive = new Date();
      await user.save();

      // Generate JWT
      const token = jwt.sign(
        { id: user._id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      console.log('[AUTH] Login successful for user:', email, 'ID:', user._id);

      res.json({
        token,
        user: {
          id: user._id,
          email: user.email,
          fullName: user.fullName,
          profile: user.profile
        }
      });
    } catch (error) {
      console.error('[AUTH] Login error:', error);
      res.status(500).json({ error: 'Server error during login' });
    }
  }
);

// Get current user
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      console.log('[AUTH] /me - No token provided');
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('[AUTH] /me - Token decoded for user:', decoded.email, 'ID:', decoded.id);

    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      console.log('[AUTH] /me - User not found in database:', decoded.id);
      return res.status(404).json({ error: 'User not found' });
    }

    console.log('[AUTH] /me - Returning user data:', user.email, 'ID:', user._id);

    res.json({
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        profile: user.profile
      }
    });
  } catch (error) {
    console.error('[AUTH] /me - Error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
});

export default router;
