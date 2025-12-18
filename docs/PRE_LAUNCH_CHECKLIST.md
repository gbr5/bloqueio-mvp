# Pre-Launch Checklist - Bloqueio Online

**Goal:** Ship to public and start validating market  
**Current Status:** ~75% complete (bot system done, multiplayer working)  
**Target Launch:** 1-2 weeks from now

---

## ✅ What's Already Complete

### Core Gameplay (100%)

- ✅ Full 4-player board game mechanics
- ✅ 2-player mode support
- ✅ Barrier placement and validation
- ✅ Path validation (BFS pathfinding)
- ✅ Win detection
- ✅ Move undo functionality
- ✅ Turn-based gameplay

### Bot System (75%)

- ✅ Easy bot difficulty (random + basic pathfinding)
- ✅ Medium bot difficulty (weighted moves, 30% barriers)
- ✅ Hard bot difficulty (2-move lookahead, 40% barriers)
- ✅ Bot vs Human games
- ✅ Bot vs Bot games
- ✅ Server-side bot orchestration
- ✅ Deterministic bot behavior (SeededRNG)
- ✅ Bot decision logging

### Infrastructure (90%)

- ✅ Neon Postgres database
- ✅ Vercel deployment
- ✅ Better Auth integration (OAuth + email/password)
- ✅ Prisma ORM setup
- ✅ Database migrations
- ✅ Room creation/joining
- ✅ Multiplayer sync with polling
- ✅ Session management

### UI/UX (70%)

- ✅ Home screen
- ✅ Create room flow
- ✅ Join room flow
- ✅ Waiting lobby
- ✅ Game board
- ✅ Bot selection UI
- ✅ Player indicators
- ✅ Turn indicators
- ✅ Winner announcement

---

## 🚨 Critical Blockers (Must Fix Before Launch)

### 1. Authentication Flow Issues

**Status:** ⚠️ Needs verification  
**Priority:** HIGH  
**Estimate:** 2-4 hours

**Tasks:**

- [ ] Test guest player flow end-to-end
- [ ] Test authenticated user flow end-to-end
- [ ] Verify session persistence across page refreshes
- [ ] Test "Sign in or Continue as Guest" modal
- [ ] Ensure room access works for both auth types

**Acceptance Criteria:**

- Guest players can create/join rooms without signup
- Authenticated users see their profile
- No auth errors in console
- Sessions don't expire during active games

---

### 2. Real-time Sync Validation

**Status:** ⚠️ Needs production testing  
**Priority:** HIGH  
**Estimate:** 2-3 hours

**Tasks:**

- [ ] Test 2-player game on different networks
- [ ] Test 4-player game on different networks
- [ ] Verify polling rate (2 seconds) is adequate
- [ ] Test with slow network conditions
- [ ] Verify no race conditions on simultaneous moves
- [ ] Test reconnection behavior (refresh during game)

**Acceptance Criteria:**

- All players see moves within 2-3 seconds
- No duplicate moves
- No lost moves
- Game state stays consistent across all clients

---

### 3. Mobile Experience

**Status:** ❌ Not optimized  
**Priority:** MEDIUM (desktop-first MVP)  
**Estimate:** 4-6 hours

**Tasks:**

- [ ] Test on iPhone (Safari)
- [ ] Test on Android (Chrome)
- [ ] Fix barrier placement on mobile (touch events)
- [ ] Ensure buttons are tappable (min 44px)
- [ ] Test in portrait and landscape
- [ ] Add viewport meta tag for mobile

**Acceptance Criteria:**

- Game is playable on mobile (even if not perfect)
- No broken layouts
- Can place barriers via touch
- Can move pieces via touch

---

### 4. Error Handling & Edge Cases

**Status:** ⚠️ Minimal error handling  
**Priority:** HIGH  
**Estimate:** 3-4 hours

**Tasks:**

- [ ] Add error boundary component
- [ ] Handle "room not found" gracefully
- [ ] Handle "room full" scenario
- [ ] Handle database connection errors
- [ ] Add loading states to all async operations
- [ ] Add user-friendly error messages (no raw errors)
- [ ] Test offline behavior
- [ ] Add "something went wrong" fallback UI

