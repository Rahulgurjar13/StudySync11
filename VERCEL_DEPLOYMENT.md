# 🚀 Vercel Deployment - Quick Fix Guide

## ✅ Problem Solved!

Your backend is working perfectly at: `https://studysync-backend-2.onrender.com`

The issue was hardcoded `localhost:3001` URLs in the frontend code.

## ✨ What Was Fixed

### 1. **StudyRoom.tsx** - Socket.IO Connection

```tsx
// Before (hardcoded):
const SOCKET_SERVER_URL = "http://localhost:3001";

// After (uses environment variable):
const SOCKET_SERVER_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3001";
```

### 2. **PointsDisplay.tsx** - API Calls

```tsx
// Before (hardcoded):
fetch('http://localhost:3001/api/points/me', ...)

// After (uses environment variable):
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
fetch(`${API_URL}/api/points/me`, ...)
```

### 3. **Other Files Already Fixed** ✅

- `src/lib/api.ts` - Already uses `VITE_API_URL`
- `src/components/PomodoroTimer.tsx` - Already uses `VITE_API_URL`

## 📝 Vercel Environment Variable Setup

### Step 1: Go to Vercel Dashboard

1. Open [vercel.com](https://vercel.com)
2. Click on your project: **StudySync11**
3. Go to **Settings** → **Environment Variables**

### Step 2: Add Backend URL

Click **"Add New"** and enter:

| Name           | Value                                      | Environment                      |
| -------------- | ------------------------------------------ | -------------------------------- |
| `VITE_API_URL` | `https://studysync-backend-2.onrender.com` | Production, Preview, Development |

**Important:**

- ✅ Use `https://` (not `http://`)
- ✅ NO trailing slash `/`
- ✅ Select all environments (Production, Preview, Development)

### Step 3: Redeploy

Two options:

**Option A: Automatic (recommended)**

```bash
git add .
git commit -m "Fix: Use environment variables for backend URL"
git push origin main
```

Vercel will auto-deploy with the new environment variable.

**Option B: Manual**

1. Go to **Deployments** tab
2. Click **"..."** on the latest deployment
3. Click **"Redeploy"**

## 🧪 Test After Deployment

Once redeployed, check the browser console. You should see:

```
✅ [API] GET https://studysync-backend-2.onrender.com/api/auth/me
✅ Socket connected to wss://studysync-backend-2.onrender.com
```

Instead of:

```
❌ WebSocket connection to 'ws://localhost:3001/socket.io/' failed
```

## 🔍 Verify It's Working

1. Open your Vercel site
2. Open Browser DevTools (F12)
3. Go to **Console** tab
4. Look for these logs:
   - ✅ API calls to `https://studysync-backend-2.onrender.com`
   - ✅ Socket.IO connection established
   - ✅ No `localhost:3001` errors

## 📱 Local Development Still Works!

The code uses fallback values:

```tsx
import.meta.env.VITE_API_URL || "http://localhost:3001";
```

So locally (without `.env` file):

- ✅ Uses `http://localhost:3001` (your local backend)

On Vercel (with environment variable):

- ✅ Uses `https://studysync-backend-2.onrender.com` (production backend)

## 🎯 Next Steps

1. **Push the code changes:**

   ```bash
   git add .
   git commit -m "Fix: Use environment variables for all API calls"
   git push origin main
   ```

2. **Add environment variable to Vercel:**

   - Name: `VITE_API_URL`
   - Value: `https://studysync-backend-2.onrender.com`

3. **Wait for auto-deploy** (or manually redeploy)

4. **Test your site!** 🎉

## 🐛 Still Having Issues?

### Socket.IO Not Connecting?

Check your Render backend logs for CORS errors. Your backend should allow your Vercel domain:

```javascript
// server/index.js
const cors = require("cors");

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:3000",
      "https://your-vercel-domain.vercel.app", // Add this!
    ],
    credentials: true,
  })
);
```

### API Calls Failing?

1. Check Vercel environment variables are saved
2. Check browser console for the actual URL being called
3. Verify Render backend is running (visit the URL in browser)

## ✅ Summary

**Files Changed:**

- ✅ `src/pages/StudyRoom.tsx` - Socket.IO now uses env variable
- ✅ `src/components/PointsDisplay.tsx` - API calls now use env variable
- ✅ `.env.production` - Created with production backend URL

**Vercel Setup:**

- ⏳ Add `VITE_API_URL` environment variable
- ⏳ Redeploy application

**Expected Result:**

- ✅ Frontend connects to Render backend
- ✅ Socket.IO works for real-time features
- ✅ All API calls go to production backend
- ✅ No more `localhost:3001` errors!

---

**Your backend is already working! Just need to connect the frontend to it.** 🚀
