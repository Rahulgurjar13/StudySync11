# ✅ Render Deployment Checklist

## Quick Answer: **Deploy SEPARATELY - 2 services needed!**

---

## 📋 Pre-Deployment (5 minutes)

- [ ] **Push code to GitHub**
  ```bash
  git add .
  git commit -m "Ready for deployment"
  git push origin main
  ```

- [ ] **MongoDB Atlas setup** (if not done)
  - Go to: https://mongodb.com/cloud/atlas
  - Create free M0 cluster
  - Create database user
  - Whitelist all IPs (0.0.0.0/0)
  - Copy connection string

- [ ] **Generate strong JWT secret**
  ```bash
  # Run this command:
  node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
  ```
  Save the output!

---

## 🚀 Deployment #1: Backend (10 minutes)

### Step 1: Create Web Service
- [ ] Go to https://render.com
- [ ] Sign up/Login with GitHub
- [ ] Click "New +" → "Web Service"
- [ ] Connect `StudySync11` repository

### Step 2: Configure Service
```
Name:            tandem-track-mate-backend
Region:          Oregon (US West)
Branch:          main
Root Directory:  server                    ← IMPORTANT!
Runtime:         Node
Build Command:   npm install
Start Command:   npm start
Instance Type:   Free
```

### Step 3: Add Environment Variables
```
MONGODB_URI     = mongodb+srv://gurjarrahul9111227474_db_user:Kd4hX1zTAI3guDZs@cluster0.ep5xkwa.mongodb.net/tandem-track-mate?retryWrites=true&w=majority&appName=Cluster0

JWT_SECRET      = [paste your generated secret]

NODE_ENV        = production
```

### Step 4: Deploy
- [ ] Click "Create Web Service"
- [ ] Wait 3-5 minutes
- [ ] Copy your backend URL (e.g., `https://tandem-track-mate-backend.onrender.com`)

### Step 5: Test Backend
- [ ] Visit: `https://your-backend-url.onrender.com/api/health`
- [ ] Should see: `{"status":"ok"}` or similar

---

## 🎨 Deployment #2: Frontend (10 minutes)

### Step 1: Create Static Site
- [ ] Go to Render Dashboard
- [ ] Click "New +" → "Static Site"
- [ ] Connect `StudySync11` repository

### Step 2: Configure Site
```
Name:              tandem-track-mate-frontend
Region:            Oregon (US West)
Branch:            main
Root Directory:    (leave empty)
Build Command:     npm install && npm run build
Publish Directory: dist
```

### Step 3: Add Environment Variable
```
VITE_API_URL = https://your-backend-url.onrender.com/api
```
**Replace with your actual backend URL from Deployment #1!**

### Step 4: Deploy
- [ ] Click "Create Static Site"
- [ ] Wait 3-5 minutes
- [ ] Copy your frontend URL (e.g., `https://tandem-track-mate-frontend.onrender.com`)

---

## 🔧 Post-Deployment (5 minutes)

### Update Backend CORS
- [ ] Go to Backend service in Render
- [ ] Click "Environment" tab
- [ ] Add new variable:
  ```
  FRONTEND_URL = https://your-frontend-url.onrender.com
  ```
- [ ] Click "Save Changes"
- [ ] Wait 2-3 minutes for auto-redeploy

### Test Everything
- [ ] Visit frontend URL
- [ ] Try to register new account
- [ ] Login
- [ ] Create a task
- [ ] Start focus timer
- [ ] Check if data saves
- [ ] Refresh page - timer should restore! ✅

---

## 🎯 Your Live URLs

```
Frontend: https://tandem-track-mate-frontend.onrender.com
Backend:  https://tandem-track-mate-backend.onrender.com
```

**Share the frontend URL with users!** 🎉

---

## 🐛 Troubleshooting

### Backend won't start?
```bash
# Check these in Render logs:
- "MONGODB_URI" is set correctly
- No missing environment variables
- Port is not hardcoded (should use process.env.PORT)
```

### Frontend can't connect to backend?
```bash
# Verify:
- VITE_API_URL points to correct backend URL
- Backend is running (green dot in Render)
- No typos in URL (include /api at the end)
```

### CORS errors in browser console?
```bash
# Fix:
- Add FRONTEND_URL to backend environment variables
- Make sure it matches your frontend URL exactly
- Redeploy backend after adding FRONTEND_URL
```

### "This site can't be reached"?
```bash
# Wait and verify:
- First deployment takes 5-10 minutes
- Check deployment logs for errors
- Try again in a few minutes
```

---

## 💡 Pro Tips

1. **Backend sleeps after 15 min** (free tier)
   - First request will take 30-60 seconds
   - Use cron-job.org to ping every 14 min to keep it awake

2. **Auto-deploy enabled**
   - Push to GitHub = auto-deploy both services
   - No need to manually redeploy

3. **Check logs for errors**
   - Render Dashboard → Service → "Logs" tab
   - Real-time logs for debugging

4. **Environment variables can be updated**
   - No need to redeploy for env var changes
   - Service auto-restarts

---

## 📊 What You Have Now

```
✅ Backend API         - Running on Render
✅ Frontend App        - Running on Render  
✅ MongoDB Database    - Running on Atlas
✅ Auto-deploy         - Enabled from GitHub
✅ Free SSL            - HTTPS for both
✅ Timer Persistence   - Working across refreshes
✅ Real-time Features  - Socket.IO working
```

**Total Cost: $0 (Free forever!)** 💰

---

## 🔄 Future Updates

To deploy new features:
```bash
# 1. Make code changes
# 2. Commit and push
git add .
git commit -m "Added new feature"
git push origin main

# 3. Wait 5-8 minutes
# 4. Both services auto-deploy! ✅
```

---

## 🆘 Need Help?

1. **Check Render logs** - Most errors show here
2. **Check browser console** - For frontend errors (F12)
3. **Verify environment variables** - Common issue
4. **Wait 5-10 minutes** - First deploys take time

---

## ✅ Success Checklist

After deployment, you should be able to:
- [x] Visit frontend URL and see login page
- [x] Register a new account
- [x] Login successfully
- [x] Create and complete tasks
- [x] Start focus timer
- [x] Refresh page - timer continues! ✅
- [x] Earn XP points
- [x] See streak calendar
- [x] Use video calling (if enabled)

**All working? You're done! 🎉**

Share your live app URL with friends!
