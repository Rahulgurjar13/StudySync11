# 🚀 Deploy Tandem Track Mate to Render - Simple Guide

## ✅ Quick Answer

**You MUST deploy TWO separate services:**

1. **Backend (Server)** - Node.js/Express API
2. **Frontend (Client)** - React/Vite App

They cannot be deployed together because they are separate applications.

---

## 📦 What You Have

```
tandem-track-mate-main/
├── server/              ← Backend (Deploy #1)
│   ├── index.js
│   ├── package.json
│   └── .env
│
├── src/                 ← Frontend (Deploy #2)
│   ├── App.tsx
│   └── main.tsx
├── package.json
└── vite.config.ts
```

---

## 🎯 Deployment Overview

### Backend (Server)

- **Service Type**: Web Service
- **Build Command**: `cd server && npm install`
- **Start Command**: `cd server && npm start`
- **Port**: 3001 (auto-detected)
- **Free Tier**: ✅ Yes

### Frontend (Client)

- **Service Type**: Static Site
- **Build Command**: `npm install && npm run build`
- **Publish Directory**: `dist`
- **Free Tier**: ✅ Yes

---

## 🚀 Step 1: Deploy Backend (5 minutes)

### 1.1 Push Code to GitHub

```bash
# Already done! ✅
git push origin main
```

### 1.2 Create Backend Service on Render

1. Go to: https://render.com/
2. Click **"Get Started for Free"**
3. Sign up with **GitHub**
4. Click **"New +"** → **"Web Service"**

### 1.3 Configure Backend

**Connect Repository:**

- Select: `StudySync11` repository
- Click **"Connect"**

**Basic Settings:**

- Name: `tandem-track-mate-backend`
- Region: `Oregon (US West)` (choose closest to you)
- Branch: `main`
- Root Directory: `server` ← **IMPORTANT!**

**Build Settings:**

- Runtime: `Node`
- Build Command: `npm install`
- Start Command: `npm start`

**Instance Type:**

- Select: `Free` ✅

### 1.4 Add Environment Variables

Click **"Advanced"** → **"Add Environment Variable"**

Add these 3 variables:

```
MONGODB_URI = mongodb+srv://gurjarrahul9111227474_db_user:Kd4hX1zTAI3guDZs@cluster0.ep5xkwa.mongodb.net/tandem-track-mate?retryWrites=true&w=majority&appName=Cluster0

JWT_SECRET = your-super-secret-jwt-key-change-this-in-production-2025

NODE_ENV = production
```

**Important:** Change `JWT_SECRET` to a strong random string!

### 1.5 Deploy!

Click **"Create Web Service"**

Wait 3-5 minutes for deployment...

**Your backend URL will be:**

```
https://tandem-track-mate-backend.onrender.com
```

✅ Test it: Visit `https://your-backend-url.onrender.com/api/health`

---

## 🎨 Step 2: Deploy Frontend (5 minutes)

### 2.1 Update Frontend to Use Backend URL

First, we need to tell the frontend where the backend is:

**Option A: Create `.env` file in root** (Recommended)

Create file: `/tandem-track-mate-main/.env`

```bash
VITE_API_URL=https://tandem-track-mate-backend.onrender.com/api
```

**Option B: Update vite.config.ts**

