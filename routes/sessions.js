const express = require('express');
const { body, validationResult } = require('express-validator');
const { Session, Sport, User } = require('../models');
const { ensureAuthenticated, ensurePlayer } = require('../middleware/auth');

const router = express.Router();

// All session routes require authentication and player role (or admin)
router.use(ensureAuthenticated, ensurePlayer);

// Create session form
router.get('/new', async (req, res) => {
  try {
    const sports = await Sport.findAll({
      order: [['name', 'ASC']]
    });

    res.render('sessions/create', {
      title: 'Create New Session',
      sports
    });
  } catch (error) {
    console.error('Create session form error:', error);
    req.flash('error', 'Error loading create session form');
    res.redirect('/player/dashboard');
  }
});

// Create session POST
router.post('/',
  [
    body('sportId')
      .isInt({ min: 1 })
      .withMessage('Please select a valid sport'),
    body('date')
      .isISO8601({ strict: true, strictSeparator: true })
      .withMessage('Please enter a valid date')
      .custom((date) => {
        const sessionDate = new Date(date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (sessionDate < today) {
          throw new Error('Session date must be in the future');
        }
        return true;
      }),
    body('time')
      .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
      .withMessage('Please enter a valid time in HH:MM format'),
    body('venue')
      .trim()
      .isLength({ min: 2, max: 200 })
      .withMessage('Venue must be between 2 and 200 characters'),
    body('playersNeeded')
      .isInt({ min: 1, max: 50 })
      .withMessage('Players needed must be between 1 and 50')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        req.flash('error', errors.array()[0].msg);
        return res.redirect('/sessions/new');
      }

      const { sportId, date, time, venue, playersNeeded } = req.body;

      // Verify sport exists
      const sport = await Sport.findByPk(sportId);
      if (!sport) {
        req.flash('error', 'Selected sport not found');
        return res.redirect('/sessions/new');
      }

      // Create session
      const session = await Session.create({
        sportId: parseInt(sportId),
        creatorId: req.user.id,
        date,
        time,
        venue: venue.trim(),
        playersNeeded: parseInt(playersNeeded)
      });

      req.flash('success', `${sport.name} session created successfully!`);
      res.redirect('/player/dashboard');
    } catch (error) {
      console.error('Create session error:', error);
      req.flash('error', 'Error creating session');
      res.redirect('/sessions/new');
    }
  }
);

// View session details
router.get('/:id', async (req, res) => {
  try {
    const session = await Session.findByPk(req.params.id, {
      include: ['sport', 'creator', 'players']
    });

    if (!session) {
      req.flash('error', 'Session not found');
      return res.redirect('/player/dashboard');
    }

    // Check if current user has joined
    const hasJoined = await session.hasUserJoined(req.user.id);
    const availableSlots = await session.getAvailableSlots();
    const isOwner = session.creatorId === req.user.id;
    const canJoin = !session.isPast() && !hasJoined && !isOwner && availableSlots > 0 && session.status === 'active';

    res.render('sessions/view', {
      title: `${session.sport.name} Session Details`,
      session,
      hasJoined,
      availableSlots,
      isOwner,
      canJoin,
      formattedDateTime: session.getFormattedDateTime()
    });
  } catch (error) {
    console.error('View session error:', error);
    req.flash('error', 'Error loading session details');
    res.redirect('/player/dashboard');
  }
});

// Edit session form (only for creators)
router.get('/:id/edit', async (req, res) => {
  try {
    const session = await Session.findByPk(req.params.id, {
      include: ['sport']
    });

    if (!session) {
      req.flash('error', 'Session not found');
      return res.redirect('/player/dashboard');
    }

    // Check if user is the creator or admin
    if (session.creatorId !== req.user.id && req.user.role !== 'admin') {
      req.flash('error', 'You can only edit your own sessions');
      return res.redirect('/player/dashboard');
    }

    // Can't edit past sessions
    if (session.isPast()) {
      req.flash('error', 'Cannot edit past sessions');
      return res.redirect('/player/dashboard');
    }

    const sports = await Sport.findAll({
      order: [['name', 'ASC']]
    });

    res.render('sessions/edit', {
      title: 'Edit Session',
      session,
      sports
    });
  } catch (error) {
    console.error('Edit session form error:', error);
    req.flash('error', 'Error loading edit form');
    res.redirect('/player/dashboard');
  }
});

