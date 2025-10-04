const Article = require('../models/Article')
const { validationResult } = require('express-validator')

// @desc    Get all articles
// @route   GET /api/articles
// @access  Private
const getArticles = async (req, res) => {
  try {
    const { status, category, page = 1, limit = 10, sort = '-createdAt' } = req.query
    const userId = req.user.id

    // Build query
    let query = { author: userId }
    
    if (status) {
      query.status = status
    }
    
    if (category) {
      query.category = category
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit)

    // Get articles
    const articles = await Article.find(query)
      .populate('author', 'name email avatar')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))

    // Get total count
    const total = await Article.countDocuments(query)

    res.json({
      success: true,
      data: {
        articles,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        }
      }
    })
  } catch (error) {
    console.error('Get articles error:', error)
    res.status(500).json({
      success: false,
      error: 'Server error getting articles'
    })
  }
}

// @desc    Get single article
// @route   GET /api/articles/:id
// @access  Private
const getArticle = async (req, res) => {
  try {
    const article = await Article.findOne({
      _id: req.params.id,
      author: req.user.id
    }).populate('author', 'name email avatar')

    if (!article) {
      return res.status(404).json({
        success: false,
        error: 'Article not found'
      })
    }

    res.json({
      success: true,
      data: { article }
    })
  } catch (error) {
    console.error('Get article error:', error)
    res.status(500).json({
      success: false,
      error: 'Server error getting article'
    })
  }
}

// @desc    Create new article
// @route   POST /api/articles
// @access  Private
const createArticle = async (req, res) => {
  try {
    console.log('=== CREATE ARTICLE START ===')
    console.log('Request body:', req.body)
    console.log('User ID:', req.user?.id)
    
    // Check for validation errors
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array())
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      })
    }

    const {
      title,
      category,
      tags,
      contentBlocks,
      editorData,
      status = 'draft',
      featuredImage,
      seoTitle,
      seoDescription,
      isFeatured = false,
      allowComments = true
    } = req.body

    console.log('Received article data:', {
      title,
      contentBlocks,
      editorData,
      category,
      tags,
      status
    })

    // Create article
    console.log('Creating article with data:', {
      title,
      contentBlocks: contentBlocks || [],
      editorData: editorData,
      status,
      author: req.user.id,
      featuredImage,
      seoTitle,
      seoDescription,
      isFeatured,
      allowComments
    })

    // Prepare article data
    const articleData = {
      title,
      category: category || undefined, // Only include if provided
      tags: tags || [],
      contentBlocks: contentBlocks || [],
      status,
      author: req.user.id,
      featuredImage,
      seoTitle,
      seoDescription,
      isFeatured,
      allowComments
    }

    // Only add editorData if it exists and is not null
    if (editorData && editorData !== null) {
      articleData.editorData = editorData
    }

    console.log('Final article data being saved:', articleData)
    console.log('About to call Article.create...')

    const article = await Article.create(articleData)
    console.log('Article created successfully:', article._id)

    // Populate author info
    await article.populate('author', 'name email avatar')

    res.status(201).json({
      success: true,
      data: { article },
      message: status === 'published' ? 'Article published successfully' : 'Article saved as draft'
    })
  } catch (error) {
    console.error('=== CREATE ARTICLE ERROR ===')
    console.error('Create article error:', error)

    // Handle common Mongoose/DB errors explicitly for better UX
    if (error.name === 'ValidationError') {
      const details = Object.values(error.errors).map((e) => e.message)
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        details,
      })
    }

    if (error.code === 11000) {
      // Likely duplicate slug
      return res.status(400).json({
        success: false,
        error: 'An article with this title already exists. Please use a different title.'
      })
    }

    res.status(500).json({
      success: false,
      error: 'Server error creating article'
    })
  }
}

