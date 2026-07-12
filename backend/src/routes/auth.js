const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { z } = require('zod');
const prisma = require('../utils/db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'assetflow-super-secret-key-12345';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '1h';

// Signup Schema
const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(4, 'Password must be at least 4 characters'),
  departmentId: z.number().nullable().optional()
});

// Login Schema
const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string()
});

// @route   POST /api/auth/signup
// @desc    Register a new user (default role: Employee)
router.post('/signup', async (req, res) => {
  try {
    const data = signupSchema.parse(req.body);
    
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Email address already registered' });
    }

    // Hash the password
    const passwordHash = bcrypt.hashSync(data.password, 10);

    // Create the user
    const newUser = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash,
        role: 'Employee', // Hardcoded default role
        departmentId: data.departmentId || null
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        departmentId: true,
        createdAt: true
      }
    });

    // Create a notification for the signup
    await prisma.notification.create({
      data: {
        userId: newUser.id,
        type: 'info',
        message: `Welcome to AssetFlow, ${newUser.name}! Your Employee account has been created.`
      }
    });

    // Write activity log
    await prisma.activityLog.create({
      data: {
        actorId: newUser.id,
        action: 'USER_SIGNUP',
        entityType: 'User',
        entityId: newUser.id
      }
    });

    // Issue JWT token
    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, role: newUser.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );

    return res.status(201).json({ token, user: newUser });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Signup error:', error);
    return res.status(500).json({ error: 'Internal server error during signup' });
  }
});

// @route   POST /api/auth/login
// @desc    Authenticate user and get token
router.post('/login', async (req, res) => {
  try {
    const data = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email: data.email },
      include: { department: true }
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    // Verify password
    const isMatch = bcrypt.compareSync(data.password, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );

    // Logging login activity
    await prisma.activityLog.create({
      data: {
        actorId: user.id,
        action: 'USER_LOGIN',
        entityType: 'User',
        entityId: user.id
      }
    });

    return res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        departmentId: user.departmentId,
        department: user.department
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error during login' });
  }
});

// @route   GET /api/auth/me
// @desc    Get currently logged in user profile
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { department: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      departmentId: user.departmentId,
      department: user.department
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// @route   POST /api/auth/forgot-password
// @desc    Mock password reset (returns a temporary reset token in payload)
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email address is required.' });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return res.status(404).json({ error: 'No user registered with this email.' });
  }

  const mockToken = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digit code
  return res.json({
    message: 'Reset instructions generated successfully.',
    resetToken: mockToken,
    info: 'DEMO ONLY: Copy this code to reset your password instantly.'
  });
});

// @route   POST /api/auth/reset-password
// @desc    Mock password reset submit
router.post('/reset-password', async (req, res) => {
  const { email, token, newPassword } = req.body;
  if (!email || !token || !newPassword) {
    return res.status(400).json({ error: 'Missing email, code, or new password.' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const hashed = bcrypt.hashSync(newPassword, 10);
    await prisma.user.update({
      where: { email },
      data: { passwordHash: hashed }
    });

    return res.json({ message: 'Password updated successfully! You can now log in.' });
  } catch (error) {
    console.error('Password reset error:', error);
    return res.status(500).json({ error: 'Failed to reset password.' });
  }
});

module.exports = router;
