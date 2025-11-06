# ⚡ Quick Fix - 2 Steps to Connect Frontend to Backend

## ✅ Step 1: Add Environment Variable to Vercel (1 minute)

### Go to Vercel Dashboard:
1. Open: https://vercel.com
2. Click your project: **StudySync11**
3. Click: **Settings** (top menu)
4. Click: **Environment Variables** (left sidebar)

### Add this variable:
```
Name:  VITE_API_URL
Value: https://studysync-backend-2.onrender.com
```

**Important settings:**
- ✅ Check **Production**
- ✅ Check **Preview**  
- ✅ Check **Development**
- ✅ Click **Save**

## ✅ Step 2: Redeploy (automatic or manual)

### Option A: Automatic (Already triggered! ✨)
Your code was just pushed to GitHub, so Vercel will auto-deploy in **~2 minutes**.

**Watch deployment:**
1. Go to **Deployments** tab in Vercel
2. You'll see a new deployment building
3. Wait for it to turn green ✅

### Option B: Manual (if needed)
1. Go to **Deployments** tab
2. Click **"..."** menu on latest deployment
3. Click **"Redeploy"**
4. Click **"Redeploy"** to confirm

## 🎯 How to Verify It's Fixed

### After deployment completes:

1. **Open your Vercel site** in browser
2. **Open DevTools** (F12 or Right-click → Inspect)
3. **Go to Console tab**

### You should see:
```
✅ [API] GET https://studysync-backend-2.onrender.com/api/auth/me
✅ Socket.IO connected to https://studysync-backend-2.onrender.com
```

### No more errors like:
```
❌ WebSocket connection to 'ws://localhost:3001/socket.io/' failed
```

## 📊 What Was Fixed

| File | What Changed |
|------|--------------|
| `StudyRoom.tsx` | Socket.IO now uses `VITE_API_URL` instead of hardcoded localhost |
| `PointsDisplay.tsx` | API calls now use `VITE_API_URL` instead of hardcoded localhost |
| `.env.production` | Created with your Render backend URL |

## 🚨 Common Issues & Solutions

### Issue: Still seeing localhost errors
**Solution:** 
- Clear browser cache (Ctrl+Shift+Delete)
- Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
- Check Vercel deployment is complete

### Issue: Environment variable not working
**Solution:**
- Make sure you saved it in Vercel settings
- Make sure you selected all environments (Production, Preview, Development)
- Redeploy after adding the variable

### Issue: Socket.IO still can't connect
**Solution:**
Your Render backend might need to allow your Vercel domain. Check `server/index.js` has proper CORS:

```javascript
const corsOptions = {
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://your-vercel-domain.vercel.app',  // Add your actual Vercel URL!
    'https://*.vercel.app'  // Allow all Vercel preview deployments
  ],
  credentials: true
};

app.use(cors(corsOptions));

const io = new Server(server, {
  cors: corsOptions
});
```

## ⏱️ Timeline

- ✅ **Now**: Code pushed to GitHub
- ⏳ **In 2 minutes**: Vercel auto-deploys
- ⏳ **Add env variable**: Takes 30 seconds
- ⏳ **Redeploy (if needed)**: Takes 2 minutes
- ✅ **Total time**: ~5 minutes

## 🎉 Final Checklist

- [ ] Environment variable added to Vercel (`VITE_API_URL`)
- [ ] Deployment completed (green checkmark in Vercel)
- [ ] Open site and check console (no localhost errors)
- [ ] Test login/signup (should work)
- [ ] Test timer (should save to database)
- [ ] Test video call (Socket.IO should connect)

---

## 📞 Need Help?

If you're still seeing issues after following these steps:

1. Share a screenshot of:
   - Vercel environment variables page
   - Browser console errors
   - Vercel deployment logs

2. Check your Render backend is running:
   - Visit: https://studysync-backend-2.onrender.com
   - Should say: `{"message":"Server is running"}`

---

**Your backend is perfect! Just need to tell the frontend where to find it.** 🎯

**ETA: Working in ~5 minutes after you add the environment variable!** ⚡