**Acceptance Criteria:**

- Users never see raw error stacks
- Clear error messages guide next actions
- App doesn't crash on errors
- Loading states prevent confusion

---

### 5. Performance & Optimization

**Status:** ⚠️ Needs profiling  
**Priority:** MEDIUM  
**Estimate:** 2-3 hours

**Tasks:**

- [ ] Check for memory leaks (polling intervals)
- [ ] Verify bot compute times don't exceed 5s
- [ ] Test with 100+ barriers on board
- [ ] Check React DevTools for unnecessary re-renders
- [ ] Optimize database queries (add indexes if needed)
- [ ] Test page load time on slow 3G

**Acceptance Criteria:**

- Page loads in < 3 seconds on 3G
- No memory leaks after 30 min game session
- Bots respond within 5 seconds
- UI feels responsive (no janky animations)

---

## 📋 Nice-to-Have (Can Ship Without)

### 6. Polish & UX Improvements

**Status:** ⏳ Optional  
**Priority:** LOW  
**Estimate:** 4-6 hours

**Tasks:**

- [ ] Add sound effects (move, barrier, win)
- [ ] Add animations (smooth piece movement)
- [ ] Improve waiting lobby visuals
- [ ] Add "Game Rules" modal or link
- [ ] Add "About" page with credits
- [ ] Improve color scheme for accessibility
- [ ] Add dark mode toggle (already dark, add light?)
- [ ] Add chat feature (optional for MVP)

**Acceptance Criteria:**

- Game feels polished
- Users understand rules without asking
- Accessibility basics covered

---

### 7. Analytics & Monitoring

**Status:** ❌ Not implemented  
**Priority:** MEDIUM (for iteration)  
**Estimate:** 2-3 hours

**Tasks:**

- [ ] Add Vercel Analytics (free tier)
- [ ] Track key events:
  - Rooms created
  - Games started
  - Games completed
  - Bots used (by difficulty)
  - Winner outcomes
- [ ] Set up error tracking (Sentry or Vercel)
- [ ] Add performance monitoring
- [ ] Track conversion: visitors → room creation

**Acceptance Criteria:**

- Can see daily active users
- Can see completion rates
- Can debug production issues
- Know which features are used most

---

### 8. SEO & Discoverability

**Status:** ⏳ Minimal  
**Priority:** MEDIUM  
**Estimate:** 1-2 hours

**Tasks:**

- [ ] Add proper meta tags (title, description, OG image)
- [ ] Create OG preview image (game screenshot)
- [ ] Add favicon
- [ ] Update README.md for GitHub
- [ ] Add robots.txt (allow indexing)
- [ ] Add sitemap.xml
- [ ] Test social media previews (Twitter, Discord)

**Acceptance Criteria:**

- Game link shows nice preview on social media
- Search engines can index the site
- GitHub repo looks professional

---

### 9. Documentation for Users

**Status:** ❌ Missing  
**Priority:** LOW (can iterate)  
**Estimate:** 2-3 hours

**Tasks:**

- [ ] Create simple "How to Play" page
- [ ] Add FAQ section
- [ ] Document bot difficulties
- [ ] Create demo video or GIF
- [ ] Add tooltips for first-time users
- [ ] Create shareable room link preview

**Acceptance Criteria:**

- New users understand rules quickly
- Common questions are answered
- Share-worthy demo exists

---

### 10. Testing Suite

**Status:** ⚠️ Manual testing only  
**Priority:** LOW (post-launch)  
**Estimate:** 6-8 hours

**Tasks:**

- [ ] Add E2E tests (Playwright)
- [ ] Test create room flow
- [ ] Test join room flow
- [ ] Test full game completion
- [ ] Add unit tests for bot strategies
- [ ] Add unit tests for game logic
- [ ] Set up CI/CD pipeline

**Acceptance Criteria:**

- Critical flows have automated tests
- Can deploy with confidence
- Tests run on every PR

---

