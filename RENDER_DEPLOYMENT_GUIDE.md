# 🎨 Deploy to Render.com - Complete Guide

## 🎯 Why Render?

✅ **100% Free Tier** - No credit card required  
✅ **Socket.IO Support** - Real-time features work perfectly  
✅ **Auto-deploy from GitHub** - Push code, it deploys  
✅ **SSL Certificates** - Free HTTPS included  
✅ **Easy Setup** - Deploy in 15 minutes  

---

## 📋 Prerequisites Checklist

Before starting, you need:
- [ ] GitHub account (with your code pushed)
- [ ] MongoDB Atlas account (free tier)
- [ ] 15 minutes of time

---

## 🗄️ Step 1: Setup MongoDB Atlas (5 minutes)

### 1.1 Create MongoDB Account
1. Go to: https://www.mongodb.com/cloud/atlas/register
2. Sign up (free - no credit card needed)
3. Choose **FREE** M0 tier
4. Select a cloud provider (AWS recommended)
5. Choose a region close to you
6. Click **"Create Cluster"**

### 1.2 Create Database User
1. Click **"Database Access"** (left sidebar)
2. Click **"Add New Database User"**
3. Choose **"Password"** authentication
4. Username: `tandemuser`
5. Password: Click **"Autogenerate Secure Password"** (save it!)
6. Database User Privileges: **"Read and write to any database"**
7. Click **"Add User"**

### 1.3 Whitelist All IPs (for Render)
1. Click **"Network Access"** (left sidebar)
2. Click **"Add IP Address"**
3. Click **"Allow Access from Anywhere"**
4. Confirm (this allows Render to connect)

### 1.4 Get Connection String
1. Go back to **"Database"**
2. Click **"Connect"** on your cluster
3. Choose **"Connect your application"**
4. Copy the connection string (looks like):
   ```
   mongodb+srv://tandemuser:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
5. **Replace `<password>`** with the password you saved
6. **Add database name** before the `?`:
   ```
   mongodb+srv://tandemuser:yourpassword@cluster0.xxxxx.mongodb.net/tandem-track-mate?retryWrites=true&w=majority
   ```
7. **Save this connection string!** You'll need it soon.

---

## 🚀 Step 2: Prepare Your Project

### 2.1 Update Root package.json

Make sure your root `package.json` has these scripts:

```json
{
  "name": "tandem-track-mate",
  "version": "1.0.0",
  "scripts": {
    "build": "npm run build",
    "install-all": "npm install && cd server && npm install",
    "start": "cd server && npm start"
  }
}
```

### 2.2 Update server/package.json

Make sure your `server/package.json` has:

```json
{
  "name": "tandem-track-mate-server",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start": "node index.js",
    "dev": "nodemon index.js"
  },
  "engines": {
    "node": "18.x"
  }
}
```

### 2.3 Update server/index.js

Add static file serving at the bottom (before `server.listen`):

```javascript
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ... your existing code ...

// Serve static files from React build (add this BEFORE server.listen)
const frontendPath = path.join(__dirname, '..', 'dist');
app.use(express.static(frontendPath));

// API routes should come BEFORE the catch-all route
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/partnerships', partnershipRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/focus', focusRoutes);
app.use('/api/points', pointsRoutes);

