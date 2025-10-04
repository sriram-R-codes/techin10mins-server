const jwt = require('jsonwebtoken')
const User = require('../models/User')

// Protect routes - require authentication
const protect = async (req, res, next) => {
  try {
    let token

    // Check for token in headers
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1]
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Access denied. No token provided.'
      })
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      
      // Get user from token
      const user = await User.findById(decoded.id).select('-password')
      
      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Token is no longer valid.'
        })
      }

      if (!user.isActive) {
        return res.status(401).json({
          success: false,
          error: 'Account has been deactivated.'
        })
      }

      req.user = user
      console.log('Auth middleware: User authenticated:', user._id, user.email)
      next()
    } catch (error) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token.'
      })
    }
  } catch (error) {
    console.error('Auth middleware error:', error)
    res.status(500).json({
      success: false,
      error: 'Server error in authentication.'
    })
  }
}

// Grant access to specific roles
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Not authorized to access this route.'
      })
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `User role '${req.user.role}' is not authorized to access this route.`
      })
    }

    next()
  }
}

// Optional auth - doesn't fail if no token
const optionalAuth = async (req, res, next) => {
  try {
    let token

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1]
    }

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        const user = await User.findById(decoded.id).select('-password')
        
        if (user && user.isActive) {
          req.user = user
        }
      } catch (error) {
        // Token is invalid, but we don't fail the request
        console.log('Invalid token in optional auth:', error.message)
      }
    }

    next()
  } catch (error) {
    console.error('Optional auth middleware error:', error)
    next()
  }
}

module.exports = {
  protect,
  authorize,
  optionalAuth
}