// @desc    Update article
// @route   PUT /api/articles/:id
// @access  Private
const updateArticle = async (req, res) => {
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

    const {
      title,
      contentBlocks,
      editorData,
      category,
      tags,
      status,
      featuredImage,
      seoTitle,
      seoDescription,
      isFeatured,
      allowComments
    } = req.body

    // Find article
    let article = await Article.findOne({
      _id: req.params.id,
      author: req.user.id
    })

    if (!article) {
      return res.status(404).json({
        success: false,
        error: 'Article not found'
      })
    }

    // Update article
    const updateData = {}
    if (title !== undefined) {
      updateData.title = title
      // Keep slug in sync when title changes (findByIdAndUpdate skips pre-save)
      updateData.slug = title
        .toLowerCase()
        .replace(/[^a-z0-9 -]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim('-')
    }
    if (contentBlocks !== undefined) updateData.contentBlocks = contentBlocks
    if (editorData !== undefined) updateData.editorData = editorData
    if (category !== undefined) updateData.category = category
    if (tags !== undefined) updateData.tags = tags
    if (status !== undefined) {
      updateData.status = status
      if (status === 'published' && !article.publishedAt) {
        updateData.publishedAt = new Date()
      }
      if (status === 'draft') {
        updateData.publishedAt = undefined
      }
    }
    if (featuredImage !== undefined) updateData.featuredImage = featuredImage
    if (seoTitle !== undefined) updateData.seoTitle = seoTitle
    if (seoDescription !== undefined) updateData.seoDescription = seoDescription
    if (isFeatured !== undefined) updateData.isFeatured = isFeatured
    if (allowComments !== undefined) updateData.allowComments = allowComments

    // If content changed, recompute excerpt and readTime (pre-save hooks won't run)
    if (contentBlocks !== undefined || editorData !== undefined) {
      let excerptText = ''
      let fullText = ''

      if (Array.isArray(contentBlocks) && contentBlocks.length > 0) {
        const firstTextBlock = contentBlocks.find(b => b && b.type === 'text' && typeof b.content === 'string')
        if (firstTextBlock) {
          excerptText = firstTextBlock.content
        }
        fullText += ' ' + contentBlocks
          .filter(b => b && b.type === 'text' && typeof b.content === 'string')
          .map(b => b.content)
          .join(' ')
      }

      const edBlocks = editorData?.blocks
      if (!excerptText && Array.isArray(edBlocks) && edBlocks.length > 0) {
        const firstTextBlock = edBlocks.find(b => 
          b && (b.type === 'paragraph' || b.type === 'header') && b.data && typeof b.data.text === 'string'
        )
        if (firstTextBlock) {
          excerptText = firstTextBlock.data.text
        }
      }
      if (Array.isArray(edBlocks) && edBlocks.length > 0) {
        const textBlocks = edBlocks
          .filter(b => b && (b.type === 'paragraph' || b.type === 'header') && b.data && typeof b.data.text === 'string')
          .map(b => b.data.text)
          .join(' ')
        fullText += ' ' + textBlocks
      }

      if (excerptText) {
        updateData.excerpt = `${excerptText.substring(0, 200)}...`
      } else {
        updateData.excerpt = ''
      }

      const wordCount = fullText.trim() ? fullText.trim().split(/\s+/).length : 0
      updateData.readTime = Math.ceil(wordCount / 200)
    }

    article = await Article.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('author', 'name email avatar')

    res.json({
      success: true,
      data: { article },
      message: 'Article updated successfully'
    })
  } catch (error) {
    console.error('Update article error:', error)

    if (error.name === 'ValidationError') {
      const details = Object.values(error.errors).map((e) => e.message)
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        details,
      })
    }

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: 'An article with this title already exists. Please use a different title.'
      })
    }

    res.status(500).json({
      success: false,
      error: 'Server error updating article'
    })
  }
}

