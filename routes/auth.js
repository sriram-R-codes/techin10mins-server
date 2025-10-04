const express = require('express')
const { body } = require('express-validator')
const {
  register,
  login,
  getMe,
  updateProfile,
  changePassword,
  toggleLikeArticle,
  saveArticle,
  unsaveArticle,
  getSavedArticles,
  getArticlesStatus
} = require('../controllers/authController')
const { protect } = require('../middleware/auth')

const router = express.Router()

// Validation rules
const registerValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('role')
    .optional()
    .isIn(['admin', 'author', 'user'])
    .withMessage('Role must be admin, author, or user')
]

const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
]

const updateProfileValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('bio')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Bio cannot be more than 500 characters')
]

const changePasswordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long')
]

const articleIdValidation = [
  body('articleId')
    .isMongoId()
    .withMessage('Invalid article ID')
]

// @route   POST /api/auth/register
// @desc    Register user
// @access  Public
router.post('/register', registerValidation, register)

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', loginValidation, login)

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', protect, getMe)

// @route   PUT /api/auth/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', protect, updateProfileValidation, updateProfile)

// @route   PUT /api/auth/change-password
// @desc    Change user password
// @access  Private
router.put('/change-password', protect, changePasswordValidation, changePassword)

// @route   POST /api/auth/articles/:id/like
// @desc    Toggle like on article
// @access  Private
router.post('/articles/:id/like', protect, toggleLikeArticle)

// @route   POST /api/auth/articles/save
// @desc    Save article to user's saved articles
// @access  Private
router.post('/articles/save', protect, articleIdValidation, saveArticle)

// @route   DELETE /api/auth/articles/:id/save
// @desc    Remove article from user's saved articles
// @access  Private
router.delete('/articles/:id/save', protect, unsaveArticle)

// @route   GET /api/auth/articles/saved
// @desc    Get user's saved articles
// @access  Private
router.get('/articles/saved', protect, getSavedArticles)

// @route   GET /api/auth/articles/status
// @desc    Get user's interaction status for articles
// @access  Private
router.get('/articles/status', protect, getArticlesStatus)

module.exports = router
