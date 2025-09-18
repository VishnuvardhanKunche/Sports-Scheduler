const express = require('express');
const { Session, Sport, User } = require('../models');
const { ensureAuthenticated, ensurePlayer } = require('../middleware/auth');
const { Op } = require('sequelize');

const router = express.Router();

// All player routes require authentication and player role (or admin)
router.use(ensureAuthenticated, ensurePlayer);

// Player dashboard
router.get('/dashboard', async (req, res) => {
  try {
    const [createdSessions, joinedSessions, availableSessions] = await Promise.all([
      // Sessions created by this user
      Session.findAll({
        where: { creatorId: req.user.id },
        include: ['sport', 'players'],
        order: [['date', 'ASC'], ['time', 'ASC']]
      }),
      // Sessions joined by this user
      Session.findAll({
        include: [
          'sport',
          'creator',
          {
            model: User,
            as: 'players',
            where: { id: req.user.id },
            required: true,
            through: { attributes: [] }
          }
        ],
        order: [['date', 'ASC'], ['time', 'ASC']]
      }),
      // Sessions created by others and active
      Session.findAll({
        where: {
          creatorId: { [Op.ne]: req.user.id },
          status: 'active'
        },
        include: ['sport', 'creator', 'players'],
        order: [['date', 'ASC'], ['time', 'ASC']]
      })
    ]);

    // Filter out sessions already joined
    const joinedSessionIds = joinedSessions.map(session => session.id);
    const filteredAvailableSessions = availableSessions.filter(session =>
      !joinedSessionIds.includes(session.id)
    );

    // Separate upcoming and past sessions
    const today = new Date().toISOString().split('T')[0];
    const upcomingCreated = createdSessions.filter(session => session.date >= today);
    const pastCreated = createdSessions.filter(session => session.date < today);
    const upcomingJoined = joinedSessions.filter(session => session.date >= today);
    const pastJoined = joinedSessions.filter(session => session.date < today);

    res.render('player/dashboard', {
      title: 'Player Dashboard',
      upcomingCreated,
      pastCreated,
      upcomingJoined,
      pastJoined,
      availableSessions: filteredAvailableSessions.slice(0, 6) // Show first 6
    });
  } catch (error) {
    console.error('Player dashboard error:', error);
    req.flash('error', 'Error loading dashboard');
    res.redirect('/');
  }
});

// Browse all available sessions
router.get('/sessions', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const offset = (page - 1) * limit;
    const sportFilter = req.query.sport;

    // Only filter by active status, not date
    const whereClause = { status: 'active' };

    // Add sport filter if provided
    const includeClause = ['creator', 'players'];
    if (sportFilter) {
      includeClause.push({
        model: Sport,
        as: 'sport',
        where: { id: sportFilter }
      });
    } else {
      includeClause.push('sport');
    }

    const { count, rows: sessions } = await Session.findAndCountAll({
      where: whereClause,
      include: includeClause,
      order: [['date', 'ASC'], ['time', 'ASC']],
      limit,
      offset
    });

    // Get user's joined sessions to mark them
    const joinedSessions = await Session.findAll({
      include: [{
        model: User,
        as: 'players',
        where: { id: req.user.id },
        required: true,
        through: { attributes: [] }
      }],
      attributes: ['id']
    });
    const joinedSessionIds = joinedSessions.map(s => s.id);

    // Get all sports for filter dropdown
    const sports = await Sport.findAll({ order: [['name', 'ASC']] });

    const totalPages = Math.ceil(count / limit);

    res.render('player/sessions', {
      title: 'Available Sessions',
      sessions,
      joinedSessionIds,
      sports,
      currentSportFilter: sportFilter,
      pagination: {
        currentPage: page,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Sessions browse error:', error);
    req.flash('error', 'Error loading sessions');
    res.redirect('/player/dashboard');
  }
});

// Join a session
router.post('/sessions/:id/join', async (req, res) => {
  try {
    const session = await Session.findByPk(req.params.id, {
      include: ['sport', 'creator', 'players']
    });

    if (!session) {
      req.flash('error', 'Session not found');
      return res.redirect('/player/sessions');
    }

    // Block joining past sessions
    if (session.isPast && session.isPast()) {
      req.flash('error', 'Cannot join past sessions');
      return res.redirect('/player/sessions');
    }

    // Block cancelled sessions
    if (session.status === 'cancelled') {
      req.flash('error', 'Cannot join cancelled sessions');
      return res.redirect('/player/sessions');
    }

    // Prevent joining own session
    if (session.creatorId === req.user.id) {
      req.flash('error', 'You cannot join your own session');
      return res.redirect('/player/sessions');
    }

    // Prevent duplicate join
    if (await session.hasUserJoined(req.user.id)) {
      req.flash('error', 'You have already joined this session');
      return res.redirect('/player/sessions');
    }

    // Prevent joining full sessions
    if (await session.isFull()) {
      req.flash('error', 'This session is full');
      return res.redirect('/player/sessions');
    }

    // Add user to session
    await session.addPlayer(req.user);

    req.flash('success', `Successfully joined ${session.sport.name} session!`);
    res.redirect('/player/dashboard');
  } catch (error) {
    console.error('Join session error:', error);
    req.flash('error', error.message || 'Error joining session');
    res.redirect('/player/sessions');
  }
});

// Leave a session
router.post('/sessions/:id/leave', async (req, res) => {
  try {
    const session = await Session.findByPk(req.params.id, {
      include: ['sport', 'players']
    });

    if (!session) {
      req.flash('error', 'Session not found');
      return res.redirect('/player/dashboard');
    }

    // Check if user has joined this session
    if (!(await session.hasUserJoined(req.user.id))) {
      req.flash('error', 'You have not joined this session');
      return res.redirect('/player/dashboard');
    }

    // Remove user from session
    await session.removePlayer(req.user);

    req.flash('success', `Successfully left ${session.sport.name} session`);
    res.redirect('/player/dashboard');
  } catch (error) {
    console.error('Leave session error:', error);
    req.flash('error', 'Error leaving session');
    res.redirect('/player/dashboard');
  }
});

module.exports = router;
