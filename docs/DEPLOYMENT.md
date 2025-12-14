# Deployment Guide - Bloqueio MVP

**Last Updated:** December 14, 2025

---

## 🎯 Overview

This guide walks through deploying the Bloqueio MVP to Vercel with Neon Postgres database.

**Estimated Time:** 10-15 minutes

---

## ✅ Pre-Deployment Checklist

Before deploying, verify:

- [x] All Phase 5 tasks complete
- [x] Build succeeds locally (`pnpm build`)
- [x] No TypeScript errors
- [x] No ESLint errors
- [x] Neon database created and tested locally
- [x] All changes committed to git
- [x] Changes pushed to GitHub

---

## 🚀 Deployment Steps

### Step 1: Merge to Main Branch

```bash
# Switch to main
git checkout main

# Merge feature branch
git merge feature/polish-and-deploy --no-ff -m "feat: Phase 5 - Polish & Deploy (Tasks 1-7 complete)"

# Push to GitHub
git push origin main
```

### Step 2: Connect GitHub to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Click "Add New Project"
3. Import your GitHub repository: `gbr5/bloqueio-mvp`
4. Vercel will auto-detect Next.js configuration

### Step 3: Configure Environment Variables

**In Vercel Project Settings:**

1. Go to "Settings" → "Environment Variables"
2. Add the following:

```
# Production Database (Neon)
DATABASE_URL=<your-neon-production-url>

# App URL (will be updated after first deploy)
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

**To get Neon Production URL:**

1. Go to [console.neon.tech](https://console.neon.tech)
2. Select your project
3. Go to "Connection Details"
4. Copy the connection string (starts with `postgresql://`)
5. Paste into Vercel environment variable

**Alternative (Recommended):** Use Vercel Storage Integration

1. In Vercel project, go to "Storage"
2. Click "Create Database" → "Postgres"
3. Follow prompts to create Neon database
4. Vercel will auto-inject `DATABASE_URL` environment variable
5. No manual configuration needed!

### Step 4: Deploy

1. Click "Deploy" in Vercel
2. Wait 2-3 minutes for build
3. Vercel will provide a URL: `https://bloqueio-mvp-xxxx.vercel.app`

### Step 5: Initialize Production Database

**Option A: Use Vercel Postgres (Recommended)**

Vercel automatically creates the database schema from your migrations.

**Option B: Manual Setup**

1. Connect to production Neon database:

```bash
psql "<your-neon-production-url>"
```

2. Run initialization script:

```sql
-- Copy contents from scripts/init-db.sql
-- Paste and execute
```

### Step 6: Update App URL

1. Copy your deployed Vercel URL
2. Update environment variable in Vercel:
   - `NEXT_PUBLIC_APP_URL=https://your-actual-vercel-url.vercel.app`
3. Redeploy (or wait for auto-redeploy)

### Step 7: Verify Deployment

Test the following flow:

1. ✅ Visit production URL
2. ✅ Create a room
3. ✅ Copy room code
4. ✅ Open incognito window
5. ✅ Join room with code
6. ✅ Start game (as host)
7. ✅ Verify both players see game board
8. ✅ Check browser console for errors
9. ✅ Test "Leave Game" button
10. ✅ Test "Play Again" functionality

---

## 🔍 Troubleshooting

### Build Fails

**Error:** `Module not found` or `Type errors`

```bash
# Run locally first
pnpm build

# Fix any errors shown
# Commit and push fixes
```

### Database Connection Fails

**Error:** `Connection refused` or `Authentication failed`

1. Check `DATABASE_URL` is correct in Vercel environment variables
2. Verify Neon database is running (check Neon console)
3. Ensure IP allowlist includes `0.0.0.0/0` (Vercel uses dynamic IPs)

### Room Not Found Error

**Error:** `Room not found` when joining

1. Verify database schema is created (check Neon SQL Editor)
2. Run `scripts/init-db.sql` in production database
3. Check `game_rooms` table exists

### Polling Not Working

**Error:** Players don't see each other's moves

