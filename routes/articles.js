const express = require('express')
const { body, query } = require('express-validator')
const Article = require('../models/Article')
const {
  getArticles,
  getArticle,
  createArticle,
  updateArticle,
  deleteArticle,
  publishArticle,
  unpublishArticle,
  getArticleStats,
  getCategories,
  regenerateExcerpts
} = require('../controllers/articleController')
const { protect, optionalAuth } = require('../middleware/auth')
const { uploadSingle } = require('../middleware/upload')

const router = express.Router()

// Validation rules
const createArticleValidation = [
  body('title')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be between 1 and 200 characters'),
  body('category')
    .optional()
    .custom((value, { req }) => {
      // Only require category for published articles
      if (req.body.status === 'published' && !value) {
        throw new Error('Category is required for published articles')
      }
      // If category is provided, validate it against the schema enum
      if (value) {
        const validCategories = Article.schema.paths.category.enumValues || []
        if (!validCategories.includes(value)) {
          throw new Error(`Invalid category. Must be one of: ${validCategories.join(', ')}`)
        }
      }
      return true
    }),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  body('status')
    .optional()
    .isIn(['draft', 'published', 'archived'])
    .withMessage('Invalid status'),
  body('contentBlocks')
    .optional()
    .isArray()
    .withMessage('Content blocks must be an array'),
  body('editorData')
    .optional()
    .isObject()
    .withMessage('Editor data must be an object'),
  body('seoTitle')
    .optional()
    .isLength({ max: 60 })
    .withMessage('SEO title cannot be more than 60 characters'),
  body('seoDescription')
    .optional()
    .isLength({ max: 160 })
    .withMessage('SEO description cannot be more than 160 characters')
]

const updateArticleValidation = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be between 1 and 200 characters'),
  body('category')
    .optional()
    .custom((value, { req }) => {
      // Only require category for published articles
      if (req.body.status === 'published' && !value) {
        throw new Error('Category is required for published articles')
      }
      // If category is provided, validate it against the schema enum
      if (value) {
        const validCategories = Article.schema.paths.category.enumValues || []
        if (!validCategories.includes(value)) {
          throw new Error(`Invalid category. Must be one of: ${validCategories.join(', ')}`)
        }
      }
      return true
    }),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  body('status')
    .optional()
    .isIn(['draft', 'published', 'archived'])
    .withMessage('Invalid status'),
  body('contentBlocks')
    .optional()
    .isArray()
    .withMessage('Content blocks must be an array'),
  body('editorData')
    .optional()
    .isObject()
    .withMessage('Editor data must be an object'),
  body('seoTitle')
    .optional()
    .isLength({ max: 60 })
    .withMessage('SEO title cannot be more than 60 characters'),
  body('seoDescription')
    .optional()
    .isLength({ max: 160 })
    .withMessage('SEO description cannot be more than 160 characters')
]

const queryValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('status')
    .optional()
    .isIn(['draft', 'published', 'archived'])
    .withMessage('Invalid status'),
  query('category')
    .optional()
    .isIn(['technology', 'lifestyle', 'business', 'health', 'travel', 'food', 'other'])
    .withMessage('Invalid category'),
  query('sort')
    .optional()
    .matches(/^-?[a-zA-Z]+$/)
    .withMessage('Invalid sort parameter')
]

// @route   GET /api/articles
// @desc    Get all articles for current user
// @access  Private
router.get('/', protect, queryValidation, getArticles)

// @route   GET /api/articles/stats
// @desc    Get article statistics
// @access  Private
router.get('/stats', protect, getArticleStats)

// @route   GET /api/articles/categories
// @desc    Get available categories
// @access  Public
router.get('/categories', getCategories)

// @route   POST /api/articles/regenerate-excerpts
// @desc    Regenerate excerpts for all articles
// @access  Private
router.post('/regenerate-excerpts', protect, regenerateExcerpts)

// @route   GET /api/articles/:id
// @desc    Get single article
// @access  Private
router.get('/:id', protect, getArticle)

// @route   POST /api/articles
// @desc    Create new article
// @access  Private
router.post('/', protect, createArticleValidation, createArticle)

// @route   PUT /api/articles/:id
// @desc    Update article
// @access  Private
router.put('/:id', protect, updateArticleValidation, updateArticle)

// @route   DELETE /api/articles/:id
// @desc    Delete article
// @access  Private
router.delete('/:id', protect, deleteArticle)

// @route   PUT /api/articles/:id/publish
// @desc    Publish article
// @access  Private
router.put('/:id/publish', protect, publishArticle)

// @route   PUT /api/articles/:id/unpublish
// @desc    Unpublish article
// @access  Private
router.put('/:id/unpublish', protect, unpublishArticle)

// @route   POST /api/articles/upload-image
// @desc    Upload article image
// @access  Private
router.post('/upload-image', optionalAuth, uploadSingle('image'), (req, res) => {
  try {
    console.log('Upload request received:', req.file)
    console.log('Request body:', req.body)
    console.log('Request headers:', req.headers)
    
    if (!req.file) {
      console.log('No file in request')
      return res.status(400).json({
        success: 0,
        message: 'No image file provided'
      })
    }

    console.log('File uploaded successfully:', req.file.filename)
    
    // Editor.js expects this specific format
    const response = {
      success: 1,
      file: {
        url: `http://localhost:5000/uploads/${req.file.filename}`,
        name: req.file.originalname,
        size: req.file.size
      }
    }
    
    console.log('Sending response:', response)
    res.json(response)
  } catch (error) {
    console.error('Upload image error:', error)
    res.status(500).json({
      success: 0,
      message: 'Server error uploading image'
    })
  }
})

// @route   POST /api/articles/link-preview
// @desc    Get link preview data
// @access  Private
router.post('/link-preview', optionalAuth, async (req, res) => {
  try {
    const { url } = req.body
    
    if (!url) {
      return res.status(400).json({
        success: 0,
        message: 'URL is required'
      })
    }

    // Basic URL validation
    let validUrl
    try {
      validUrl = new URL(url)
    } catch (e) {
      return res.status(400).json({
        success: 0,
        message: 'Invalid URL format'
      })
    }

    // Extract domain for title
    const domain = validUrl.hostname.replace('www.', '')
    
    // Return basic link info with better formatting
    res.json({
      success: 1,
      link: url,
      meta: {
        title: domain.charAt(0).toUpperCase() + domain.slice(1),
        description: `Visit ${domain}`,
        image: {
          url: `https://www.google.com/s2/favicons?domain=${validUrl.hostname}&sz=64`
        }
      }
    })
  } catch (error) {
    console.error('Link preview error:', error)
    res.status(500).json({
      success: 0,
      message: 'Server error getting link preview'
    })
  }
})

// @route   POST /api/articles/upload-image/by-url
// @desc    Accept image URL and return in Editor.js format
// @access  Public (auth optional)
router.post('/upload-image/by-url', optionalAuth, async (req, res) => {
  try {
    const { url } = req.body || {}

    if (!url || typeof url !== 'string') {
      return res.status(400).json({ success: 0, message: 'Valid url is required' })
    }

    // For simplicity, we trust the provided URL. In production you may want to
    // download, validate content-type, and store it instead of hotlinking.
    return res.json({
      success: 1,
      file: {
        url,
      }
    })
  } catch (error) {
    console.error('Upload image by URL error:', error)
    res.status(500).json({ success: 0, message: 'Server error handling image URL' })
  }
})

module.exports = router