// Update session
router.put('/:id',
  [
    body('sportId')
      .isInt({ min: 1 })
      .withMessage('Please select a valid sport'),
    body('date')
      .isISO8601()
      .withMessage('Please enter a valid date')
      .custom((date) => {
        const sessionDate = new Date(date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (sessionDate < today) {
          throw new Error('Session date must be in the future');
        }
        return true;
      }),
    body('time')
      .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
      .withMessage('Please enter a valid time in HH:MM format'),
    body('venue')
      .trim()
      .isLength({ min: 2, max: 200 })
      .withMessage('Venue must be between 2 and 200 characters'),
    body('playersNeeded')
      .isInt({ min: 1, max: 50 })
      .withMessage('Players needed must be between 1 and 50')
  ],
  async (req, res) => {
    try {
      const session = await Session.findByPk(req.params.id, {
        include: ['players', 'sport']
      });

      if (!session) {
        req.flash('error', 'Session not found');
        return res.redirect('/player/dashboard');
      }

      // Check if user is the creator or admin
      if (session.creatorId !== req.user.id && req.user.role !== 'admin') {
        req.flash('error', 'You can only edit your own sessions');
        return res.redirect('/player/dashboard');
      }

      // Can't edit past sessions
      if (session.isPast()) {
        req.flash('error', 'Cannot edit past sessions');
        return res.redirect('/player/dashboard');
      }

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        req.flash('error', errors.array()[0].msg);
        return res.redirect(`/sessions/${req.params.id}/edit`);
      }

      const { sportId, date, time, venue, playersNeeded } = req.body;

      // Check if reducing players needed below current joined count
      const currentPlayerCount = session.players.length;
      if (parseInt(playersNeeded) < currentPlayerCount) {
        req.flash('error', `Cannot reduce players needed below current joined count (${currentPlayerCount})`);
        return res.redirect(`/sessions/${req.params.id}/edit`);
      }

      // Update session
      await session.update({
        sportId: parseInt(sportId),
        date,
        time,
        venue: venue.trim(),
        playersNeeded: parseInt(playersNeeded)
      });

      req.flash('success', 'Session updated successfully!');
      res.redirect(`/sessions/${session.id}`);
    } catch (error) {
      console.error('Update session error:', error);
      req.flash('error', 'Error updating session: ' + error.message);
      res.redirect(`/sessions/${req.params.id}/edit`);
    }
  }
);

// Cancel session form
router.get('/:id/cancel', async (req, res) => {
  try {
    const session = await Session.findByPk(req.params.id, {
      include: ['sport', 'players']
    });

    if (!session) {
      req.flash('error', 'Session not found');
      return res.redirect('/player/dashboard');
    }

    // Check if user is the creator or admin
    if (session.creatorId !== req.user.id && req.user.role !== 'admin') {
      req.flash('error', 'You can only cancel your own sessions');
      return res.redirect('/player/dashboard');
    }

    // Can't cancel past sessions
    if (session.isPast()) {
      req.flash('error', 'Cannot cancel past sessions');
      return res.redirect('/player/dashboard');
    }

    // Already cancelled
    if (session.status === 'cancelled') {
      req.flash('error', 'Session is already cancelled');
      return res.redirect('/player/dashboard');
    }

    res.render('sessions/cancel', {
      title: 'Cancel Session',
      session
    });
  } catch (error) {
    console.error('Cancel session form error:', error);
    req.flash('error', 'Error loading cancel form');
    res.redirect('/player/dashboard');
  }
});

