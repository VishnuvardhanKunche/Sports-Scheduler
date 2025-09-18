const express = require('express');
const { body, validationResult } = require('express-validator');
const { Sport, Session, User } = require('../models');
const { ensureAuthenticated, ensureAdmin } = require('../middleware/auth');
const { Op } = require('sequelize');

const router = express.Router();

// All admin routes require authentication and admin role
router.use(ensureAuthenticated, ensureAdmin);

// Admin dashboard
router.get('/dashboard', async (req, res) => {
  try {
    const [mySports, upcomingSessions, totalPlayers, totalSessions] = await Promise.all([
      Sport.findAll({
        where: { adminId: req.user.id },
        include: [{
          model: Session,
          as: 'sessions',
          required: false
        }],
        order: [['createdAt', 'DESC']]
      }),
      Session.findAll({
        where: {
          status: 'active',
          date: {
            [Op.gte]: new Date().toISOString().split('T')[0]
          }
        },
        include: ['sport', 'creator', 'players'],
        limit: 5,
        order: [['date', 'ASC'], ['time', 'ASC']]
      }),
      User.count({ where: { role: 'player' } }),
      Session.count()
    ]);

    res.render('admin/dashboard', {
      title: 'Admin Dashboard',
      mySports,
      upcomingSessions,
      stats: {
        totalSports: mySports.length,
        totalPlayers,
        totalSessions
      }
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    req.flash('error', 'Error loading dashboard');
    res.redirect('/');
  }
});

// Sports management page
router.get('/sports', async (req, res) => {
  try {
    const sports = await Sport.findAll({
      where: { adminId: req.user.id },
      include: [{
        model: Session,
        as: 'sessions',
        required: false,
        include: ['players']
      }],
      order: [['name', 'ASC']]
    });

    res.render('admin/sports', {
      title: 'Manage Sports',
      sports
    });
  } catch (error) {
    console.error('Sports page error:', error);
    req.flash('error', 'Error loading sports');
    res.redirect('/admin/dashboard');
  }
});

// Create sport form
router.get('/sports/new', (req, res) => {
  res.render('admin/create-sport', {
    title: 'Create New Sport'
  });
});

// Create sport POST
router.post('/sports',
  [
    body('name')
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('Sport name must be between 2 and 50 characters')
      .custom(async (name, { req }) => {
        const existingSport = await Sport.findOne({
          where: { 
            name: name.trim(),
            adminId: req.user.id
          }
        });
        if (existingSport) {
          throw new Error('You have already created a sport with this name');
        }
      })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        req.flash('error', errors.array()[0].msg);
        return res.redirect('/admin/sports/new');
      }

      const sport = await Sport.create({
        name: req.body.name.trim(),
        adminId: req.user.id
      });

      req.flash('success', `Sport "${sport.name}" created successfully!`);
      res.redirect('/admin/sports');
    } catch (error) {
      console.error('Create sport error:', error);
      req.flash('error', 'Error creating sport');
      res.redirect('/admin/sports/new');
    }
  }
);

// Edit sport form
router.get('/sports/:id/edit', async (req, res) => {
  try {
    const sport = await Sport.findOne({
      where: { 
        id: req.params.id,
        adminId: req.user.id
      }
    });

    if (!sport) {
      req.flash('error', 'Sport not found');
      return res.redirect('/admin/sports');
    }

    res.render('admin/edit-sport', {
      title: `Edit ${sport.name}`,
      sport
    });
  } catch (error) {
    console.error('Edit sport form error:', error);
    req.flash('error', 'Error loading sport');
    res.redirect('/admin/sports');
  }
});

// Update sport
router.put('/sports/:id',
  [
    body('name')
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('Sport name must be between 2 and 50 characters')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        req.flash('error', errors.array()[0].msg);
        return res.redirect(`/admin/sports/${req.params.id}/edit`);
      }

      const sport = await Sport.findOne({
        where: { 
          id: req.params.id,
          adminId: req.user.id
        }
      });

      if (!sport) {
        req.flash('error', 'Sport not found');
        return res.redirect('/admin/sports');
      }

      await sport.update({
        name: req.body.name.trim()
      });

      req.flash('success', `Sport "${sport.name}" updated successfully!`);
      res.redirect('/admin/sports');
    } catch (error) {
      console.error('Update sport error:', error);
      req.flash('error', 'Error updating sport');
      res.redirect('/admin/sports');
    }
  }
);

// ✅ Admin - View ALL sessions (not just upcoming)
router.get('/sessions', async (req, res) => {
  try {
    const sessions = await Session.findAll({
      include: ['sport', 'creator', 'players'],
      order: [['date', 'DESC'], ['time', 'DESC']]
    });

    res.render('admin/sessions', {
      title: 'All Sessions',
      sessions
    });
  } catch (error) {
    console.error('Admin sessions error:', error);
    req.flash('error', 'Error loading sessions');
    res.redirect('/admin/dashboard');
  }
});

// Reports page
router.get('/reports', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Default to last 30 days if no dates provided
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    // Get sessions in date range
    const sessions = await Session.findAll({
      where: {
        date: {
          [Op.between]: [start.toISOString().split('T')[0], end.toISOString().split('T')[0]]
        }
      },
      include: ['sport', 'creator', 'players'],
      order: [['date', 'DESC']]
    });

    // Calculate sport popularity
    const sportStats = {};
    sessions.forEach(session => {
      const sportName = session.sport.name;
      if (!sportStats[sportName]) {
        sportStats[sportName] = {
          name: sportName,
          sessionCount: 0,
          totalPlayers: 0
        };
      }
      sportStats[sportName].sessionCount++;
      sportStats[sportName].totalPlayers += session.players.length;
    });

    const sportPopularity = Object.values(sportStats).sort((a, b) => b.sessionCount - a.sessionCount);

    res.render('admin/reports', {
      title: 'Session Reports',
      sessions,
      sportPopularity,
      dateRange: {
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0]
      },
      stats: {
        totalSessions: sessions.length,
        activeSessions: sessions.filter(s => s.status === 'active').length,
        cancelledSessions: sessions.filter(s => s.status === 'cancelled').length,
        totalUniquePlayers: new Set(sessions.flatMap(s => s.players.map(p => p.id))).size
      }
    });
  } catch (error) {
    console.error('Reports error:', error);
    req.flash('error', 'Error loading reports');
    res.redirect('/admin/dashboard');
  }
});

module.exports = router;