Or set it in the config file (I'll help you choose)

### 2.2 Create Frontend Service on Render

1. Go back to Render Dashboard
2. Click **"New +"** → **"Static Site"**

### 2.3 Configure Frontend

**Connect Repository:**

- Select: `StudySync11` repository
- Click **"Connect"**

**Basic Settings:**

- Name: `tandem-track-mate-frontend`
- Region: `Oregon (US West)` (same as backend)
- Branch: `main`
- Root Directory: _(leave empty)_

**Build Settings:**

- Build Command: `npm install && npm run build`
- Publish Directory: `dist`

### 2.4 Add Environment Variable

Click **"Advanced"** → **"Add Environment Variable"**

```
VITE_API_URL = https://tandem-track-mate-backend.onrender.com/api
```

**Replace with your actual backend URL!**

### 2.5 Deploy!

Click **"Create Static Site"**

Wait 3-5 minutes for deployment...

**Your frontend URL will be:**

```
https://tandem-track-mate-frontend.onrender.com
```

✅ Your app is live! 🎉

---

## 🔧 Step 3: Update Backend CORS (Important!)

After frontend deploys, update backend to allow frontend domain:

1. Go to Render Dashboard
2. Click on **backend service**
3. Go to **"Environment"** tab
4. Add new variable:

```
FRONTEND_URL = https://tandem-track-mate-frontend.onrender.com
```

5. Click **"Save Changes"**
6. Backend will auto-redeploy (2-3 minutes)

---

## 📋 Final Configuration Checklist

### Backend Environment Variables:

```
MONGODB_URI = mongodb+srv://... (your MongoDB connection string)
JWT_SECRET = (strong random string)
NODE_ENV = production
FRONTEND_URL = https://tandem-track-mate-frontend.onrender.com
```

### Frontend Environment Variables:

```
VITE_API_URL = https://tandem-track-mate-backend.onrender.com/api
```

---

## 🧪 Test Your Deployment

### Test Backend:

1. Visit: `https://your-backend-url.onrender.com/api/health`
2. Should see: `{"status":"ok"}`

### Test Frontend:

1. Visit: `https://your-frontend-url.onrender.com`
2. Try to register/login
3. Start a timer
4. Check if data persists

---

## ⚠️ Common Issues & Solutions

### Issue 1: Backend shows "Service Unavailable"

**Solution:**

- Check backend logs in Render dashboard
- Verify `MONGODB_URI` is correct
- Make sure `server/package.json` has `"start": "node index.js"`

### Issue 2: Frontend can't connect to backend

**Solution:**

- Check `VITE_API_URL` in frontend environment variables
- Verify backend is running and accessible
- Check browser console for CORS errors

### Issue 3: CORS errors

**Solution:**

- Add `FRONTEND_URL` to backend environment variables
- Update `server/index.js` CORS configuration
- Redeploy backend

### Issue 4: "This site can't be reached"

**Solution:**

- Wait 5-10 minutes (first deployment takes time)
- Check deployment logs for errors
- Verify build commands are correct

---

## 💰 Free Tier Limits

**Render Free Tier:**

- ✅ Unlimited static sites (frontend)
- ✅ 750 hours/month for web services (backend)
- ⚠️ Backend sleeps after 15 min of inactivity
- ⚠️ First request after sleep takes 30-60 seconds

**Tip:** Your backend will "wake up" when someone visits the site!

---

## 🔄 Auto-Deploy Setup

**Already configured!** ✅

When you push to GitHub:

```bash
git add .
git commit -m "Update feature"
git push origin main
```

Both services auto-deploy in 3-5 minutes!

---

## 📱 Custom Domain (Optional)

### For Frontend:

1. Go to frontend service → Settings
2. Click "Custom Domain"
3. Add your domain (e.g., `tandemtrackmate.com`)
4. Update DNS records as shown

### For Backend:

1. Go to backend service → Settings
2. Add custom API subdomain (e.g., `api.tandemtrackmate.com`)
3. Update frontend `VITE_API_URL` to new domain

---

## 🎯 Quick Reference

**Your URLs:**

```
Frontend: https://tandem-track-mate-frontend.onrender.com
Backend:  https://tandem-track-mate-backend.onrender.com
Database: (MongoDB Atlas - already set up)
```

**Deploy Commands:**

```bash
# Local development
npm run dev              # Frontend
cd server && npm start   # Backend

# Production (automatic via Render)
git push origin main     # Deploys both!
```

---

## ✅ You're Done!

**Two separate deployments:**

1. ✅ Backend (Web Service) - Running Node.js
2. ✅ Frontend (Static Site) - Serving React app

**They communicate via:**

- Frontend calls: `VITE_API_URL` (backend URL)
- Backend allows: `FRONTEND_URL` (frontend URL)

**Total Time:** 15-20 minutes
**Total Cost:** $0 (Free forever!)

---

## 🆘 Need Help?

Check deployment logs:

1. Go to Render Dashboard
2. Click on service (backend or frontend)
3. Click "Logs" tab
4. See real-time deployment progress

**Still stuck?** Common issues are in the troubleshooting section above!

---

**🎉 Congratulations! Your app is now live!**

Share your URL: `https://tandem-track-mate-frontend.onrender.com`
