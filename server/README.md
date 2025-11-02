# Tandem Track Mate - Express + MongoDB Backend

Complete Express.js REST API with MongoDB database.

## Features

- ✅ User Authentication (Register/Login with JWT)
- ✅ Task Management (CRUD operations)
- ✅ Partner Connections
- ✅ Shared Resources
- ✅ Pomodoro Sessions
- ✅ Focus Stats
- ✅ MongoDB with Mongoose ODM

## Quick Setup (3 Steps)

### 1. Install MongoDB

**macOS (easiest way):**

```bash
brew tap mongodb/brew
brew install mongodb-community@7.0
brew services start mongodb-community@7.0
```

**Or use MongoDB Atlas (Free cloud database):**

- Go to https://www.mongodb.com/cloud/atlas/register
- Create a free cluster
- Get your connection string

### 2. Install Dependencies

```bash
cd server
npm install
```

### 3. Start the Server

```bash
npm run dev  # Development with auto-reload
```

Server will run on **http://localhost:5000**
MongoDB will run on **mongodb://localhost:27017** (local) or use your Atlas connection string.

## Configuration

Edit `server/.env`:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/tandem_track_mate
# Or for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/tandem_track_mate
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
NODE_ENV=development
```

## Database Models

MongoDB collections (no manual schema needed - Mongoose handles it):

- **users** - User accounts with authentication
- **tasks** - User tasks with sharing support
- **partnerships** - Friend connections
- **sharedresources** - Shared links/files
- **pomodirosessions** - Focus sessions
- **focusstats** - Daily statistics

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register new user
  ```json
  {
    "email": "test@example.com",
    "password": "password123",
    "fullName": "Test User"
  }
  ```
- `POST /api/auth/login` - Login user
  ```json
  {
    "email": "test@example.com",
    "password": "password123"
  }
  ```
- `GET /api/auth/me` - Get current user (requires Bearer token)

### Tasks

- `GET /api/tasks` - Get all tasks (requires token)
- `POST /api/tasks` - Create task (requires token)
  ```json
  {
    "title": "My Task",
    "description": "Task description",
    "completed": false,
    "isShared": false
  }
  ```
- `PUT /api/tasks/:id` - Update task (requires token)
- `DELETE /api/tasks/:id` - Delete task (requires token)

### Partnerships

- `GET /api/partnerships` - Get partnerships (requires token)
- `POST /api/partnerships` - Create partnership (requires token)
  ```json
  {
    "partnerEmail": "partner@example.com"
  }
  ```
- `DELETE /api/partnerships/:id` - Delete partnership (requires token)

### Shared Resources

- `GET /api/resources` - Get shared resources (requires token)
- `POST /api/resources` - Create resource (requires token)
  ```json
  {
    "title": "Resource Title",
    "description": "Description",
    "url": "https://example.com",
    "resourceType": "link",
    "partnershipId": "partnership-id-here"
  }
  ```
- `DELETE /api/resources/:id` - Delete resource (requires token)

## Testing the API

```bash
# Health check
curl http://localhost:5000/health

# Register
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","fullName":"Test User"}'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Get tasks (replace YOUR_TOKEN with the token from login)
curl http://localhost:5000/api/tasks \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Verify MongoDB is Running

```bash
# Check if MongoDB service is running
brew services list | grep mongodb

# Connect to MongoDB shell
mongosh

# In mongosh, check databases:
show dbs
use tandem_track_mate
show collections
```

## Next Steps

After setting up the backend, update your frontend `.env`:

```env
VITE_API_URL=http://localhost:5000/api
```

Then update your frontend code to use the new API instead of Supabase.

## Troubleshooting

**MongoDB not starting?**

```bash
brew services restart mongodb-community@7.0
```

**Can't connect to MongoDB?**

- Check if it's running: `brew services list`
- Check logs: `brew services info mongodb-community@7.0`
- Try using MongoDB Atlas (cloud) instead

**Port 5000 already in use?**

- Change PORT in `.env` to another port like 5001
