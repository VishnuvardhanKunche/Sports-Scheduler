// middleware/auth.js
// Safer auth middleware with defensive checks and clear owner-id comparison.

const safeIsAuthenticated = (req) => {
  // Passport attaches isAuthenticated; if not present, fall back to checking req.user
  return (typeof req.isAuthenticated === 'function') ? req.isAuthenticated() : !!req.user;
};

const ensureAuthenticated = (req, res, next) => {
  if (safeIsAuthenticated(req)) {
    return next();
  }
  req.flash('error', 'Please log in to access this page');
  return res.redirect('/auth/login');
};

const ensureNotAuthenticated = (req, res, next) => {
  if (!safeIsAuthenticated(req)) {
    return next();
  }

  // Redirect based on user role (defensive: req.user may be missing)
  const role = req.user && req.user.role;
  if (role === 'admin') {
    return res.redirect('/admin/dashboard');
  } else {
    return res.redirect('/player/dashboard');
  }
};

const ensureAdmin = (req, res, next) => {
  if (safeIsAuthenticated(req) && req.user && req.user.role === 'admin') {
    return next();
  }
  req.flash('error', 'Access denied. Admin privileges required.');
  return res.redirect('/');
};

const ensurePlayer = (req, res, next) => {
  if (safeIsAuthenticated(req) && req.user && (req.user.role === 'player' || req.user.role === 'admin')) {
    return next();
  }
  req.flash('error', 'Access denied. Player account required.');
  return res.redirect('/');
};

const ensureAdminOrOwner = (ownerIdField = 'creatorId') => {
  return (req, res, next) => {
    if (!safeIsAuthenticated(req)) {
      req.flash('error', 'Please log in to access this page');
      return res.redirect('/auth/login');
    }

    // Admin can access everything
    if (req.user && req.user.role === 'admin') {
      return next();
    }

    // Check if user owns the resource (coerce to string to avoid type mismatch)
    const resourceOwnerId = req.resource ? req.resource[ownerIdField] : null;
    if (resourceOwnerId && req.user && String(resourceOwnerId) === String(req.user.id)) {
      return next();
    }

    req.flash('error', 'Access denied. You can only modify your own resources.');
    // 'back' sometimes isn't reliable; fall back to dashboard if referer missing
    return res.redirect(req.get('Referrer') || '/player/dashboard');
  };
};

module.exports = {
  ensureAuthenticated,
  ensureNotAuthenticated,
  ensureAdmin,
  ensurePlayer,
  ensureAdminOrOwner
};
