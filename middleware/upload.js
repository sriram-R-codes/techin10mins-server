const multer = require('multer')
const path = require('path')
const fs = require('fs')

// Ensure upload directory exists
const uploadDir = process.env.UPLOAD_PATH || './uploads'
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir)
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    const ext = path.extname(file.originalname)
    cb(null, file.fieldname + '-' + uniqueSuffix + ext)
  }
})

// File filter
const fileFilter = (req, file, cb) => {
  // Check file type
  if (file.mimetype.startsWith('image/')) {
    cb(null, true)
  } else {
    cb(new Error('Only image files are allowed!'), false)
  }
}

// Configure multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024, // 5MB default
    files: 10 // Maximum 10 files
  },
  fileFilter: fileFilter
})

// Error handling middleware
const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'File too large. Maximum size is 5MB.'
      })
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        error: 'Too many files. Maximum is 10 files.'
      })
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        error: 'Unexpected field name.'
      })
    }
  }
  
  if (error.message === 'Only image files are allowed!') {
    return res.status(400).json({
      success: false,
      error: 'Only image files are allowed!'
    })
  }

  next(error)
}

// Single file upload
const uploadSingle = (fieldName) => {
  return (req, res, next) => {
    const uploadSingleFile = upload.single(fieldName)
    uploadSingleFile(req, res, (err) => {
      if (err) {
        return handleUploadError(err, req, res, next)
      }
      next()
    })
  }
}

// Multiple files upload
const uploadMultiple = (fieldName, maxCount = 10) => {
  return (req, res, next) => {
    const uploadMultipleFiles = upload.array(fieldName, maxCount)
    uploadMultipleFiles(req, res, (err) => {
      if (err) {
        return handleUploadError(err, req, res, next)
      }
      next()
    })
  }
}

module.exports = {
  upload,
  uploadSingle,
  uploadMultiple,
  handleUploadError
}
