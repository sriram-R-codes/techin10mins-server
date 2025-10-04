# Blog CMS Backend

A comprehensive backend API for a blog content management system built with Node.js, Express, and MongoDB.

## Features

- **Authentication & Authorization**: JWT-based auth with role-based access control
- **Article Management**: Full CRUD operations for articles with rich content support
- **Public API**: Public endpoints for viewing published articles
- **File Upload**: Image upload support with validation
- **Security**: Helmet, CORS, rate limiting, and input validation
- **Database**: MongoDB with Mongoose ODM
- **Error Handling**: Comprehensive error handling and logging

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB
- **ODM**: Mongoose
- **Authentication**: JWT (jsonwebtoken)
- **Security**: Helmet, CORS, bcryptjs
- **File Upload**: Multer
- **Validation**: express-validator
- **Rate Limiting**: express-rate-limit
- **Compression**: compression

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd server
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env` file in the root directory:
   ```env
   NODE_ENV=development
   PORT=5000
   MONGO_URI=mongodb://localhost:27017/blog-cms
   JWT_SECRET=your-super-secure-jwt-secret-key-change-this-in-production
   JWT_EXPIRES_IN=7d
   BCRYPT_SALT_ROUNDS=12
   CORS_ORIGIN=http://localhost:3000
   UPLOAD_PATH=./uploads
   MAX_FILE_SIZE=5242880
   ```

4. **Start MongoDB**
   Make sure MongoDB is running on your system.

5. **Run the application**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update user profile
- `PUT /api/auth/change-password` - Change password

### Articles (Protected)
- `GET /api/articles` - Get user's articles
- `GET /api/articles/:id` - Get single article
- `POST /api/articles` - Create new article
- `PUT /api/articles/:id` - Update article
- `DELETE /api/articles/:id` - Delete article
- `PUT /api/articles/:id/publish` - Publish article
- `PUT /api/articles/:id/unpublish` - Unpublish article
- `GET /api/articles/stats` - Get article statistics
- `POST /api/articles/upload-image` - Upload image

### Public Articles
- `GET /api/public/articles` - Get all published articles
- `GET /api/public/articles/:slug` - Get article by slug
- `GET /api/public/articles/id/:id` - Get article by ID
- `GET /api/public/articles/featured` - Get featured articles
- `GET /api/public/articles/popular` - Get popular articles
- `GET /api/public/articles/category/:category` - Get articles by category
- `GET /api/public/articles/author/:authorId` - Get articles by author
- `POST /api/public/articles/:id/like` - Like article

## Database Models

### User Model
```javascript
{
  name: String,
  email: String (unique),
  password: String (hashed),
  role: String (admin/author/editor),
  avatar: String,
  bio: String,
  isActive: Boolean
}
```

### Article Model
```javascript
{
  title: String,
  slug: String (auto-generated),
  contentBlocks: [{
    type: String (text/image/video/code),
    content: String,
    alt: String,
    order: Number
  }],
  category: String,
  tags: [String],
  status: String (draft/published/archived),
  author: ObjectId (ref: User),
  publishedAt: Date,
  views: Number,
  likes: Number,
  readTime: Number (auto-calculated)
}
```

## Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt with configurable salt rounds
- **Input Validation**: Comprehensive validation using express-validator
- **Rate Limiting**: Prevents abuse with configurable limits
- **CORS Protection**: Configurable cross-origin resource sharing
- **Helmet Security**: Security headers and protection
- **File Upload Security**: File type and size validation

## Error Handling

The API includes comprehensive error handling for:
- Validation errors
- Authentication errors
- Database errors
- File upload errors
- Custom application errors

All errors return consistent JSON responses:
```javascript
{
  success: false,
  error: "Error message",
  details: "Additional error details" // Optional
}
```

## File Upload

The API supports image uploads with the following features:
- File type validation (images only)
- File size limits (configurable)
- Unique filename generation
- Static file serving
- Error handling for upload failures

## Development

### Scripts
- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm test` - Run tests

### Project Structure
```
server/
├── config/
│   └── database.js
├── controllers/
│   ├── authController.js
│   ├── articleController.js
│   └── publicController.js
├── middleware/
│   ├── auth.js
│   └── upload.js
├── models/
│   ├── User.js
│   └── Article.js
├── routes/
│   ├── auth.js
│   ├── articles.js
│   └── public.js
├── uploads/
├── server.js
├── package.json
└── README.md
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | Server port | `5000` |
| `MONGO_URI` | MongoDB connection string | `mongodb://localhost:27017/blog-cms` |
| `JWT_SECRET` | JWT signing secret | Required |
| `JWT_EXPIRES_IN` | JWT expiration time | `7d` |
| `BCRYPT_SALT_ROUNDS` | Password hashing rounds | `12` |
| `CORS_ORIGIN` | Allowed CORS origin | `http://localhost:3000` |
| `UPLOAD_PATH` | File upload directory | `./uploads` |
| `MAX_FILE_SIZE` | Maximum file size in bytes | `5242880` (5MB) |

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details.
