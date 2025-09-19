const requireRole = (requiredRole) => {
  return (req, res, next) => {
    if (!req.isAuthenticated()) {
      req.flash('error', 'Please log in to access this page');
      return res.redirect('/auth/login');
    }

    if (req.user.role !== requiredRole) {
      req.flash('error', `Access denied. ${requiredRole} privileges required.`);
      return res.redirect('back');
    }

    next();
  };
};

const requireAnyRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.isAuthenticated()) {
      req.flash('error', 'Please log in to access this page');
      return res.redirect('/auth/login');
    }

    if (!allowedRoles.includes(req.user.role)) {
      req.flash('error', 'Access denied. Insufficient privileges.');
      return res.redirect('back');
    }

    next();
  };
};

const checkResourceOwnership = (resourceField = 'creatorId') => {
  return async (req, res, next) => {
    if (!req.isAuthenticated()) {
      req.flash('error', 'Please log in to access this page');
      return res.redirect('/auth/login');
    }


    if (req.user.role === 'admin') {
      return next();
    }

    if (req.resource && req.resource[resourceField] === req.user.id) {
      return next();
    }

    req.flash('error', 'Access denied. You can only modify your own resources.');
    return res.redirect('back');
  };
};

module.exports = {
  requireRole,
  requireAnyRole,
  checkResourceOwnership
};