// Catch-all route to serve React app (add this AFTER API routes)
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api') && !req.path.startsWith('/socket.io')) {
    res.sendFile(path.join(frontendPath, 'index.html'));
  }
});

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`🎥 Video signaling server ready`);
});
```

### 2.4 Update CORS Configuration

In `server/index.js`, update CORS to accept your future Render URL:

```javascript
// CORS configuration
const corsOptions = {
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://tandem-track-mate.onrender.com', // Your Render URL (update after deployment)
    /\.onrender\.com$/  // Allow all Render subdomains
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
      'https://tandem-track-mate.onrender.com', // Update this too
      /\.onrender\.com$/
    ],
    credentials: true
  }
});
```

### 2.5 Commit and Push to GitHub

```bash
git add .
git commit -m "Configure for Render deployment"
git push origin main
```

---

## 🎨 Step 3: Deploy to Render (10 minutes)

### 3.1 Create Render Account
1. Go to: https://render.com
2. Click **"Get Started"**
3. Sign up with **GitHub** (recommended)
4. Authorize Render to access your repositories

### 3.2 Create New Web Service
1. Click **"New +"** (top right)
2. Select **"Web Service"**
3. Connect your GitHub repository
4. Find and select **"tandem-track-mate"** (or your repo name)
5. Click **"Connect"**

### 3.3 Configure Web Service

Fill in these settings:

**Name:**
```
tandem-track-mate
```
(This will be your URL: `tandem-track-mate.onrender.com`)

**Region:**
```
Oregon (US West) or Frankfurt (Europe)
```
(Choose closest to you)

**Branch:**
```
main
```
(or your default branch)

**Root Directory:**
```
(leave blank)
```

**Runtime:**
```
Node
```

**Build Command:**
```
npm install && npm run build && cd server && npm install
```

**Start Command:**
```
cd server && npm start
```

**Plan:**
```
Free
```

### 3.4 Add Environment Variables

Click **"Advanced"** → **"Add Environment Variable"**

Add these THREE variables:

**Variable 1:**
```
Key: MONGODB_URI
Value: mongodb+srv://tandemuser:yourpassword@cluster0.xxxxx.mongodb.net/tandem-track-mate?retryWrites=true&w=majority
```
(Use your actual MongoDB connection string from Step 1.4)

**Variable 2:**
```
Key: JWT_SECRET
Value: tandem-track-mate-secret-key-change-this-to-something-random-and-long-min-32-characters
```
(Generate a random string - make it long and unique!)

**Variable 3:**
```
Key: NODE_ENV
Value: production
```

**Generate Secure JWT_SECRET:**
```bash
# Run this in your terminal to generate a secure key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3.5 Deploy!

1. Click **"Create Web Service"**
2. Wait for deployment (5-10 minutes first time)
3. Watch the logs - should see:
   ```
   🚀 Server is running on port 10000
   🎥 Video signaling server ready
   ✅ Connected to MongoDB database
   ```

### 3.6 Get Your URL

Once deployed:
1. Your URL will be: `https://tandem-track-mate.onrender.com`
2. Click on it to test
3. You should see your app! 🎉

---

## 🔧 Step 4: Update CORS with Actual URL

Now that you know your Render URL, update CORS:

### 4.1 Update server/index.js

Replace the placeholder URLs with your actual Render URL:

```javascript
const corsOptions = {
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://tandem-track-mate.onrender.com', // ← Your actual URL here
    /\.onrender\.com$/
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

const io = new Server(server, {
  cors: {
    origin: [
      'http://localhost:5173',
      'https://tandem-track-mate.onrender.com', // ← Your actual URL here
      /\.onrender\.com$/
    ],
    credentials: true
  }
});
```

### 4.2 Push Changes

```bash
git add server/index.js
git commit -m "Update CORS with actual Render URL"
git push origin main
```

Render will **automatically redeploy** (watch the dashboard)!

---

## ✅ Step 5: Test Your Deployment

### 5.1 Test Homepage
Visit: `https://tandem-track-mate.onrender.com`
- ✅ Should see login page

### 5.2 Test Sign Up
1. Click "Sign Up"
2. Enter email and password
3. Click "Sign Up"
- ✅ Should create account and redirect to dashboard

### 5.3 Test Focus Timer
1. Click "Start" on timer
2. Wait a few seconds
3. Check if time updates
- ✅ Should count down and update focus time

### 5.4 Test Database Persistence
1. Complete a focus session
2. Refresh the page
3. Check if focus time is saved
- ✅ Should persist across refreshes

### 5.5 Test Study Room (Real-time)
1. Click on "Study Room" or navigation
2. Create/Join a room
3. Open another browser (or incognito)
4. Join the same room
- ✅ Should connect via Socket.IO

---

## 🎉 Success! You're Live!

Your app is now deployed at:
**https://tandem-track-mate.onrender.com**

### What Works:
✅ Focus timer with real-time updates  
✅ Task management  
✅ Points & leveling system  
✅ Focus streak calendar  
✅ Study rooms with video/audio  
✅ Real-time collaboration  
✅ Partnership features  
✅ All Socket.IO features  

---

## 🆘 Troubleshooting

### Issue: "Build Failed"

**Check Build Logs:**
1. Go to Render dashboard
2. Click on your service
3. Click "Logs" tab
4. Look for error messages

**Common fixes:**
- Ensure all dependencies are in package.json
- Check Node version compatibility
- Verify build command is correct

### Issue: "Application Error" or 503

