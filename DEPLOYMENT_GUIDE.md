# Complete Deployment Guide - Tandem Track Mate

## 🚀 Recommended Deployment Strategy

**Frontend:** Vercel  
**Backend:** Railway.app  
**Database:** MongoDB Atlas

This setup ensures all features work, including Socket.IO for real-time collaboration.

---

## 📦 Step 1: Prepare MongoDB (5 minutes)

### 1.1 Create MongoDB Atlas Account
1. Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Sign up for free
3. Create a new cluster (Free tier M0)

### 1.2 Get Connection String
1. Click "Connect" on your cluster
2. Choose "Connect your application"
3. Copy the connection string (looks like):
   ```
   mongodb+srv://username:<password>@cluster.mongodb.net/?retryWrites=true&w=majority
   ```
4. Replace `<password>` with your actual password
5. Save this for later!

### 1.3 Whitelist IP Addresses
1. In Atlas, go to "Network Access"
2. Click "Add IP Address"
3. Click "Allow Access from Anywhere" (0.0.0.0/0)
4. Confirm

---

## 🔧 Step 2: Deploy Backend to Railway (10 minutes)

### 2.1 Create Railway Account
1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub
3. Click "New Project"
4. Choose "Deploy from GitHub repo"
5. Select your repository
6. Choose the `server` folder

### 2.2 Configure Environment Variables

In Railway dashboard, add these variables:

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/tandem-track-mate?retryWrites=true&w=majority
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-min-32-chars
NODE_ENV=production
PORT=3001
```

**Generate JWT_SECRET:**
```bash
# Run this in terminal to generate a secure secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2.3 Update server/package.json

Make sure your `server/package.json` has:

```json
{
  "scripts": {
    "start": "node index.js",
    "dev": "nodemon index.js"
  },
  "engines": {
    "node": "18.x"
  }
}
```

### 2.4 Deploy
1. Railway will auto-deploy
2. Wait for deployment (2-3 minutes)
3. Copy your deployment URL (e.g., `https://your-app.up.railway.app`)
4. **Save this URL!**

### 2.5 Test Backend
Visit: `https://your-app.up.railway.app/api/auth/me`

Should return: `{"error":"No token provided"}`  
✅ This means your backend is working!

---

## 🎨 Step 3: Deploy Frontend to Vercel (5 minutes)

### 3.1 Update Environment Variables

Create `.env.production` in your project root:

```env
VITE_API_URL=https://your-backend-url.up.railway.app
```

**Replace `your-backend-url` with your actual Railway URL!**

### 3.2 Create Vercel Account
1. Go to [vercel.com](https://vercel.com)
2. Sign up with GitHub
3. Click "Add New Project"
4. Import your repository

### 3.3 Configure Build Settings

**Framework Preset:** Vite  
**Root Directory:** `./` (root)  
**Build Command:** `npm run build`  
**Output Directory:** `dist`

### 3.4 Add Environment Variables in Vercel

In Vercel project settings → Environment Variables:

```
VITE_API_URL = https://your-backend-url.up.railway.app
```

(Replace with your actual Railway URL)

### 3.5 Deploy
1. Click "Deploy"
2. Wait 2-3 minutes
3. Visit your Vercel URL
4. **You're live!** 🎉

---

## 🔒 Step 4: Configure CORS (Important!)

Update `server/index.js` CORS configuration:

```javascript
// CORS configuration
const corsOptions = {
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://your-vercel-app.vercel.app', // Add your Vercel URL
    'https://your-custom-domain.com'       // Add if you have custom domain
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));

// Socket.IO CORS
const io = new Server(server, {
  cors: {
    origin: [
      'http://localhost:5173',
      'https://your-vercel-app.vercel.app'  // Add your Vercel URL
    ],
    credentials: true
  }
});
```

**Push this change to GitHub** - Railway will auto-redeploy.

---

## ✅ Step 5: Verify Everything Works

### 5.1 Test Authentication
1. Visit your Vercel app
2. Click "Sign Up"
3. Create an account
4. ✅ Should work!

### 5.2 Test Focus Timer
1. Start a focus session
2. Check if time updates
3. Complete a session
4. ✅ Should save to database!

### 5.3 Test Real-time Features
1. Open Study Room
2. Create/Join a room
3. ✅ Should connect via Socket.IO!

---

## 🎯 Quick Deployment Checklist

- [ ] MongoDB Atlas cluster created
- [ ] MongoDB connection string obtained
- [ ] Railway account created
- [ ] Backend deployed to Railway
- [ ] Railway environment variables set
- [ ] Railway URL obtained
- [ ] Vercel account created
- [ ] Frontend deployed to Vercel
- [ ] Vercel environment variable set (VITE_API_URL)
- [ ] CORS updated with Vercel URL
- [ ] Backend redeployed with CORS changes
- [ ] Tested: Sign up/Login
- [ ] Tested: Focus timer
- [ ] Tested: Study room

---

## 🆘 Troubleshooting

### "Failed to fetch" errors
**Problem:** CORS not configured  
**Solution:** Add your Vercel URL to CORS in `server/index.js`

### Timer not saving
**Problem:** API URL not set  
**Solution:** Check Vercel environment variable `VITE_API_URL`

### Study room not connecting
**Problem:** Socket.IO connection failing  
**Solution:** Verify Railway backend is running, check Socket.IO CORS settings

### Database errors
**Problem:** MongoDB connection issues  
**Solution:** 
1. Check MONGODB_URI in Railway
2. Verify IP whitelist in MongoDB Atlas (should be 0.0.0.0/0)
3. Check database user permissions

---

## 💰 Cost Breakdown

| Service | Plan | Cost |
|---------|------|------|
| MongoDB Atlas | M0 (Free) | $0/month |
| Railway | Hobby | $5/month or free tier |
| Vercel | Hobby | $0/month |
| **Total** | | **~$0-5/month** |

---

## 🔗 Useful Links

- **MongoDB Atlas:** https://cloud.mongodb.com
- **Railway:** https://railway.app
- **Vercel:** https://vercel.com
- **Your Frontend:** https://your-app.vercel.app
- **Your Backend API:** https://your-app.up.railway.app

---

## 🎉 You're Done!

Your app is now deployed and accessible worldwide!

### What works:
✅ Focus timer with real-time updates  
✅ Task management  
✅ Points & leveling system  
✅ Focus streak calendar  
✅ Study rooms with video/audio  
✅ Real-time collaboration  
✅ Partnership features  

### Share your app:
Send your Vercel URL to friends and start focusing together! 🚀

---

## 📝 Optional: Custom Domain

### Add Custom Domain to Vercel
1. Go to Vercel project → Settings → Domains
2. Add your domain (e.g., `mytandemapp.com`)
3. Follow DNS setup instructions
4. Update CORS in backend with new domain
5. Redeploy backend

### Add Custom Domain to Railway (Backend)
1. Not necessary, but possible
2. Railway → Settings → Domains
3. Add custom subdomain (e.g., `api.mytandemapp.com`)
4. Update VITE_API_URL in Vercel

---

**Need help?** Check the troubleshooting section or feel free to ask! 🤝
