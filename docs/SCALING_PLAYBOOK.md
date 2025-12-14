# Scaling Playbook - When Bloqueio Takes Off

**Purpose:** What to do when you have real traction
**Trigger:** $2000+ MRR or 10,000+ active users
**Philosophy:** Don't scale prematurely - wait for demand

---

## Table of Contents

1. [When to Scale](#when-to-scale)
2. [Phase 1: Stabilize the Foundation](#phase-1-stabilize-the-foundation)
3. [Phase 2: Infrastructure Upgrade](#phase-2-infrastructure-upgrade)
4. [Phase 3: Product Expansion](#phase-3-product-expansion)
5. [Phase 4: Team Building](#phase-4-team-building)
6. [Technical Debt Roadmap](#technical-debt-roadmap)

---

## When to Scale

### ⚠️ Don't Scale If...

**Red Flags:**

- Revenue < $1000/mo (not sustainable)
- Churn > 30% monthly (retention problem)
- Growth stalled for 2+ months
- You're not enjoying it anymore
- Costs are eating into profit

**Action:** Focus on retention and product improvements, not scale

---

### ✅ Scale When You See...

**Green Lights:**

- $2000+ MRR consistently for 3+ months
- < 20% monthly churn
- Organic growth month-over-month
- Infrastructure straining (but not breaking)
- Clear feature requests from paying users
- You're turning down opportunities due to capacity

**Action:** Time to invest in growth

---

## Phase 1: Stabilize the Foundation

> **Timeline:** 2-4 weeks
> **Goal:** Fix what will break first under load
> **Investment:** $500-2000 (tools + possible contract help)

### Priority Fixes (Do These First)

**1. Monitoring & Alerting**

```bash
# Install monitoring tools
pnpm add @vercel/analytics @sentry/nextjs

#Setup error tracking
- Sentry for crash reporting ($26/mo Pro plan)
- Vercel Analytics for usage ($10/mo add-on)
- Neon monitoring dashboard (free)

# Create alerts
- Email alert if error rate > 5%
- Slack notification for critical errors
- Daily usage reports
```

**Why:** You can't scale what you can't measure. Catch issues before users complain.

---

**2. Database Performance**

```sql
-- Optimize queries
-- Add indexes for common queries
CREATE INDEX idx_room_status ON game_rooms(status, created_at);
CREATE INDEX idx_room_updated ON game_rooms(updated_at);

-- Add connection pooling
-- Neon includes this automatically with @neondatabase/serverless

-- Implement query caching
-- Cache room lists for 30 seconds
```

**Why:** Database becomes bottleneck at ~5K concurrent users.

---

**3. Rate Limiting**

```typescript
// Prevent abuse
import rateLimit from "express-rate-limit";

const createRoomLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // max 10 rooms per IP
  message: "Too many rooms created, try again later",
});

const moveRateLimiter = rateLimit({
  windowMs: 1000, // 1 second
  max: 5, // max 5 moves per second
  message: "Slow down, you're moving too fast!",
});
```

**Why:** Prevents spam, cheating, and API abuse.

---

**4. Automated Cleanup**

```sql
-- Delete old/abandoned rooms
CREATE OR REPLACE FUNCTION cleanup_old_rooms()
RETURNS void AS $$
BEGIN
  -- Delete rooms older than 48 hours
  DELETE FROM game_rooms
  WHERE created_at < NOW() - INTERVAL '48 hours'
    AND status != 'playing';

  -- Delete finished games older than 7 days
  DELETE FROM game_rooms
  WHERE created_at < NOW() - INTERVAL '7 days'
    AND status = 'finished';
END;
$$ LANGUAGE plpgsql;

-- Schedule via GitHub Actions or Vercel Cron (hourly)
-- Neon doesn't have built-in cron, but easy to implement
```

**Why:** Prevent database bloat, save costs.

---

### Deliverable: Stable Platform

**Checklist:**

- [ ] Error tracking live
- [ ] Performance monitoring active
- [ ] Rate limiting protecting APIs
- [ ] Database optimized for current load
- [ ] Automated cleanup running
- [ ] No critical bugs in backlog

---

## Phase 2: Infrastructure Upgrade

> **Timeline:** 4-6 weeks
> **Goal:** Handle 10x growth without breaking
> **Investment:** $2000-5000 (includes hiring contract developer)

### Decision Point: Keep Neon or Migrate?

**Keep Neon if:**

- Current cost < $100/mo
- Scaling to 50K users
- Team size = 1-2 people
- You value simplicity over control

**Migrate to Custom if:**

- Neon cost > $500/mo
- Scaling to 100K+ users
- Need custom real-time logic
- You have engineering resources

---

### If Keeping Neon (Recommended)

**Upgrade Plan:**

```
Current: Neon Free → $0/mo (3GB storage, 100h compute)
Step 1: Neon Launch → $19/mo (10GB storage, 300h compute)
Step 2: Neon Scale → $69/mo (50GB storage, 750h compute)
Step 3: Neon Business → Custom pricing (unlimited, dedicated support)
```

**Optimizations:**

- Enable connection pooling (built into Neon)
- Implement Redis caching for hot data
- Use CDN for static assets
- Optimize Realtime subscriptions

**Cost Estimate:**

- 10K users: ~$25-100/mo
- 30K users: ~$200-400/mo
- 50K users: ~$600-800/mo

---

### If Migrating to Custom Infrastructure

**Stack Recommendation:**

```
Frontend: Next.js (keep it)
Backend: Node.js + Express + Socket.io
Database: PostgreSQL (self-hosted or RDS)
Cache: Redis
Hosting: Railway, Fly.io, or DigitalOcean
CDN: Cloudflare
```

**Migration Steps:**

1. Set up custom WebSocket server (see IMPLEMENTATION_PLAN.md PR #14)
2. Implement server-side game validation
3. Migrate database schema
4. Update client to use new endpoints
5. Run in parallel with Neon
6. Gradual traffic migration
7. Deprecate Neon

**Timeline:** 6-8 weeks
**Cost:** $100-300/mo infrastructure + development time

**This is the original 28-PR plan.** Only do this if you have traction.

---

## Phase 3: Product Expansion

> **Timeline:** Ongoing (2-3 months per feature set)
> **Goal:** Increase revenue per user and retention
> **Investment:** Your time + possible contractors

### Feature Prioritization Framework

**Implement features that:**

1. Paying customers request most
2. Increase retention (reduce churn)
3. Support higher pricing tier
4. Can be built in < 4 weeks

**Avoid features that:**

- Nobody asks for
- Are technically complex
- Don't drive revenue
- Benefit only free users

---

### Tier 1: Revenue-Driving Features (Do First)

**1. Premium Themes & Customization**

```
Why: Low dev effort, high perceived value
Effort: 2 weeks
Revenue Impact: +15-20% conversion

Features:
- 10 board themes
- Custom piece colors
- Background music toggle
- Sound effects
```

**2. Player Statistics & Achievements**

```
Why: Strong retention driver
Effort: 3 weeks
Revenue Impact: -10% churn

Features:
- Win/loss record
- Average moves per game
- Best win streak
- Achievements/badges
- Leaderboard (weekly/all-time)
```

**3. Tournament Mode (New Tier)**

```
Why: Opens B2B opportunities
Effort: 4 weeks
Revenue Impact: New $19.99/mo tier

Features:
- Create tournament brackets
- Track scores across rounds
- Export tournament results
- Custom tournament rules
```

---

### Tier 2: Retention Features (Do Second)

**1. Friend System**

```
Effort: 2 weeks
Impact: +25% retention

Features:
- Add friends
- See when friends are online
- Challenge friends directly
- Friend activity feed
```

**2. Matchmaking**

```
Effort: 3 weeks
Impact: +15% DAU

Features:
- Quick match (random opponent)
- Skill-based matching (ELO)
- Rematch with same player
- Preferred time controls
```

**3. Mobile App (PWA First)**

```
Effort: 4 weeks
Impact: +40% addressable market

Approach:
- Progressive Web App first
- Add to homescreen
- Touch controls optimized
- Native app later if needed
```

---

### Tier 3: Scaling Features (Do Last)

**1. Multiple Game Modes**

```
Effort: 3 weeks each
Impact: Broadens appeal

Ideas:
- Timed mode (5-minute games)
- Zen mode (unlimited time)
- 2-player variant
- 6-player variant (if balanced)
```

**2. In-Game Chat & Voice**

```
Effort: 2 weeks
Impact: +10% session time

Features:
- Text chat in game
- Emoji reactions
- Voice chat (integrate existing service)
```

**3. Replay System**

```
Effort: 4 weeks
Impact: Content creation (YouTube, etc.)

Features:
- Save game replays
- Watch past games
- Share replay links
- Slow-motion playback
```

---

## Phase 4: Team Building

> **When:** Revenue > $5000/mo consistently
> **Why:** You can't do everything alone at scale
> **Budget:** 20-40% of revenue for contractors

### First Hires (Contract/Part-Time)

**1. Community Manager ($500-1000/mo)**

```
Responsibilities:
- Respond to user support
- Moderate Discord/community
- Gather feature feedback
- Run tournaments/events

Time: 10-20 hours/week
```

**2. Developer (Contract, $3000-5000/project)**

```
Responsibilities:
- Implement specific features
- Fix bugs
- Performance optimization
- Code reviews

When: You have 3+ months of feature backlog
```

**3. Designer (Contract, $1000-2000/project)**

```
Responsibilities:
- UI/UX improvements
- Marketing assets
- Premium themes
- Brand consistency

When: Design debt is piling up
```

---

### Full-Time Transition Point

**Consider full-time when:**

- Revenue > $10K/mo for 6+ months
- Growth rate > 20% month-over-month
- You're confident this is your focus
- Opportunity cost > your salary

**Don't go full-time if:**

- Revenue is volatile
- You have job satisfaction elsewhere
- Family obligations require stable income
- You're burning out

---

## Technical Debt Roadmap

### What Technical Debt to Fix When

**Fix Immediately (Blocking Growth):**

- Security vulnerabilities
- Data loss bugs
- Performance issues affecting UX
- Infrastructure reliability

**Fix When Revenue > $2K/mo:**

- Monolithic component refactoring
- Test coverage (aim for 60%+)
- Error handling improvements
- Accessibility basics

**Fix When Revenue > $5K/mo:**

- Full componentization (28-PR plan)
- Comprehensive testing (80%+ coverage)
- CI/CD automation
- Accessibility compliance

**Fix When Revenue > $10K/mo:**

- Mobile native app
- Advanced features
- Internationalization
- Enterprise features

---

## Cost Structure at Different Scales

### $500/mo Revenue (Early Stage)

```
Revenue:           $500
Infrastructure:    $0-19 (Neon free or Launch tier)
Tools:             $20  (Analytics, Monitoring)
Domain/Misc:       $5
Profit:            $456-475 ✅
Margin:            91-95%
```

---

### $2000/mo Revenue (Growing)

```
Revenue:           $2000
Infrastructure:    $70  (Neon Scale + CDN)
Tools:             $50  (Advanced analytics, etc.)
Support:           $300 (Part-time community manager)
Marketing:         $200 (Paid ads experiment)
Misc:              $50
Profit:            $1330 ✅
Margin:            67%
```

---

### $5000/mo Revenue (Scaled)

```
Revenue:           $5000
Infrastructure:    $200 (Neon Business or custom)
Tools:             $100
Support:           $800 (Community manager + support)
Development:       $1000 (Contract developer)
Marketing:         $500
Misc:              $100
Profit:            $2300 ✅
Margin:            46%
```

---

### $10,000/mo Revenue (Full Business)

```
Revenue:           $10,000
Infrastructure:    $800
Tools/SaaS:        $200
Support:           $1500
Development:       $2500 (Regular contractors)
Marketing:         $1500
Legal/Accounting:  $200
Your Salary:       $2000 (if part-time)
Misc:              $200
Profit:            $1100 ✅
Margin:            11%

Or take higher salary and less profit
```

---

## Decision Trees

### Should I Migrate from Neon?

```
Neon cost/mo > $500?
├─ Yes → Consider migration
│   └─ Can you afford 6-8 weeks dev time?
│       ├─ Yes → Migrate (IMPLEMENTATION_PLAN.md)
│       └─ No → Optimize Neon, stay on it
│
└─ No → Stay on Neon
```

---

### Should I Build Mobile App?

```
Have 5000+ active users?
├─ Yes → How many request mobile?
│   └─ >20% of feedback mentions mobile
│       ├─ Yes → Start with PWA (2 weeks)
│       └─ No → Optimize web mobile first
│
└─ No → Focus on web, too early
```

---

### Should I Hire?

```
Revenue > $3000/mo for 3+ months?
├─ Yes → Are you overwhelmed?
│   └─ Support backlog > 1 week
│       ├─ Yes → Hire community manager
│       └─ No → Keep solo, you're doing fine
│
└─ No → Stay solo, reinvest profit into product
```

---

## Success Stories (Inspiration)

### Realistic Outcomes

**Small Success ($500-2000/mo):**

- Nice side income
- Sustainable with 1-2 hours/day maintenance
- 5K-10K users
- Keep your day job, enjoy the extra income

**Medium Success ($2000-5000/mo):**

- Serious side hustle or part-time income
- 5-10 hours/week
- 10K-30K users
- Maybe quit job if lifestyle allows

**Big Success ($5000-10000/mo):**

- Full-time income potential
- 20-40 hours/week
- 30K-100K users
- This is now your job

**Massive Success ($10K+/mo):**

- Real business, real responsibilities
- Full-time+ commitment
- 100K+ users
- Consider raising funding or selling

---

## When to Exit

### Signs It's Time to Sell/Wind Down

**Sell if:**

- Someone offers 2-3x annual revenue
- You're burned out but product is growing
- You want to move to next project
- Opportunity cost is too high

**Wind down if:**

- Revenue declining for 6+ months
- You dread working on it
- Better opportunities elsewhere
- Costs > revenue

**Keep going if:**

- Still growing
- Still profitable
- Still enjoying it
- Clear path forward

---

## Appendix: Original 28-PR Plan

**When you're ready to scale seriously (Revenue > $5K/mo):**

Go back to [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) and execute the full refactoring plan:

- Phase 1: Foundation (PR #1-8)
- Phase 2: State Management (PR #9-12)
- Phase 3: WebSocket Infrastructure (PR #13-17)
- Phase 4: Multiplayer Features (PR #18-23)
- Phase 5: Polish & Production (PR #24-28)

**This is the professional-grade architecture.** Only needed if you're building a real business.

---

## Final Thoughts

**Remember:**

1. **Don't scale prematurely** - It's expensive and complex
2. **Listen to paying customers** - They tell you what to build
3. **Maintain profitability** - Growth means nothing without profit
4. **Enjoy the journey** - If it's not fun, what's the point?
5. **Know when to stop** - Not every project needs to be a unicorn

You're building a side income, not changing the world. That's perfectly fine and honestly, probably more realistic than most startup dreams.

Good luck! 🚀
