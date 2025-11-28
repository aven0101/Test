# PSFSS Backend

Backend API for the PSFSS application built with Node.js, Express, and MySQL.

## Features

- **Express.js** - Fast, unopinionated web framework
- **MySQL** - Relational database with connection pooling
- **JWT Authentication** - Secure user authentication (under construction)
- **Validation** - Request validation using Joi
- **Security** - CORS, Helmet, Rate limiting
- **Logging** - Winston logger with file and console output
- **API Documentation** - Swagger/OpenAPI documentation
- **Error Handling** - Centralized error handling middleware

## Getting Started

### Prerequisites

- Node.js >= 16.0.0
- MySQL 8.0+
- npm or yarn

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd psfss-backend
```

2. Install dependencies
```bash
npm install
```

3. Create environment file
```bash
cp .env.example .env
```

4. Configure your environment variables in `.env`:
```env
NODE_ENV=development
PORT=3000
HOST=localhost

# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_NAME=psfss
DB_USER=your_username
DB_PASSWORD=your_password

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_at_least_32_characters_long
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your_super_secret_refresh_key_at_least_32_characters_long
JWT_REFRESH_EXPIRES_IN=30d

# Email Configuration (Optional)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
EMAIL_FROM=noreply@psfss.com

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
```

5. Start the development server
```bash
npm run dev
```

The server will start on http://localhost:3000

## API Endpoints

### Health Check
- `GET /health` - Server health check

### Authentication (Under Construction)
- All authentication endpoints return "under construction" message

## API Documentation

Visit http://localhost:3000/api-docs for interactive API documentation.

## Project Structure

```
src/
├── config/          # Configuration files
│   ├── index.js     # Main configuration
│   ├── database.js  # Database connection
│   └── logger.js    # Winston logger setup
├── controllers/     # Route controllers
├── middleware/      # Express middleware
│   ├── auth.js      # Authentication middleware
│   ├── errorHandler.js # Error handling
│   └── validation.js # Request validation
├── models/          # Database models
├── routes/          # API routes
│   ├── index.js     # Main routes
│   └── auth.js      # Authentication routes
├── services/        # Business logic
├── schemas/         # Validation schemas
├── utils/           # Utility functions
├── scripts/         # Database scripts
└── main.js          # Application entry point
```

## Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm test` - Run tests
- `npm run test:ci` - Run tests with coverage
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint errors
- `npm run format` - Format code with Prettier

## Environment Variables

See `.env.example` for all available environment variables.

## License

MIT
