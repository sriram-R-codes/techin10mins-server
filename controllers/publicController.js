const Article = require('../models/Article')

// @desc    Get public article by slug
// @route   GET /api/public/articles/:slug
// @access  Public
const getPublicArticle = async (req, res) => {
  try {
    const { slug } = req.params

    const article = await Article.findOne({
      slug,
      status: 'published'
    }).populate('author', 'name email avatar bio')

    if (!article) {
      return res.status(404).json({
        success: false,
        error: 'Article not found or not published'
      })
    }

    // Increment view count
    article.views += 1
    await article.save()

    res.json({
      success: true,
      data: { article }
    })
  } catch (error) {
    console.error('Get public article error:', error)
    res.status(500).json({
      success: false,
      error: 'Server error getting article'
    })
  }
}

// @desc    Get public article by ID
// @route   GET /api/public/articles/id/:id
// @access  Public
const getPublicArticleById = async (req, res) => {
  try {
    const { id } = req.params

    const article = await Article.findOne({
      _id: id,
      status: 'published'
    }).populate('author', 'name email avatar bio')

    if (!article) {
      return res.status(404).json({
        success: false,
        error: 'Article not found or not published'
      })
    }

    // Increment view count
    article.views += 1
    await article.save()

    console.log('Public article data being returned:', {
      id: article._id,
      title: article.title,
      hasEditorData: !!article.editorData,
      hasContentBlocks: !!article.contentBlocks,
      editorDataBlocks: article.editorData?.blocks?.length || 0,
      contentBlocksLength: article.contentBlocks?.length || 0
    })

    res.json({
      success: true,
      data: { article }
    })
  } catch (error) {
    console.error('Get public article by ID error:', error)
    res.status(500).json({
      success: false,
      error: 'Server error getting article'
    })
  }
}

// @desc    Get all published articles
// @route   GET /api/public/articles
// @access  Public
const getPublicArticles = async (req, res) => {
  try {
    const {
      category,
      tag,
      author,
      page = 1,
      limit = 10,
      sort = '-publishedAt',
      search
    } = req.query

    // Build query
    let query = { status: 'published' }

    if (category) {
      query.category = category
    }

    if (tag) {
      query.tags = { $in: [tag] }
    }

    if (author) {
      query.author = author
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { excerpt: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ]
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit)

    // Get articles
    const articles = await Article.find(query)
      .populate('author', 'name email avatar bio')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .select('-contentBlocks') // Exclude full content for list view

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
    console.error('Get public articles error:', error)
    res.status(500).json({
      success: false,
      error: 'Server error getting articles'
    })
  }
}

// @desc    Get featured articles
// @route   GET /api/public/articles/featured
// @access  Public
const getFeaturedArticles = async (req, res) => {
  try {
    const { limit = 5 } = req.query

    const articles = await Article.find({
      status: 'published',
      isFeatured: true
    })
      .populate('author', 'name email avatar')
      .sort('-publishedAt')
      .limit(parseInt(limit))
      .select('-contentBlocks')

    res.json({
      success: true,
      data: { articles }
    })
  } catch (error) {
    console.error('Get featured articles error:', error)
    res.status(500).json({
      success: false,
      error: 'Server error getting featured articles'
    })
  }
}

// @desc    Get popular articles
// @route   GET /api/public/articles/popular
// @access  Public
const getPopularArticles = async (req, res) => {
  try {
    const { limit = 5, timeframe = 'all' } = req.query

    let dateFilter = {}
    if (timeframe === 'week') {
      dateFilter = {
        publishedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      }
    } else if (timeframe === 'month') {
      dateFilter = {
        publishedAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      }
    }

    const articles = await Article.find({
      status: 'published',
      ...dateFilter
    })
      .populate('author', 'name email avatar')
      .sort('-views -likes')
      .limit(parseInt(limit))
      .select('-contentBlocks')

    res.json({
      success: true,
      data: { articles }
    })
  } catch (error) {
    console.error('Get popular articles error:', error)
    res.status(500).json({
      success: false,
      error: 'Server error getting popular articles'
    })
  }
}

// @desc    Get articles by category
// @route   GET /api/public/articles/category/:category
// @access  Public
const getArticlesByCategory = async (req, res) => {
  try {
    const { category } = req.params
    const { page = 1, limit = 10, sort = '-publishedAt' } = req.query

    const skip = (parseInt(page) - 1) * parseInt(limit)

    const articles = await Article.find({
      status: 'published',
      category
    })
      .populate('author', 'name email avatar')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .select('-contentBlocks')

    const total = await Article.countDocuments({
      status: 'published',
      category
    })

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
    console.error('Get articles by category error:', error)
    res.status(500).json({
      success: false,
      error: 'Server error getting articles by category'
    })
  }
}

// @desc    Get articles by author
// @route   GET /api/public/articles/author/:authorId
// @access  Public
const getArticlesByAuthor = async (req, res) => {
  try {
    const { authorId } = req.params
    const { page = 1, limit = 10, sort = '-publishedAt' } = req.query

    const skip = (parseInt(page) - 1) * parseInt(limit)

    const articles = await Article.find({
      status: 'published',
      author: authorId
    })
      .populate('author', 'name email avatar bio')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .select('-contentBlocks')

    const total = await Article.countDocuments({
      status: 'published',
      author: authorId
    })

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
    console.error('Get articles by author error:', error)
    res.status(500).json({
      success: false,
      error: 'Server error getting articles by author'
    })
  }
}

// @desc    Like article (increment only - for non-authenticated users)
// @route   POST /api/public/articles/:id/like
// @access  Public
const likeArticle = async (req, res) => {
  try {
    const { id } = req.params

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

    article.likes += 1
    await article.save()

    res.json({
      success: true,
      data: { likes: article.likes },
      message: 'Article liked successfully'
    })
  } catch (error) {
    console.error('Like article error:', error)
    res.status(500).json({
      success: false,
      error: 'Server error liking article'
    })
  }
}

module.exports = {
  getPublicArticle,
  getPublicArticleById,
  getPublicArticles,
  getFeaturedArticles,
  getPopularArticles,
  getArticlesByCategory,
  getArticlesByAuthor,
  likeArticle
}
