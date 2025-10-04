const jwt = require('jsonwebtoken')
const User = require('../models/User')
const Article = require('../models/Article')
const { validationResult } = require('express-validator')

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
  })
}

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      })
    }

    const { name, email, password, role = 'user' } = req.body

    // Check if user already exists
    const userExists = await User.findOne({ email })
    if (userExists) {
      return res.status(400).json({
        success: false,
        error: 'User already exists with this email'
      })
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      role
    })

    // Generate token
    const token = generateToken(user._id)

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
          bio: user.bio
        },
        token
      },
      message: 'User registered successfully'
    })
  } catch (error) {
    console.error('Register error:', error)
    res.status(500).json({
      success: false,
      error: 'Server error during registration'
    })
  }
}

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      })
    }

    const { email, password } = req.body

    // Check for user and include password
    const user = await User.findOne({ email }).select('+password')
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      })
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        error: 'Account has been deactivated'
      })
    }

    // Check password
    const isMatch = await user.comparePassword(password)
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      })
    }

    // Generate token
    const token = generateToken(user._id)

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
          bio: user.bio
        },
        token
      },
      message: 'Login successful'
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({
      success: false,
      error: 'Server error during login'
    })
  }
}

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('articlesCount')

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
          bio: user.bio,
          articlesCount: user.articlesCount
        }
      }
    })
  } catch (error) {
    console.error('Get me error:', error)
    res.status(500).json({
      success: false,
      error: 'Server error getting user profile'
    })
  }
}

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = async (req, res) => {
  try {
    const { name, bio, avatar } = req.body
    const userId = req.user.id

    const user = await User.findByIdAndUpdate(
      userId,
      { name, bio, avatar },
      { new: true, runValidators: true }
    )

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
          bio: user.bio
        }
      },
      message: 'Profile updated successfully'
    })
  } catch (error) {
    console.error('Update profile error:', error)
    res.status(500).json({
      success: false,
      error: 'Server error updating profile'
    })
  }
}

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body
    const userId = req.user.id

    // Get user with password
    const user = await User.findById(userId).select('+password')

    // Check current password
    const isMatch = await user.comparePassword(currentPassword)
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        error: 'Current password is incorrect'
      })
    }

    // Update password
    user.password = newPassword
    await user.save()

    res.json({
      success: true,
      message: 'Password changed successfully'
    })
  } catch (error) {
    console.error('Change password error:', error)
    res.status(500).json({
      success: false,
      error: 'Server error changing password'
    })
  }
}

// @desc    Toggle like on article
// @route   POST /api/auth/articles/:id/like
// @access  Private
const toggleLikeArticle = async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.id

    const article = await Article.findOne({
      _id: id,
      status: 'published'
    })

    if (!article) {
      return res.status(404).json({
        success: false,
        error: 'Article not found'
      })
    }

    // Check if user has already liked this article
    const hasLiked = article.likedBy.includes(userId)
    
    if (hasLiked) {
      // Unlike: remove user from likedBy array and decrement likes
      article.likedBy = article.likedBy.filter(id => id.toString() !== userId.toString())
      article.likes = Math.max(0, article.likes - 1)
    } else {
      // Like: add user to likedBy array and increment likes
      article.likedBy.push(userId)
      article.likes += 1
    }

    await article.save()

    res.json({
      success: true,
      data: { 
        likes: article.likes,
        liked: !hasLiked // Return the new liked status
      },
      message: hasLiked ? 'Article unliked successfully' : 'Article liked successfully'
    })
  } catch (error) {
    console.error('Toggle like article error:', error)
    res.status(500).json({
      success: false,
      error: 'Server error toggling like'
    })
  }
}

// @desc    Save article to user's saved articles
// @route   POST /api/auth/articles/save
// @access  Private
const saveArticle = async (req, res) => {
  try {
    const { articleId } = req.body
    const userId = req.user.id

    // Check if article exists and is published
    const article = await Article.findOne({
      _id: articleId,
      status: 'published'
    })

    if (!article) {
      return res.status(404).json({
        success: false,
        error: 'Article not found or not published'
      })
    }

    // Add article to user's saved articles if not already saved
    const user = await User.findById(userId)
    const wasAlreadySaved = user.savedArticles.includes(articleId)
    
    if (!wasAlreadySaved) {
      user.savedArticles.push(articleId)
      await user.save()
    }

    res.json({
      success: true,
      data: {
        saved: true,
        wasAlreadySaved
      },
      message: wasAlreadySaved ? 'Article already saved' : 'Article saved successfully'
    })
  } catch (error) {
    console.error('Save article error:', error)
    res.status(500).json({
      success: false,
      error: 'Server error saving article'
    })
  }
}

// @desc    Remove article from user's saved articles
// @route   DELETE /api/auth/articles/:id/save
// @access  Private
const unsaveArticle = async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.id

    // Remove article from user's saved articles
    const user = await User.findById(userId)
    const wasSaved = user.savedArticles.includes(id)
    
    user.savedArticles = user.savedArticles.filter(
      articleId => articleId.toString() !== id
    )
    await user.save()

    res.json({
      success: true,
      data: {
        saved: false,
        wasSaved
      },
      message: wasSaved ? 'Article removed from saved articles' : 'Article was not saved'
    })
  } catch (error) {
    console.error('Unsave article error:', error)
    res.status(500).json({
      success: false,
      error: 'Server error removing article from saved'
    })
  }
}

// @desc    Get user's saved articles
// @route   GET /api/auth/articles/saved
// @access  Private
const getSavedArticles = async (req, res) => {
  try {
    const userId = req.user.id
    const { page = 1, limit = 10 } = req.query

    const user = await User.findById(userId).populate({
      path: 'savedArticles',
      match: { status: 'published' },
      options: {
        sort: { publishedAt: -1 },
        skip: (parseInt(page) - 1) * parseInt(limit),
        limit: parseInt(limit)
      },
      populate: {
        path: 'author',
        select: 'name email avatar bio'
      }
    })

    // Get total count of saved articles
    const totalSaved = await Article.countDocuments({
      _id: { $in: user.savedArticles },
      status: 'published'
    })

    res.json({
      success: true,
      data: {
        articles: user.savedArticles,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalSaved / parseInt(limit)),
          totalItems: totalSaved,
          itemsPerPage: parseInt(limit)
        }
      }
    })
  } catch (error) {
    console.error('Get saved articles error:', error)
    res.status(500).json({
      success: false,
      error: 'Server error getting saved articles'
    })
  }
}

// @desc    Get user's interaction status for articles
// @route   GET /api/auth/articles/status
// @access  Private
const getArticlesStatus = async (req, res) => {
  try {
    const userId = req.user.id
    const { articleIds } = req.query

    if (!articleIds) {
      return res.status(400).json({
        success: false,
        error: 'Article IDs are required'
      })
    }

    const ids = Array.isArray(articleIds) ? articleIds : articleIds.split(',')
    
    // Get user's saved articles
    const user = await User.findById(userId).select('savedArticles')
    const savedArticleIds = user.savedArticles.map(id => id.toString())

    // Get articles with likedBy information
    const articles = await Article.find({
      _id: { $in: ids },
      status: 'published'
    }).select('_id likedBy')

    const status = articles.map(article => ({
      articleId: article._id.toString(),
      liked: article.likedBy.includes(userId),
      saved: savedArticleIds.includes(article._id.toString())
    }))

    res.json({
      success: true,
      data: { status }
    })
  } catch (error) {
    console.error('Get articles status error:', error)
    res.status(500).json({
      success: false,
      error: 'Server error getting articles status'
    })
  }
}

module.exports = {
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
}
