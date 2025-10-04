const mongoose = require('mongoose')

const contentBlockSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['text', 'image', 'video', 'code'],
    required: true
  },
  content: {
    type: String,
    required: true
  },
  alt: {
    type: String,
    default: ''
  },
  order: {
    type: Number,
    default: 0
  }
}, { _id: false })

const articleSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [200, 'Title cannot be more than 200 characters']
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true,
    trim: true
  },
  contentBlocks: [contentBlockSchema],
  editorData: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  excerpt: {
    type: String,
    maxlength: [500, 'Excerpt cannot be more than 500 characters']
  },
  category: {
    type: String,
    required: false,
    enum: ['UXUI', 'UX','UI','Design','Development', 'AI' , 'Design' , 'Daily']
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft'
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  featuredImage: {
    type: String,
    default: ''
  },
  publishedAt: {
    type: Date
  },
  views: {
    type: Number,
    default: 0
  },
  likes: {
    type: Number,
    default: 0
  },
  likedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  readTime: {
    type: Number,
    default: 0
  },
  seoTitle: {
    type: String,
    maxlength: [60, 'SEO title cannot be more than 60 characters']
  },
  seoDescription: {
    type: String,
    maxlength: [160, 'SEO description cannot be more than 160 characters']
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  allowComments: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
})

// Generate slug from title
articleSchema.pre('save', function(next) {
  if (this.isModified('title')) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9 -]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim('-')
  }
  next()
})

// Set publishedAt when status changes to published
articleSchema.pre('save', function(next) {
  if (this.isModified('status') && this.status === 'published' && !this.publishedAt) {
    this.publishedAt = new Date()
  }
  next()
})

// Calculate read time based on content
articleSchema.pre('save', function(next) {
  if (this.isModified('contentBlocks') || this.isModified('editorData')) {
    let textContent = ''
    
    // Calculate from contentBlocks (old format)
    if (this.contentBlocks && this.contentBlocks.length > 0) {
      textContent = this.contentBlocks
        .filter(block => block.type === 'text')
        .map(block => block.content)
        .join(' ')
    }
    
    // Calculate from editorData (new format)
    if (this.editorData && this.editorData.blocks && this.editorData.blocks.length > 0) {
      const editorText = this.editorData.blocks
        .filter(block => block.type === 'paragraph' || block.type === 'header')
        .map(block => block.data.text)
        .join(' ')
      textContent += ' ' + editorText
    }
    
    const wordCount = textContent.split(/\s+/).length
    this.readTime = Math.ceil(wordCount / 200) // Average reading speed: 200 words per minute
  }
  next()
})

// Generate/refresh excerpt from first text block whenever content changes
articleSchema.pre('save', function(next) {
  if (this.isModified('contentBlocks') || this.isModified('editorData')) {
    let excerptText = ''
    
    // Try contentBlocks first (old format)
    if (this.contentBlocks && this.contentBlocks.length > 0) {
      const firstTextBlock = this.contentBlocks.find(block => block.type === 'text')
      if (firstTextBlock) {
        excerptText = firstTextBlock.content
      }
    }
    
    // Try editorData (new format)
    if (!excerptText && this.editorData && this.editorData.blocks && this.editorData.blocks.length > 0) {
      const firstTextBlock = this.editorData.blocks.find(block => {
        if (block.type === 'paragraph' || block.type === 'header') {
          return block.data && block.data.text
        }
        if (block.type === 'quote') {
          return block.data && block.data.text
        }
        if (block.type === 'list' && block.data && block.data.items && block.data.items.length > 0) {
          return true
        }
        return false
      })
      
      if (firstTextBlock) {
        if (firstTextBlock.type === 'list') {
          excerptText = firstTextBlock.data.items[0]
        } else {
          excerptText = firstTextBlock.data.text
        }
      }
    }
    
    if (excerptText) {
      this.excerpt = excerptText.substring(0, 200) + '...'
    }
  }
  next()
})

// Index for better query performance
articleSchema.index({ status: 1, publishedAt: -1 })
articleSchema.index({ author: 1, status: 1 })
articleSchema.index({ category: 1, status: 1 })
articleSchema.index({ tags: 1 })
articleSchema.index({ slug: 1 })

// Virtual for article URL
articleSchema.virtual('url').get(function() {
  return `/article/${this.slug}`
})

// Static method to get published articles
articleSchema.statics.getPublished = function() {
  return this.find({ status: 'published' })
    .populate('author', 'name email avatar')
    .sort({ publishedAt: -1 })
}

// Static method to get articles by author
articleSchema.statics.getByAuthor = function(authorId, status = null) {
  const query = { author: authorId }
  if (status) query.status = status
  
  return this.find(query)
    .populate('author', 'name email avatar')
    .sort({ createdAt: -1 })
}

module.exports = mongoose.model('Article', articleSchema)
