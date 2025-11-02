# 🚀 Render Deployment - Quick Checklist

Use this checklist while deploying to Render.com

## ☑️ Pre-Deployment

- [ ] Code pushed to GitHub
- [ ] MongoDB Atlas account created
- [ ] MongoDB cluster created (FREE M0 tier)
- [ ] Database user created with password
- [ ] Network Access set to "Allow from Anywhere" (0.0.0.0/0)
- [ ] MongoDB connection string obtained and saved
- [ ] Connection string includes database name: `/tandem-track-mate?`

## ☑️ During Deployment

- [ ] Signed up at render.com with GitHub
- [ ] Created new Web Service
- [ ] Connected GitHub repository
- [ ] Set Build Command: `npm install && npm run build && cd server && npm install`
- [ ] Set Start Command: `cd server && npm start`
- [ ] Selected FREE plan
- [ ] Added Environment Variable: `MONGODB_URI`
- [ ] Added Environment Variable: `JWT_SECRET` (random 32+ characters)
- [ ] Added Environment Variable: `NODE_ENV=production`
- [ ] Clicked "Create Web Service"
- [ ] Waited for first deployment (5-10 min)

## ☑️ Post-Deployment

- [ ] Deployment succeeded (check logs)
- [ ] Noted Render URL: `https://tandem-track-mate.onrender.com`
- [ ] Tested homepage loads
- [ ] Tested sign up/login
- [ ] Tested focus timer
- [ ] Tested database persistence
- [ ] (Optional) Set up UptimeRobot to prevent sleeping
- [ ] (Optional) Added custom domain

## ☑️ If Issues Occur

- [ ] Checked deployment logs for errors
- [ ] Verified MongoDB connection string is correct
- [ ] Verified IP whitelist in MongoDB Atlas (0.0.0.0/0)
- [ ] Checked environment variables are set correctly
- [ ] Verified build completed successfully
- [ ] Tested database connection from MongoDB Atlas

## 📋 Your Deployment Info

Fill this in as you go:

```
MongoDB Atlas:
- Cluster: _____________________
- Username: _____________________
- Database: tandem-track-mate

Render:
- Service Name: _____________________
- URL: https://_____________________.onrender.com

JWT Secret: _______________________ (keep secret!)

Deployment Date: _____________________
```

## 🎉 Success Indicators

✅ Build logs show: "Build successful"  
✅ Deploy logs show: "🚀 Server is running on port 10000"  
✅ Deploy logs show: "✅ Connected to MongoDB database"  
✅ Homepage loads without errors  
✅ Can create account  
✅ Can start focus timer  
✅ Data persists after page refresh  

## 🆘 Common Issues

### Build Failed
- Check if all dependencies are in package.json
- Verify build command is correct
- Check Node version compatibility

### 503 Service Unavailable
- Server failed to start
- Check MongoDB connection
- Verify environment variables
- Check server logs for errors

### CORS Errors
- Update CORS in server/index.js with your Render URL
- Push to GitHub
- Wait for auto-redeploy

### Database Connection Failed
- Verify MongoDB connection string
- Check IP whitelist (must be 0.0.0.0/0)
- Verify database user credentials

---

**Need help?** Check RENDER_DEPLOYMENT_GUIDE.md for detailed instructions!