**Possible causes:**
1. MongoDB connection failed
   - Check MONGODB_URI in Render environment variables
   - Verify IP whitelist (0.0.0.0/0) in MongoDB Atlas
   
2. Port binding issue
   - Make sure server uses `process.env.PORT`
   - Server should listen on `0.0.0.0`

### Issue: "Failed to fetch" in browser

**CORS not configured:**
1. Update CORS with your Render URL
2. Push to GitHub
3. Wait for auto-redeploy

### Issue: Database connection timeout

**MongoDB Atlas:**
1. Check Network Access whitelist (should be 0.0.0.0/0)
2. Verify database user exists and password is correct
3. Make sure connection string includes database name

### Issue: Socket.IO not connecting

**Check:**
1. Socket.IO CORS includes Render URL
2. Browser console for errors
3. Render logs for connection attempts

---

## 🔒 Security Checklist

After deployment:
- [ ] Changed JWT_SECRET to something random
- [ ] MongoDB user has limited permissions
- [ ] CORS only allows your domain
- [ ] Environment variables are set correctly
- [ ] No sensitive data in GitHub repo

---

## 💰 Render Free Tier Limits

**What you get:**
- ✅ 750 hours/month runtime
- ✅ 512 MB RAM
- ✅ Automatic SSL
- ✅ Auto-deploy from GitHub
- ⚠️ Spins down after 15 min inactivity
- ⚠️ Cold start (~30 sec) when waking up

**Tips:**
- App sleeps after 15 minutes of no traffic
- First request after sleep takes 30 seconds
- Upgrade to paid ($7/mo) to prevent sleeping

---

## 🚀 Optional: Keep Your App Awake

Free tier apps sleep after 15 minutes. To keep it awake:

### Option 1: Use Cron-job.org (Free)
1. Go to https://cron-job.org
2. Sign up (free)
3. Create new cron job:
   - URL: `https://tandem-track-mate.onrender.com`
   - Every: 10 minutes
4. Save

### Option 2: Use UptimeRobot (Free)
1. Go to https://uptimerobot.com
2. Sign up (free)
3. Add new monitor:
   - Type: HTTP(s)
   - URL: `https://tandem-track-mate.onrender.com`
   - Interval: 5 minutes
4. Save

This pings your app every few minutes to keep it awake!

---

## 📊 Monitor Your App

### Render Dashboard
- View logs in real-time
- Check deployment status
- Monitor resource usage
- See request metrics

### MongoDB Atlas
- Monitor database connections
- Check query performance
- View storage usage
- Track operations

---

## 🔄 Auto-Deploy Updates

**Render auto-deploys when you push to GitHub!**

```bash
# Make changes to your code
git add .
git commit -m "Your update message"
git push origin main

# Render automatically:
# 1. Detects push
# 2. Runs build command
# 3. Deploys new version
# 4. Takes ~2-5 minutes
```

Watch deployment in Render dashboard → Logs

---

## 🌐 Custom Domain (Optional)

### Add Your Own Domain

1. **Buy a domain** (from Namecheap, GoDaddy, etc.)

2. **In Render Dashboard:**
   - Go to your service
   - Click "Settings"
   - Scroll to "Custom Domains"
   - Click "Add Custom Domain"
   - Enter: `www.yourdomain.com`

3. **In Your Domain Registrar:**
   - Add CNAME record:
     - Name: `www`
     - Value: `tandem-track-mate.onrender.com`

4. **Update CORS:**
   ```javascript
   origin: [
     'https://www.yourdomain.com',
     'https://tandem-track-mate.onrender.com',
     // ...
   ]
   ```

5. **Push to GitHub** → Auto-deploys

SSL certificate is automatically generated!

---

## 🎓 Next Steps

1. ✅ Share your URL with friends
2. ✅ Start using your app
3. ✅ Monitor usage in Render dashboard
4. ✅ Set up UptimeRobot to prevent sleeping
5. ✅ Consider upgrading if you need 24/7 availability

---

## 📞 Need Help?

**Check these resources:**
- Render Docs: https://render.com/docs
- MongoDB Atlas Docs: https://docs.atlas.mongodb.com
- Your deployment logs in Render dashboard

**Common issues solved in troubleshooting section above!**

---

## 🎉 Congratulations!

Your Tandem Track Mate app is now live and accessible to anyone!

**Your URL:** `https://tandem-track-mate.onrender.com`

Share it with friends and start focusing together! 🚀

---

**Deployment completed successfully!** ✅