// @desc    Delete article
// @route   DELETE /api/articles/:id
// @access  Private
const deleteArticle = async (req, res) => {
  try {
    const article = await Article.findOne({
      _id: req.params.id,
      author: req.user.id
    })

    if (!article) {
      return res.status(404).json({
        success: false,
        error: 'Article not found'
      })
    }

    await Article.findByIdAndDelete(req.params.id)

    res.json({
      success: true,
      message: 'Article deleted successfully'
    })
  } catch (error) {
    console.error('Delete article error:', error)
    res.status(500).json({
      success: false,
      error: 'Server error deleting article'
    })
  }
}

// @desc    Publish article
// @route   PUT /api/articles/:id/publish
// @access  Private
const publishArticle = async (req, res) => {
  try {
    const article = await Article.findOne({
      _id: req.params.id,
      author: req.user.id
    })

    if (!article) {
      return res.status(404).json({
        success: false,
        error: 'Article not found'
      })
    }

    article.status = 'published'
    if (!article.publishedAt) {
      article.publishedAt = new Date()
    }

    await article.save()
    await article.populate('author', 'name email avatar')

    res.json({
      success: true,
      data: { article },
      message: 'Article published successfully'
    })
  } catch (error) {
    console.error('Publish article error:', error)
    res.status(500).json({
      success: false,
      error: 'Server error publishing article'
    })
  }
}

// @desc    Unpublish article
// @route   PUT /api/articles/:id/unpublish
// @access  Private
const unpublishArticle = async (req, res) => {
  try {
    const article = await Article.findOne({
      _id: req.params.id,
      author: req.user.id
    })

    if (!article) {
      return res.status(404).json({
        success: false,
        error: 'Article not found'
      })
    }

    article.status = 'draft'
    await article.save()
    await article.populate('author', 'name email avatar')

    res.json({
      success: true,
      data: { article },
      message: 'Article unpublished successfully'
    })
  } catch (error) {
    console.error('Unpublish article error:', error)
    res.status(500).json({
      success: false,
      error: 'Server error unpublishing article'
    })
  }
}

// @desc    Get article statistics
// @route   GET /api/articles/stats
// @access  Private
const getArticleStats = async (req, res) => {
  try {
    const userId = req.user.id

    const stats = await Article.aggregate([
      { $match: { author: userId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalViews: { $sum: '$views' },
          totalLikes: { $sum: '$likes' }
        }
      }
    ])

    const totalStats = await Article.aggregate([
      { $match: { author: userId } },
      {
        $group: {
          _id: null,
          totalArticles: { $sum: 1 },
          totalViews: { $sum: '$views' },
          totalLikes: { $sum: '$likes' }
        }
      }
    ])

    res.json({
      success: true,
      data: {
        stats,
        totals: totalStats[0] || { totalArticles: 0, totalViews: 0, totalLikes: 0 }
      }
    })
  } catch (error) {
    console.error('Get article stats error:', error)
    res.status(500).json({
      success: false,
      error: 'Server error getting article statistics'
    })
  }
}

// @desc    Get available categories
// @route   GET /api/articles/categories
// @access  Public
const getCategories = async (req, res) => {
  try {
    // Get categories from the Article schema enum
    const categories = Article.schema.paths.category.enumValues
    
    res.json({
      success: true,
      data: {
        categories: categories || []
      }
    })
  } catch (error) {
    console.error('Get categories error:', error)
    res.status(500).json({
      success: false,
      error: 'Server error getting categories'
    })
  }
}

// @desc    Regenerate excerpts for all articles
// @route   POST /api/articles/regenerate-excerpts
// @access  Private
const regenerateExcerpts = async (req, res) => {
  try {
    const articles = await Article.find({})
    let updatedCount = 0
    
    for (const article of articles) {
      // Trigger the pre-save hook by marking editorData as modified
      if (article.editorData) {
        article.markModified('editorData')
        await article.save()
        updatedCount++
      }
    }
    
    res.json({
      success: true,
      message: `Regenerated excerpts for ${updatedCount} articles`
    })
  } catch (error) {
    console.error('Regenerate excerpts error:', error)
    res.status(500).json({
      success: false,
      error: 'Server error regenerating excerpts'
    })
  }
}

module.exports = {
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
}
