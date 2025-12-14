# Business Strategy - Bloqueio Online

**Purpose:** Turn a working multiplayer game into sustainable side income
**Goal:** $500-2000/month recurring revenue (modest, achievable)
**Approach:** Freemium model with premium features

---

## Table of Contents

1. [Market Validation Strategy](#market-validation-strategy)
2. [Monetization Models](#monetization-models)
3. [Pricing Strategy](#pricing-strategy)
4. [Growth Channels](#growth-channels)
5. [Customer Acquisition](#customer-acquisition)
6. [Financial Projections](#financial-projections)
7. [Success Milestones](#success-milestones)

---

## Market Validation Strategy

### Phase 1: Friends & Family (Week 1-2)

**Goal:** Validate core experience, find critical bugs

**Steps:**

1. **Send to 10-15 friends**

   - Direct message with game link
   - Ask for 20 minutes of their time
   - Watch them play (if possible)
   - Ask: "Would you play this again?" "Would you share it?"

2. **What to measure:**

   - Game completion rate (did they finish?)
   - Time to understand rules
   - Technical issues encountered
   - Enjoyment level (1-10 rating)

3. **What to ask:**
   - "What confused you?"
   - "What was frustrating?"
   - "What would make you come back?"
   - "Would you play with your friends?"

**Success Criteria:**

- ✅ 70%+ completion rate
- ✅ Average rating 7+/10
- ✅ At least 3 people say they'd play again
- ✅ At least 1 person shares without being asked

**If you fail:** Fix critical issues, test with next group

---

### Phase 2: Small Communities (Week 2-3)

**Goal:** Test with strangers who like board games

**Where to post:**

1. **Reddit (low-risk, high-reach):**

   - r/boardgames (~5M members) - Saturday Free Talk
   - r/tabletopgamedesign (~100K) - Playtesting thread
   - r/WebGames (~400K) - Direct post OK
   - r/incremental_games (~200K) - If game loop fits

2. **Discord Servers:**

   - Board Game Design Lab
   - Tabletop Game Developers
   - Indie Game Developers

3. **Hacker News:**
   - "Show HN: Bloqueio - Multiplayer Quoridor-style game I built"
   - Best posted Tuesday-Thursday, 8-10am PST

**Post Template:**

```markdown
# [Platform] - I built a multiplayer Quoridor-style board game

Hey! I built a real-time multiplayer version of a Quoridor-style
board game called Bloqueio. It's free to play, no signup required.

[Link to game]

Looking for feedback on:

- Game balance
- UI/UX clarity
- Performance issues
- Whether you'd actually play this with friends

Tech: Next.js + Neon (serverless Postgres) + polling
Players: 2-4
Time: ~10-15 minutes per game

Would love to hear what you think!
```

**What to measure:**

- Click-through rate (views → plays)
- Organic sharing (link shared by players)
- Comments/feedback quality
- Return visitors (played 2+ times)

**Success Criteria:**

- ✅ 100+ unique players
- ✅ 50+ completed games
- ✅ 5+ feature requests/suggestions
- ✅ 10%+ return rate

**If you fail:**

- Low engagement → Game isn't fun, pivot core mechanics
- High start, low completion → Onboarding issue
- No returns → Missing retention hook

---

### Phase 3: Validate Willingness to Pay (Week 4)

**Goal:** Find out if anyone would pay for premium features

**Method:** Fake Door Test

**Implementation:**

```typescript
// Add "Premium" badge to UI
<button onClick={() => showPaywallModal()}>🌟 Premium Features</button>;

// Modal shows pricing, but doesn't actually charge
function showPaywallModal() {
  // Track who clicked
  analytics.track("premium_interest");

  // Show what they'd get
  alert(`
    Premium Features ($4.99/month):
    - Custom game boards
    - Private rooms (password-protected)
    - Game statistics & history
    - Custom themes
    - Ad-free experience
    
    Coming soon! Add your email to get early access:
  `);

  // Collect emails (validates interest)
}
```

**What to measure:**

- % of players who click "Premium"
- Email signup rate
- Which features get mentioned most in feedback

**Success Criteria:**

- ✅ 5%+ of active players click Premium
- ✅ 20+ email signups (out of ~500 players)
- ✅ People ask "when is Premium launching?"

**If you fail:**

- < 1% click → Nobody wants premium
- Clicks but no emails → Not compelling enough
- Need different monetization model

---

## Monetization Models

### Recommended: Freemium (Start Here)

**Free Tier:**

- Full game access
- Create/join unlimited games
- Play with up to 4 players
- Basic themes
- Community features

**Premium Tier ($4.99/month or $39.99/year):**

- 🎨 Custom board themes (5-10 options)
- 🔒 Private rooms with passwords
- 📊 Game statistics (wins, avg moves, etc.)
- 🎯 Player ratings/ELO system
- 👑 Special badges/titles
- 🚫 Ad-free experience
- ⚡ Priority matchmaking (if you add it)

**Why this works:**

- Casual players play free forever (acquisition)
- Engaged players pay for status/customization
- Not pay-to-win (important for fairness)

**Conversion target:** 2-5% free → paid

---

### Alternative: Ad-Supported (Fallback)

**If premium doesn't convert well:**

**Implementation:**

```typescript
// Google AdSense
// Small banner ad above game board
// Interstitial ad after 3 games

// Revenue estimate:
// - 1000 daily players
// - 3 games average
// - $2-5 CPM (cost per 1000 impressions)
// = $6-15/day = $180-450/month
```

**Pros:**

- Everyone contributes (even non-payers)
- Predictable revenue based on traffic
- Easy to implement

**Cons:**

- Requires significant traffic (1000+ DAU)
- Hurts user experience
- Low revenue unless massive scale

---

### Alternative: One-Time Purchase (If B2C doesn't work)

**Pivot to B2B/Education:**

- Sell to schools/educators ($99-299/year per classroom)
- Educational discount for bulk licenses
- Custom branding for organizations
- Private hosted instances

**Target customers:**

- After-school programs
- Logic/strategy clubs
- Summer camps
- Corporate team building

---

## Pricing Strategy

### Freemium Pricing Tiers

| Tier               | Price     | Target User     | Value Prop                |
| ------------------ | --------- | --------------- | ------------------------- |
| **Free**           | $0        | Casual players  | Full game, basic features |
| **Premium**        | $4.99/mo  | Regular players | Customization + stats     |
| **Premium Annual** | $39.99/yr | Committed users | Save 33% ($20 savings)    |

### Why $4.99/month?

**Price Psychology:**

- Below $5 feels like "coffee money" (impulse buy)
- Cheaper than Netflix ($7-15)
- Comparable to other game subscriptions
- High enough to be profitable, low enough to be accessible

**Revenue Math:**

```
100 free users → 3 convert to premium (3% rate)
3 × $4.99 = $14.97/month

1000 free users → 30 premium
30 × $4.99 = $149.70/month

5000 free users → 150 premium
150 × $4.99 = $748.50/month ✅ Goal achieved!
```

---

## Growth Channels

### Organic (Focus Here First)

**1. SEO (Long-term play)**

```
Target keywords:
- "play quoridor online"
- "free board games online multiplayer"
- "strategy board games 2 players"
- "games like quoridor"

Action:
- Create blog content
- Game rules page (SEO-optimized)
- "How to play" video
```

**2. Social Proof**

```
- Reddit posts (every 2-3 weeks in different communities)
- Twitter/X game clips (cool moments)
- YouTube gameplay videos (encourage streamers)
- Twitch category (if it takes off)
```

**3. Product Hunt Launch**

```
When to launch: After 500+ users, polished UI
Timing: Tuesday-Thursday
Prepare: Screenshots, demo video, hunter connection
Goal: Top 5 daily → 2000-5000 visits
```

**4. Viral Loop (Built-in)**

```typescript
// After game ends
"Your friend [Name] just beat you!
 Challenge them to a rematch?

 [Share Link] [Tweet Result]"

// Copy to clipboard
// Auto-suggest sharing after fun games
```

---

### Paid (If/When You Have Budget)

**Google Ads (Start at $10/day):**

```
Target:
- "online board games"
- "multiplayer strategy games"
- Remarketing to site visitors

Expected CPA: $1-3 per registration
ROI Breakeven: If 3% convert → Need < $150 CPA
```

**Facebook/Instagram Ads:**

```
Target:
- Board game groups
- Strategy game players
- Ages 18-45
- Interest in online gaming

Creative:
- 15-second gameplay clip
- "Play with friends anywhere"
- CTA: "Start Free Game"
```

**Only spend money if:**

- You have validated product-market fit
- Organic growth is working but slow
- CAC < 3-month LTV (customer lifetime value)

---

## Customer Acquisition

### Week 1-2: Manual Outreach (0-100 users)

**Actions:**

- Personal messages to 50 friends
- Post in 10 online communities
- Share on your social media
- Ask for feedback, not shares

**Time investment:** 1-2 hours/day
**Expected CAC:** $0 (your time)

---

### Week 3-4: Community Building (100-500 users)

**Actions:**

- Create Discord server (for engaged players)
- Weekly "game night" events
- Feature user highlights
- Respond to every piece of feedback

**Time investment:** 1 hour/day
**Expected retention:** 20-30%

---

### Month 2-3: Content Marketing (500-2000 users)

**Actions:**

- Blog posts (strategy guides, game theory)
- YouTube tutorials (how to win)
- Reddit AMAs ("I built a game, AMA")
- Partnerships with board game YouTubers

**Time investment:** 5-10 hours/week
**Expected CAC:** Still mostly $0

---

### Month 4+: Paid Acquisition (If growing)

**Only start paid ads if:**

- Organic growth is positive
- Retention is > 20%
- You have premium revenue covering costs

**Budget:** Start with $300/month
**Goal:** CAC < $10

---

## Financial Projections

### Conservative Scenario (Viable Side Income)

| Month | Free Users | Premium Users | MRR  | Costs | Profit      |
| ----- | ---------- | ------------- | ---- | ----- | ----------- |
| 1     | 100        | 0             | $0   | $0    | -$0         |
| 2     | 500        | 5             | $25  | $25   | $0          |
| 3     | 1000       | 15            | $75  | $25   | $50         |
| 6     | 3000       | 60            | $300 | $50   | $250        |
| 12    | 5000       | 150           | $750 | $75   | **$675/mo** |

**Assumptions:**

- 3% conversion rate (conservative)
- 20% monthly churn (typical for games)
- Minimal marketing spend
- Neon free tier ($0) then Pro ($20/mo if needed)

---

### Optimistic Scenario (Real Business)

| Month | Free Users | Premium Users | MRR   | Costs | Profit       |
| ----- | ---------- | ------------- | ----- | ----- | ------------ |
| 1     | 500        | 5             | $25   | $0    | $25          |
| 3     | 5000       | 100           | $500  | $20   | $480         |
| 6     | 15000      | 450           | $2245 | $200  | **$2045/mo** |
| 12    | 30000      | 1200          | $5988 | $500  | **$5488/mo** |

**Assumptions:**

- 4% conversion rate
- Product Hunt success
- Some paid marketing
- Higher infrastructure costs

---

### Break-Even Analysis

**Monthly Costs:**

```
Neon Database: $0/mo (free tier covers ~10K users)
Vercel Pro: $20/mo (optional, only if needed)
Domain: $1/mo
Analytics: $0 (Vercel free tier)
Total: ~$0-20/mo
```

**Break-even:** 1-5 premium subscribers
**Safety margin:** 20-30 premium subscribers

You can sustain this with 600-1000 free users.

---

## Success Milestones

### Milestone 1: Product-Market Fit (Month 1-2)

**Indicators:**

- ✅ 50+ organic signups (no paid ads)
- ✅ 20%+ return rate (played 2+ times)
- ✅ 60%+ completion rate (finished games)
- ✅ Unsolicited feature requests
- ✅ Someone shares without being asked

**Action:** Continue building, refine product

---

### Milestone 2: Revenue Validation (Month 3-4)

**Indicators:**

- ✅ 20+ premium signups
- ✅ < 30% monthly churn
- ✅ $100+ MRR
- ✅ Covering infrastructure costs
- ✅ Positive user testimonials

**Action:** Double down on growth

---

### Milestone 3: Sustainable Side Income (Month 6-12)

**Indicators:**

- ✅ $500+ MRR
- ✅ 100+ premium users
- ✅ 3000+ free users
- ✅ Profitable after costs
- ✅ Clear growth trajectory

**Action:** Decide whether to scale or maintain

---

### Milestone 4: Real Business Decision (Month 12+)

**If revenue > $2000/mo:**

- Consider quitting day job (if that's your goal)
- Hire help (marketing, support)
- Build more features
- Expand to mobile

**If revenue $500-2000/mo:**

- Keep as side income (success!)
- Maintain and optimize
- Explore adjacent opportunities

**If revenue < $500/mo:**

- Honest assessment: Is this worth it?
- Pivot or wind down gracefully
- Lessons learned for next project

---

## Risk Factors & Mitigation

### Competition Risk

**Risk:** Someone clones your game
**Likelihood:** Medium (it's a Quoridor variant)
**Mitigation:**

- Build community (harder to clone)
- Ship features faster
- Better UX than competitors
- Premium features add moat

---

### Scaling Cost Risk

**Risk:** Neon costs explode with success
**Likelihood:** Very Low (generous free tier + you'd have revenue first)
**Mitigation:**

- Monitor usage closely
- Migrate to custom infra if needed
- Neon scales to ~50K users before issues (3GB storage, 100h compute/mo)

---

### Legal Risk

**Risk:** Quoridor trademark issues
**Likelihood:** Low (your game is different enough)
**Mitigation:**

- Don't use "Quoridor" name
- Different rules/board size
- Call it "strategy barrier game"
- Consult lawyer if monetizing big ($10K+ revenue)

---

### Burnout Risk

**Risk:** You get tired of this project
**Likelihood:** Medium (happens to everyone)
**Mitigation:**

- Set realistic expectations
- Take breaks
- Automate what you can
- If not fun anymore, it's OK to stop

---

## Action Plan Summary

### Month 1: Validate

- ✅ Build MVP
- ✅ Test with 50-100 people
- ✅ Measure engagement
- ✅ Fix critical issues

### Month 2-3: Grow

- ✅ Post in communities
- ✅ Add premium features
- ✅ Test willingness to pay
- ✅ Reach 500-1000 users

### Month 4-6: Monetize

- ✅ Launch premium tier
- ✅ Convert 2-5% of users
- ✅ Break even on costs
- ✅ Reach $500 MRR

### Month 6-12: Scale or Maintain

- ✅ Decide based on traction
- ✅ Either grow aggressively or maintain
- ✅ Profit is the goal

---

## Next Steps

After reading this, you should:

1. **Build the MVP** (see MVP_PLAN.md)
2. **Test with friends** (Week 1)
3. **Post to communities** (Week 2-3)
4. **Measure everything** (Track metrics religiously)
5. **Make go/no-go decision** (End of Month 1)

Remember: **Most products fail.** That's OK. The goal is to find out fast, not waste months on something nobody wants.

Good luck! 🎲🚀