1. Check browser console for network errors
2. Verify `loadGameRoom` server action is accessible
3. Check Vercel function logs for errors
4. Ensure database `updated_at` column has default `NOW()`

---

## 📊 Post-Deployment Monitoring

### Metrics to Track (Week 1)

Create a spreadsheet to track:

- **Rooms Created:** \_\_\_ per day
- **Games Played:** \_\_\_ per day
- **Completion Rate:** \_\_\_% (games finished / games started)
- **Return Rate:** \_\_\_% (users who play 2+ games)
- **Average Session Time:** \_\_\_ minutes
- **Errors:** List any critical bugs

### Vercel Analytics

Enable in Vercel dashboard:

1. Go to "Analytics" tab
2. Enable Web Vitals tracking
3. Monitor:
   - Page load time
   - Time to First Byte (TTFB)
   - First Contentful Paint (FCP)

### Database Monitoring

Monitor in Neon Console:

- **Storage Used:** \_\_\_ MB
- **Active Connections:** \_\_\_
- **Query Performance:** Slow queries?

---

## 🎯 Success Criteria

**MVP Launch Successful If:**

- ✅ App is accessible at public URL
- ✅ Can create and join rooms
- ✅ 2+ players can play a full game
- ✅ No critical bugs in first 24 hours
- ✅ At least 5 test games completed successfully

**Go/No-Go Decision (Week 1):**

- ✅ **GO:** 50+ games played + 20%+ return rate → Proceed to monetization
- 🚨 **NO-GO:** < 20 games played + < 5% return rate → Pivot or stop

---

## 🔄 Continuous Deployment

Vercel automatically deploys on every push to `main`:

```bash
# Make changes
git add .
git commit -m "fix: some bug"
git push origin main

# Vercel deploys automatically
# Check deployment status in Vercel dashboard
```

---

## 🚨 Rollback Procedure

If critical bug found in production:

### Option 1: Instant Rollback (Vercel UI)

1. Go to Vercel dashboard
2. Click "Deployments"
3. Find last working deployment
4. Click "..." → "Promote to Production"
5. Instant rollback (< 30 seconds)

### Option 2: Fix Forward

1. Fix bug locally
2. Test with `pnpm build && pnpm start`
3. Commit and push
4. Vercel auto-deploys fix

### Option 3: Database Rollback

If database schema corrupted:

1. Go to Neon console
2. "Backups" → "Restore"
3. Select backup timestamp (Neon keeps 24h backups)
4. Restore to new branch
5. Update `DATABASE_URL` in Vercel

---

## 📱 Testing on Mobile

After deployment:

1. Open production URL on mobile device
2. Test full flow (create, join, play)
3. Check for responsive design issues
4. Test on iOS Safari and Android Chrome

---

## 🎉 Launch Announcement

After successful deployment:

### Social Media Post Template

```
🎮 Just launched Bloqueio Online - a multiplayer strategy board game!

✅ Real-time multiplayer (2-4 players)
✅ No account needed
✅ Free to play
✅ Play with friends anywhere

Try it: https://your-vercel-url.vercel.app

Built with Next.js, React, and Neon Postgres.
Feedback welcome! 🚀

#indiegame #gamedev #nextjs #typescript
```

### Where to Share

- [x] Twitter/X
- [x] Reddit: r/WebGames, r/boardgames, r/IndieGaming
- [x] Hacker News: Show HN
- [x] Product Hunt (if positive initial response)
- [x] LinkedIn (for dev community)

---

## 📝 Next Steps

**If Launch Goes Well:**

1. Phase 6: Monetization (Stripe integration)
2. Phase 7: User accounts and profiles
3. Phase 8: Matchmaking system
4. Phase 9: Mobile app (PWA or React Native)

**If Launch Has Issues:**

1. Collect user feedback
2. Fix critical bugs
3. Iterate on UX
4. Re-launch

---

**Deployed URL:** https://******\_\_\_******  
**Deployed Date:** ******\_\_\_******  
**Status:** 🚀 Live / 🚧 In Progress / 🔴 Issues

---

## 🔗 Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Neon Documentation](https://neon.tech/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)

---

**Last Updated:** December 14, 2025
