const express = require('express');
const { Sport, Session, User } = require('../models');
const { ensureAuthenticated } = require('../middleware/auth');

const router = express.Router();

// All sports routes require authentication
router.use(ensureAuthenticated);

// List all sports (for creating sessions)
router.get('/', async (req, res) => {
  try {
    const sports = await Sport.findAll({
      include: [{
        model: Session,
        as: 'sessions',
        required: false,
        where: {
          status: 'active'
        },
        include: ['players']
      }],
      order: [['name', 'ASC']]
    });

    res.render('sports/index', {
      title: 'All Sports',
      sports
    });
  } catch (error) {
    console.error('Sports list error:', error);
    req.flash('error', 'Error loading sports');
    res.redirect('/');
  }
});

// View sport details with its sessions
router.get('/:id', async (req, res) => {
  try {
    const sport = await Sport.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'admin'
        },
        {
          model: Session,
          as: 'sessions',
          include: ['creator', 'players'],
          order: [['date', 'ASC'], ['time', 'ASC']]
        }
      ]
    });

    if (!sport) {
      req.flash('error', 'Sport not found');
      return res.redirect('/sports');
    }

    // Separate upcoming and past sessions
    const today = new Date().toISOString().split('T')[0];
    const upcomingSessions = sport.sessions.filter(session => 
      session.date >= today && session.status === 'active'
    );
    const pastSessions = sport.sessions.filter(session => 
      session.date < today || session.status !== 'active'
    );

    // Check if user has joined any upcoming sessions
    const joinedSessionIds = [];
    if (req.user) {
      const userJoinedSessions = await Session.findAll({
        include: [{
          model: User,
          as: 'players',
          where: { id: req.user.id },
          required: true,
          through: { attributes: [] }
        }],
        attributes: ['id']
      });
      joinedSessionIds.push(...userJoinedSessions.map(s => s.id));
    }

    res.render('sports/view', {
      title: sport.name,
      sport,
      upcomingSessions,
      pastSessions,
      joinedSessionIds
    });
  } catch (error) {
    console.error('Sport details error:', error);
    req.flash('error', 'Error loading sport details');
    res.redirect('/sports');
  }
});

module.exports = router;