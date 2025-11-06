# 🎯 Deployment Architecture - Visual Guide

## 📊 Current Setup vs Production Setup

```
LOCAL DEVELOPMENT                    PRODUCTION (RENDER)
═══════════════════                  ═══════════════════════════════

┌─────────────────┐                  ┌───────────────────────────────┐
│  Your Computer  │                  │         RENDER.COM            │
├─────────────────┤                  ├───────────────────────────────┤
│                 │                  │                               │
│  Frontend       │                  │  Frontend (Static Site)       │
│  localhost:8080 │                  │  https://your-app.onrender.com│
│  (Vite Dev)     │                  │  - Serves React build         │
│                 │                  │  - Free SSL certificate       │
└────────┬────────┘                  │  - Auto-deploy from GitHub    │
         │                            └──────────┬────────────────────┘
         │ API calls                             │
         │ http://localhost:3001/api             │ API calls
         ▼                                        ▼
┌─────────────────┐                  ┌───────────────────────────────┐
│  Backend        │                  │  Backend (Web Service)        │
│  localhost:3001 │                  │  https://api.onrender.com     │
│  (Node/Express) │                  │  - Runs Node.js server        │
│                 │                  │  - Socket.IO support          │
└────────┬────────┘                  │  - Auto-deploy from GitHub    │
         │                            └──────────┬────────────────────┘
         │ MongoDB connection                    │
         ▼                                        ▼
┌─────────────────┐                  ┌───────────────────────────────┐
│  MongoDB        │                  │  MongoDB Atlas (Cloud)        │
│  localhost      │                  │  mongodb+srv://...            │
│  (if running)   │                  │  - Free M0 tier               │
│                 │                  │  - 512MB storage              │
└─────────────────┘                  └───────────────────────────────┘
```

---

## 🚀 Deployment Steps Summary

```
STEP 1: DEPLOY BACKEND
═══════════════════════════════════════════════════════════════

Render Dashboard → New Web Service
├── Repository: StudySync11
├── Root Directory: server
├── Build: npm install
├── Start: npm start
├── Environment Variables:
│   ├── MONGODB_URI = mongodb+srv://...
│   ├── JWT_SECRET = random-secret-key
│   └── NODE_ENV = production
└── Deploy! ✅

Result: https://tandem-track-mate-backend.onrender.com
        (Your backend is live!)


STEP 2: DEPLOY FRONTEND
═══════════════════════════════════════════════════════════════

Render Dashboard → New Static Site
├── Repository: StudySync11
├── Root Directory: (empty)
├── Build: npm install && npm run build
├── Publish Directory: dist
├── Environment Variables:
│   └── VITE_API_URL = https://tandem-backend.onrender.com/api
└── Deploy! ✅

Result: https://tandem-track-mate-frontend.onrender.com
        (Your app is live!)


STEP 3: UPDATE BACKEND CORS
═══════════════════════════════════════════════════════════════

Backend Environment Variables → Add:
└── FRONTEND_URL = https://tandem-frontend.onrender.com

Backend auto-redeploys → Done! ✅
```

---

## 🔄 How They Connect

```
┌──────────────────────────────────────────────────────────────┐
│                         USER'S BROWSER                        │
│                                                               │
│  Opens: https://tandem-track-mate-frontend.onrender.com      │
└───────────────────────┬──────────────────────────────────────┘
                        │
                        │ 1. Request HTML/CSS/JS
                        ▼
┌──────────────────────────────────────────────────────────────┐
│              RENDER - FRONTEND (Static Site)                  │
│                                                               │
│  - Serves built React app (HTML, CSS, JS)                    │
│  - Static files from /dist folder                            │
│  - No server-side code runs here                             │
└───────────────────────┬──────────────────────────────────────┘
                        │
                        │ 2. Returns React app to browser
                        ▼
┌──────────────────────────────────────────────────────────────┐
│                         USER'S BROWSER                        │
│                                                               │
│  React app is now running in browser                         │
│  User clicks "Login" button                                  │
└───────────────────────┬──────────────────────────────────────┘
                        │
                        │ 3. API call: POST /api/auth/login
                        │    fetch(VITE_API_URL + '/auth/login')
                        ▼
┌──────────────────────────────────────────────────────────────┐
│              RENDER - BACKEND (Web Service)                   │
│                                                               │
│  - Receives API request                                      │
│  - Validates credentials                                     │
│  - Queries MongoDB database                                  │
└───────────────────────┬──────────────────────────────────────┘
                        │
                        │ 4. Database query
                        ▼
┌──────────────────────────────────────────────────────────────┐
│                   MONGODB ATLAS (Cloud)                       │
│                                                               │
│  - Stores user data, tasks, focus sessions                   │
│  - Returns query results                                     │
└───────────────────────┬──────────────────────────────────────┘
                        │
                        │ 5. Returns user data
                        ▼
┌──────────────────────────────────────────────────────────────┐
│              RENDER - BACKEND (Web Service)                   │
│                                                               │
│  - Generates JWT token                                       │
│  - Returns response: { token, user }                         │
└───────────────────────┬──────────────────────────────────────┘
                        │
                        │ 6. API response
                        ▼
┌──────────────────────────────────────────────────────────────┐
│                         USER'S BROWSER                        │
│                                                               │
│  - Saves token to localStorage                               │
│  - Redirects to dashboard                                    │
│  - User is logged in! ✅                                     │
└──────────────────────────────────────────────────────────────┘
```

