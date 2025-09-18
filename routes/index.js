const express = require('express');
const router = express.Router();
const { Session, Sport, User } = require('../models');

// Home page
router.get('/', async (req, res) => {
  try {
    // Get some stats for the homepage
    const upcomingSessions = await Session.getUpcomingSessions(6);
    const totalSports = await Sport.count();
    const totalUsers = await User.count({ where: { role: 'player' } });
    
    res.render('index', {
      title: 'Sports Scheduler - Organize Your Game',
      upcomingSessions,
      stats: {
        totalSports,
        totalUsers,
        totalSessions: upcomingSessions.length
      }
    });
  } catch (error) {
    console.error('Homepage error:', error);
    res.render('index', {
      title: 'Sports Scheduler - Organize Your Game',
      upcomingSessions: [],
      stats: { totalSports: 0, totalUsers: 0, totalSessions: 0 }
    });
  }
});

// About page
router.get('/about', (req, res) => {
  res.render('about', {
    title: 'About Sports Scheduler'
  });
});

module.exports = router;