// Cancel session POST
router.post('/:id/cancel',
  [
    body('reason')
      .trim()
      .isLength({ min: 10, max: 500 })
      .withMessage('Cancellation reason must be between 10 and 500 characters')
  ],
  async (req, res) => {
    try {
      const session = await Session.findByPk(req.params.id, {
        include: ['sport']
      });

      if (!session) {
        req.flash('error', 'Session not found');
        return res.redirect('/player/dashboard');
      }

      // Check if user is the creator or admin
      if (session.creatorId !== req.user.id && req.user.role !== 'admin') {
        req.flash('error', 'You can only cancel your own sessions');
        return res.redirect('/player/dashboard');
      }

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        req.flash('error', errors.array()[0].msg);
        return res.redirect(`/sessions/${req.params.id}/cancel`);
      }

      // Cancel the session
      await session.cancelSession(req.body.reason.trim());

      req.flash('success', `${session.sport.name} session cancelled successfully`);
      res.redirect('/player/dashboard');
    } catch (error) {
      console.error('Cancel session error:', error);
      req.flash('error', 'Error cancelling session');
      res.redirect('/player/dashboard');
    }
  }
);

// Add this temporary route to your sessions.js
router.post('/:id/update', async (req, res) => {
  console.log('🚀 FALLBACK POST ROUTE HIT');
  try {
      const session = await Session.findByPk(req.params.id, {
        include: ['players', 'sport']
      });

      if (!session) {
        req.flash('error', 'Session not found');
        return res.redirect('/player/dashboard');
      }

      // Check if user is the creator or admin
      if (session.creatorId !== req.user.id && req.user.role !== 'admin') {
        req.flash('error', 'You can only edit your own sessions');
        return res.redirect('/player/dashboard');
      }

      // Can't edit past sessions
      if (session.isPast()) {
        req.flash('error', 'Cannot edit past sessions');
        return res.redirect('/player/dashboard');
      }

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        req.flash('error', errors.array()[0].msg);
        return res.redirect(`/sessions/${req.params.id}/edit`);
      }

      const { sportId, date, time, venue, playersNeeded } = req.body;

      // Check if reducing players needed below current joined count
      const currentPlayerCount = session.players.length;
      if (parseInt(playersNeeded) < currentPlayerCount) {
        req.flash('error', `Cannot reduce players needed below current joined count (${currentPlayerCount})`);
        return res.redirect(`/sessions/${req.params.id}/edit`);
      }

      // Update session
      await session.update({
        sportId: parseInt(sportId),
        date,
        time,
        venue: venue.trim(),
        playersNeeded: parseInt(playersNeeded)
      });

      req.flash('success', 'Session updated successfully!');
      res.redirect(`/sessions/${session.id}`);
    } catch (error) {
      console.error('Update session error:', error);
      req.flash('error', 'Error updating session: ' + error.message);
      res.redirect(`/sessions/${req.params.id}/edit`);
    }
  }
);

// Cancel session form
router.get('/:id/cancel', async (req, res) => {
  try {
    const session = await Session.findByPk(req.params.id, {
      include: ['sport', 'players']
    });

    if (!session) {
      req.flash('error', 'Session not found');
      return res.redirect('/player/dashboard');
    }

    // Check if user is the creator or admin
    if (session.creatorId !== req.user.id && req.user.role !== 'admin') {
      req.flash('error', 'You can only cancel your own sessions');
      return res.redirect('/player/dashboard');
    }

    // Can't cancel past sessions
    if (session.isPast()) {
      req.flash('error', 'Cannot cancel past sessions');
      return res.redirect('/player/dashboard');
    }

    // Already cancelled
    if (session.status === 'cancelled') {
      req.flash('error', 'Session is already cancelled');
      return res.redirect('/player/dashboard');
    }

    res.render('sessions/cancel', {
      title: 'Cancel Session',
      session
    });
  } catch (error) {
    console.error('Cancel session form error:', error);
    req.flash('error', 'Error loading cancel form');
    res.redirect('/player/dashboard');
  }
});
module.exports = router;