---

## 📦 What Gets Deployed Where

### Frontend Deployment (Static Site)

```
Source: tandem-track-mate-main/
├── src/              ← Your React code
├── public/           ← Static assets
├── package.json      ← Dependencies
└── vite.config.ts    ← Build config

Build Process:
1. npm install        ← Install dependencies
2. npm run build      ← Build React app
3. Creates dist/      ← Optimized production files

Deployed Files (dist/):
dist/
├── index.html        ← Main HTML
├── assets/
│   ├── index-abc123.js   ← Bundled React app
│   └── index-def456.css  ← Bundled styles
└── favicon.ico       ← Icons

Result: Static files served via CDN (super fast!)
```

### Backend Deployment (Web Service)

```
Source: tandem-track-mate-main/server/
├── index.js          ← Main server file
├── routes/           ← API endpoints
├── models/           ← Database models
├── middleware/       ← Auth, etc.
└── package.json      ← Dependencies

Build Process:
1. npm install        ← Install dependencies
2. npm start          ← Start Node.js server

Running Process:
- Node.js server listening on port 3001
- Handles API requests
- Connects to MongoDB
- WebSocket support for real-time features

Result: Always-on API server (with 15min sleep on free tier)
```

---

## 🔐 Environment Variables Explained

### Frontend (.env)

```bash
VITE_API_URL=https://backend.onrender.com/api
```

**Why:** Tells React where to send API requests  
**Used in:** src/lib/api.ts  
**Format:** Must start with `VITE_` for Vite to expose it

### Backend (server/.env)

```bash
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database
JWT_SECRET=your-secret-key-here
NODE_ENV=production
FRONTEND_URL=https://frontend.onrender.com
```

**Why:**

- `MONGODB_URI`: Database connection
- `JWT_SECRET`: Sign authentication tokens
- `NODE_ENV`: Enable production optimizations
- `FRONTEND_URL`: Allow CORS from frontend

---

## 🌐 URLs After Deployment

```
Production URLs:
════════════════════════════════════════════════════

Frontend (Users visit):
https://tandem-track-mate-frontend.onrender.com
├── Main app interface
├── Login/Register pages
├── Dashboard
└── All React components

Backend API (Frontend calls):
https://tandem-track-mate-backend.onrender.com/api
├── /auth/login
├── /auth/register
├── /tasks
├── /focus/session
└── /points

Database (Backend connects):
mongodb+srv://cluster0.ep5xkwa.mongodb.net/...
└── Stores all app data
```

---

## ⚡ Performance Tips

### Frontend (Static Site)

- ✅ Instant load (CDN-cached)
- ✅ No server needed
- ✅ Always fast
- ⚠️ Rebuild needed for code changes

### Backend (Web Service - Free Tier)

- ✅ Fast when active
- ⚠️ Sleeps after 15 min inactivity
- ⚠️ First request after sleep: 30-60 sec
- 💡 Solution: Use cron-job.org to ping every 14 min

### Database (MongoDB Atlas - Free Tier)

- ✅ Always on
- ✅ 512MB storage (plenty for most apps)
- ✅ Multiple backups
- ✅ Global cluster

---

## 🔄 Deployment Workflow

```
1. CODE CHANGES
   ↓
2. git add .
   git commit -m "New feature"
   git push origin main
   ↓
3. RENDER DETECTS PUSH
   ↓
4. BACKEND BUILDS
   - npm install
   - npm start
   - Live in 2-3 min
   ↓
5. FRONTEND BUILDS
   - npm install
   - npm run build
   - Live in 2-3 min
   ↓
6. BOTH DEPLOYED! ✅
```

**Total time:** 5-8 minutes from push to live

---

## ✅ Checklist Before Deploying

- [ ] Code pushed to GitHub (`git push origin main`)
- [ ] MongoDB Atlas database created
- [ ] MongoDB connection string ready
- [ ] Strong JWT_SECRET generated
- [ ] `.env` files configured (both frontend and backend)
- [ ] CORS settings updated
- [ ] Both deployments tested locally

---

## 🎯 Final Architecture

```
User's Browser
      │
      ├─── Frontend (Render Static Site)
      │    - React App
      │    - No server needed
      │    - CDN cached
      │
      └─── Backend (Render Web Service)
           ├── Node.js/Express
           ├── Socket.IO
           └── MongoDB Atlas
                - Database
                - Always on
                - Free tier
```

**Two separate deployments, working together perfectly!** 🎉
