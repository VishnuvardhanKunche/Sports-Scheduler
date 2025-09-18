// app.js
const express = require('express');
const path = require('path');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const flash = require('connect-flash');
const methodOverride = require('method-override');
const { User } = require('./models');

const app = express();

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// --- Body parsing middleware (must be before methodOverride) ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- Robust method-override: check body then query (and remove _method from body) ---
app.use(methodOverride(function (req, res) {
  if (req.body && typeof req.body === 'object' && req.body._method) {
    const method = req.body._method;
    delete req.body._method;
    return method;
  }
  if (req.query && req.query._method) {
    return req.query._method;
  }
}));

// Session configuration (must be before connect-flash so flash works)
app.use(session({
  secret: process.env.SESSION_SECRET || 'sports-scheduler-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false, // Set to true in production with HTTPS
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Flash messages
app.use(flash());

// Passport configuration (after session)
app.use(passport.initialize());
app.use(passport.session());

// Passport Local Strategy
passport.use('local', new LocalStrategy(
  { usernameField: 'email' },
  async (email, password, done) => {
    try {
      const user = await User.findOne({ where: { email } });
      if (!user) {
        return done(null, false, { message: 'Invalid email or password' });
      }
      const isValidPassword = await user.checkPassword(password);
      if (!isValidPassword) {
        return done(null, false, { message: 'Invalid email or password' });
      }
      return done(null, user);
    } catch (error) {
      return done(error);
    }
  }
));

// Passport serialization
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findByPk(id);
    done(null, user);
  } catch (error) {
    done(error);
  }
});

// --- Debug logging for /sessions requests (temporary, remove after debug) ---
app.use((req, res, next) => {
  if (req.originalUrl && req.originalUrl.startsWith('/sessions')) {
    console.log('▶ REQUEST /sessions', {
      originalUrl: req.originalUrl,
      method: req.method,
      user: req.user ? { id: req.user.id, email: req.user.email } : null,
      bodyKeys: req.body ? Object.keys(req.body) : undefined
    });
  }
  next();
});

// Global middleware for user and flash messages (locals available in views)
app.use((req, res, next) => {
  res.locals.user = req.user;
  // connect-flash returns arrays
  res.locals.success = req.flash('success') || [];
  res.locals.error = req.flash('error') || [];
  next();
});

// Routes
app.use('/', require('./routes/index'));
app.use('/auth', require('./routes/auth'));
app.use('/admin', require('./routes/admin'));
app.use('/player', require('./routes/player'));
app.use('/sports', require('./routes/sports'));
app.use('/sessions', require('./routes/sessions'));

// 404 handler
app.use((req, res, next) => {
  res.status(404).render('error', {
    title: 'Page Not Found',
    message: 'The page you are looking for does not exist.',
    error: { status: 404 }
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500);
  res.render('error', {
    title: 'Something went wrong',
    message: err.message || 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

module.exports = app;
