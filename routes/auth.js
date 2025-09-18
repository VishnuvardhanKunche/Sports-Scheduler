const express = require('express');
const passport = require('passport');
const { body, validationResult } = require('express-validator');
const { User } = require('../models');
const { ensureNotAuthenticated } = require('../middleware/auth');

const router = express.Router();

// Login page
router.get('/login', ensureNotAuthenticated, (req, res) => {
  res.render('auth/login', {
    title: 'Login - Sports Scheduler'
  });
});

// Login POST
router.post('/login', 
  ensureNotAuthenticated,
  [
    body('email').isEmail().normalizeEmail().withMessage('Please enter a valid email'),
    body('password').notEmpty().withMessage('Password is required')
  ],
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      req.flash('error', errors.array()[0].msg);
      return res.redirect('/auth/login');
    }
    
    passport.authenticate('local', (err, user, info) => {
      if (err) {
        console.error('Login error:', err);
        req.flash('error', 'Something went wrong. Please try again.');
        return res.redirect('/auth/login');
      }
      
      if (!user) {
        req.flash('error', info.message || 'Invalid credentials');
        return res.redirect('/auth/login');
      }
      
      req.logIn(user, (err) => {
        if (err) {
          console.error('Login session error:', err);
          req.flash('error', 'Login failed. Please try again.');
          return res.redirect('/auth/login');
        }
        
        req.flash('success', `Welcome back, ${user.name}!`);
        
        // Redirect based on user role
        if (user.role === 'admin') {
          return res.redirect('/admin/dashboard');
        } else {
          return res.redirect('/player/dashboard');
        }
      });
    })(req, res, next);
  }
);

// Signup page
router.get('/signup', ensureNotAuthenticated, (req, res) => {
  res.render('auth/signup', {
    title: 'Sign Up - Sports Scheduler'
  });
});

// Signup POST
router.post('/signup',
  ensureNotAuthenticated,
  [
    body('name')
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Name must be between 2 and 100 characters'),
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Please enter a valid email')
      .custom(async (email) => {
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
          throw new Error('Email already in use');
        }
      }),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters long'),
    body('confirmPassword')
      .custom((value, { req }) => {
        if (value !== req.body.password) {
          throw new Error('Passwords do not match');
        }
        return true;
      }),
    body('role')
      .isIn(['player', 'admin'])
      .withMessage('Please select a valid role')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        req.flash('error', errors.array()[0].msg);
        return res.redirect('/auth/signup');
      }
      
      const { name, email, password, role } = req.body;
      
      // Create new user
      const user = await User.createUser({
        name: name.trim(),
        email: email.toLowerCase(),
        password,
        role
      });
      
      // Auto-login after signup
      req.logIn(user, (err) => {
        if (err) {
          console.error('Auto-login error:', err);
          req.flash('success', 'Account created successfully! Please log in.');
          return res.redirect('/auth/login');
        }
        
        req.flash('success', `Welcome to Sports Scheduler, ${user.name}!`);
        
        // Redirect based on user role
        if (user.role === 'admin') {
          return res.redirect('/admin/dashboard');
        } else {
          return res.redirect('/player/dashboard');
        }
      });
      
    } catch (error) {
      console.error('Signup error:', error);
      if (error.name === 'SequelizeUniqueConstraintError') {
        req.flash('error', 'Email already in use');
      } else if (error.name === 'SequelizeValidationError') {
        req.flash('error', error.errors[0].message);
      } else {
        req.flash('error', 'Something went wrong. Please try again.');
      }
      res.redirect('/auth/signup');
    }
  }
);

// Logout
router.post('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      console.error('Logout error:', err);
    }
    req.flash('success', 'You have been logged out successfully');
    res.redirect('/');
  });
});

module.exports = router;