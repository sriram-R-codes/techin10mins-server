const express = require('express')
const { query, param } = require('express-validator')
const {
  getPublicArticle,
  getPublicArticleById,
  getPublicArticles,
  getFeaturedArticles,
  getPopularArticles,
  getArticlesByCategory,
  getArticlesByAuthor,
  likeArticle
} = require('../controllers/publicController')

const router = express.Router()

// Validation rules
const publicQueryValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('sort')
    .optional()
    .matches(/^-?[a-zA-Z]+$/)
    .withMessage('Invalid sort parameter'),
  query('category')
    .optional()
    .isIn(['technology', 'lifestyle', 'business', 'health', 'travel', 'food', 'other'])
    .withMessage('Invalid category'),
  query('timeframe')
    .optional()
    .isIn(['week', 'month', 'all'])
    .withMessage('Invalid timeframe')
]

const slugValidation = [
  param('slug')
    .isSlug()
    .withMessage('Invalid slug format')
]

const idValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid article ID')
]

const categoryValidation = [
  param('category')
    .isIn(['technology', 'lifestyle', 'business', 'health', 'travel', 'food', 'other'])
    .withMessage('Invalid category')
]

const authorValidation = [
  param('authorId')
    .isMongoId()
    .withMessage('Invalid author ID')
]

// @route   GET /api/public/articles
// @desc    Get all published articles
// @access  Public
router.get('/articles', publicQueryValidation, getPublicArticles)

// @route   GET /api/public/articles/featured
// @desc    Get featured articles
// @access  Public
router.get('/articles/featured', publicQueryValidation, getFeaturedArticles)

// @route   GET /api/public/articles/popular
// @desc    Get popular articles
// @access  Public
router.get('/articles/popular', publicQueryValidation, getPopularArticles)

// @route   GET /api/public/articles/category/:category
// @desc    Get articles by category
// @access  Public
router.get('/articles/category/:category', categoryValidation, publicQueryValidation, getArticlesByCategory)

// @route   GET /api/public/articles/author/:authorId
// @desc    Get articles by author
// @access  Public
router.get('/articles/author/:authorId', authorValidation, publicQueryValidation, getArticlesByAuthor)

// @route   GET /api/public/articles/:slug
// @desc    Get public article by slug
// @access  Public
router.get('/articles/:slug', slugValidation, getPublicArticle)

// @route   GET /api/public/articles/id/:id
// @desc    Get public article by ID
// @access  Public
router.get('/articles/id/:id', idValidation, getPublicArticleById)

// @route   POST /api/public/articles/:id/like
// @desc    Like article
// @access  Public
router.post('/articles/:id/like', idValidation, likeArticle)

module.exports = router