## 🚀 Launch Preparation

### Pre-Launch Testing (4-6 hours)

**Phase 1: Internal Testing**

- [ ] Play complete 2P game (human vs bot)
- [ ] Play complete 4P game (4 humans)
- [ ] Play complete 4P game (2 humans, 2 bots)
- [ ] Test all 3 bot difficulties
- [ ] Test on Chrome, Firefox, Safari
- [ ] Test on mobile (iOS + Android)
- [ ] Test with slow network (Chrome DevTools throttling)

**Phase 2: Friends & Family (10-15 people)**

- [ ] Send game link to 10-15 friends
- [ ] Ask them to play at least 1 complete game
- [ ] Collect feedback on:
  - Confusing parts
  - Bugs encountered
  - Enjoyment level (1-10)
  - Would they play again?
- [ ] Fix critical bugs discovered

**Phase 3: Soft Launch (Reddit/Discord)**

- [ ] Post to r/WebGames (Saturday)
- [ ] Post to r/boardgames Free Talk
- [ ] Share in relevant Discord servers
- [ ] Monitor for issues first 24 hours
- [ ] Be ready to hotfix

---

## 📊 Success Metrics (Week 1)

**Minimum Viable Success:**

- ✅ 50+ unique visitors
- ✅ 20+ rooms created
- ✅ 10+ games completed
- ✅ No critical bugs/crashes
- ✅ Average rating 6+/10 from testers

**Stretch Goals:**

- 🎯 100+ unique visitors
- 🎯 50+ rooms created
- 🎯 25+ games completed
- 🎯 5+ users play multiple games
- 🎯 1+ user shares without being asked

---

## 🎯 MVP Launch Checklist Summary

### MUST DO (Before Public Launch)

1. ✅ Core gameplay working
2. ✅ Bot system complete
3. ✅ Multiplayer sync working
4. ⚠️ **Auth flow tested** (2-4 hours)
5. ⚠️ **Real-time sync validated** (2-3 hours)
6. ⚠️ **Error handling** (3-4 hours)
7. ⚠️ **Basic mobile support** (4-6 hours)
8. ⚠️ **Performance check** (2-3 hours)

**Total remaining work: 13-20 hours**

### SHOULD DO (Before Public Launch)

9. ⏳ Analytics & monitoring (2-3 hours)
10. ⏳ SEO & meta tags (1-2 hours)

**Total nice-to-have: 3-5 hours**

### CAN WAIT (Post-Launch Iteration)

11. ⏳ Polish & UX (4-6 hours)
12. ⏳ User documentation (2-3 hours)
13. ⏳ Testing suite (6-8 hours)

**Total post-launch: 12-17 hours**

---

## 🗓️ Suggested Timeline

### Week 1 (Now → Launch)

- **Day 1-2:** Fix auth flow + error handling (6-8 hours)
- **Day 3-4:** Real-time sync testing + mobile basics (6-9 hours)
- **Day 5:** Performance check + analytics setup (4-6 hours)
- **Day 6:** SEO + internal testing (3-4 hours)
- **Day 7:** Soft launch + monitoring

### Week 2 (Post-Launch)

- Monitor for critical bugs
- Collect user feedback
- Iterate on UX based on feedback
- Add nice-to-have features if traction exists

---

## ✅ Go/No-Go Decision Criteria

**GO if:**

- ✅ Can complete 2P and 4P games without crashes
- ✅ Auth works for guests and logged-in users
- ✅ Real-time sync works across networks
- ✅ Mobile is playable (even if not perfect)
- ✅ Error handling prevents app crashes
- ✅ At least 3 friends say it's fun

**NO-GO if:**

- ❌ Games crash or freeze frequently
- ❌ Auth is completely broken
- ❌ Moves don't sync between players
- ❌ Mobile is completely unusable
- ❌ Critical security issues found

---

**Current Status:** ~80% ready for soft launch  
**Estimated time to launch-ready:** 13-20 hours (spread over 1 week)  
**Recommended next action:** Start with auth flow testing + error handling (highest impact, 6-8 hours)
