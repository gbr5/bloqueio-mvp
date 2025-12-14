# Documentation Index

> **Quick navigation for all project documentation**

## 📋 Quick Start

**New to the project? Start here:**

1. Read [README.md](../README.md) - Project overview
2. Review [MVP_PLAN.md](./MVP_PLAN.md) - 2-3 week roadmap
3. Follow [GIT_SETUP.md](./GIT_SETUP.md) - Initialize repository
4. Check [DEVELOPMENT_WORKFLOW.md](./DEVELOPMENT_WORKFLOW.md) - Daily workflow

---

## 🎯 Strategic Documents

**High-level planning and business context:**

- **[MVP_PLAN.md](./MVP_PLAN.md)** - 2-3 week roadmap to multiplayer

  - Tech stack decisions
  - 5-phase implementation plan
  - Database schema
  - Timeline breakdown

- **[BUSINESS_STRATEGY.md](./BUSINESS_STRATEGY.md)** - Market validation & monetization

  - Freemium business model
  - Validation phases
  - Financial projections
  - Go/no-go decision framework

- **[SCALING_PLAYBOOK.md](./SCALING_PLAYBOOK.md)** - Conditional growth strategy

  - When to scale (revenue thresholds)
  - Infrastructure decision trees
  - Cost structure at different scales
  - Team expansion plan

- **[IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md)** - Full 28-PR enterprise refactor
  - ⚠️ **DEFERRED** until revenue > $5K/mo
  - Custom WebSocket server architecture
  - Complete testing strategy
  - Only reference if scaling becomes necessary

---

## 🛠️ Development Guides

**Day-to-day development references:**

- **[DEVELOPMENT_WORKFLOW.md](./DEVELOPMENT_WORKFLOW.md)** - Essential daily workflow

  - Documentation system explained
  - Git workflow (branching, commits)
  - Feature development process
  - Time estimation guidelines
  - Progress tracking methods

- **[GIT_SETUP.md](./GIT_SETUP.md)** - Repository setup & Git best practices
  - Initial repository configuration
  - GitHub repo creation
  - Branch protection rules
  - Useful Git commands
  - Emergency procedures

---

## 📝 Feature Implementation Plans

**Detailed plans for each feature (one file per feature):**

Located in [`docs/features/`](./features/)

- **[01-neon-setup.md](./features/01-neon-setup.md)** - Database initialization (30-60 min)
- **02-game-room-hook.md** - _(To be created)_ - `useGameRoom` hook (3-4 hours)
- **03-create-join-flow.md** - _(To be created)_ - Room creation/joining UI (6-8 hours)
- **04-realtime-sync.md** - _(To be created)_ - Polling implementation (8-10 hours)
- **05-deployment.md** - _(To be created)_ - Vercel deployment & testing (4-6 hours)

**How to use:**

1. Copy [`templates/FEATURE_PLAN_TEMPLATE.md`](./templates/FEATURE_PLAN_TEMPLATE.md)
2. Fill out before starting work
3. Update checklist during implementation
4. Capture learnings when complete

---

## 📊 Progress Tracking

**Track what's done, what's next, and what's blocked:**

Located in [`docs/progress/`](./progress/)

- **[WEEKLY_PROGRESS.md](./progress/WEEKLY_PROGRESS.md)** - Weekly summaries

  - What shipped
  - What's in progress
  - Time tracking
  - Learnings captured

- **[BLOCKERS.md](./progress/BLOCKERS.md)** - Current blockers & solutions

  - Active issues (> 1 hour impact)
  - Resolved issues for reference
  - Common issues & quick fixes

- **CHANGELOG.md** - _(To be created)_ - User-facing changes
  - Version history
  - New features
  - Bug fixes
  - Breaking changes

---

## 📐 Technical Documentation

**Architecture decisions and technical references:**

Located in [`docs/technical/`](./technical/) _(to be created as needed)_

- **ADR-001-neon-over-supabase.md** - _(Example)_ - Why Neon?
- **ADR-002-polling-over-websockets.md** - _(Example)_ - Why polling for MVP?
- **API.md** - API documentation (when created)
- **SCHEMA.md** - Database schema reference (extracted from MVP_PLAN.md)

**ADR (Architecture Decision Record) Format:**

```markdown
# ADR-XXX: Decision Title

## Status: Accepted | Rejected | Superseded

## Context

What problem are we solving?

## Decision

What did we decide?

## Consequences

- Positive consequence 1
- Negative consequence 1
- Alternative considered 1
```

---

## 📚 Templates

**Reusable templates for consistency:**

Located in [`docs/templates/`](./templates/)

- **[FEATURE_PLAN_TEMPLATE.md](./templates/FEATURE_PLAN_TEMPLATE.md)** - Feature implementation template
  - Context & dependencies
  - Success criteria
  - Technical design
  - Implementation checklist
  - Testing plan
  - Post-implementation review

---

## 🔄 Documentation Workflow

### When to Create Documentation

**Before coding:**

- [ ] Feature plan (for anything > 2 hours)
- [ ] ADR (for significant technical decisions)

**During development:**

- [ ] Update feature plan checklist
- [ ] Log blockers if stuck > 1 hour
- [ ] Update WEEKLY_PROGRESS.md at end of each session

**After completion:**

- [ ] Mark feature plan complete
- [ ] Capture learnings
- [ ] Update README if user-facing
- [ ] Add to CHANGELOG if shipping

### How to Keep Docs in Sync

**Daily:**

- Update active feature plan
- Log any blockers
- Quick note in WEEKLY_PROGRESS.md

**Weekly:**

- Review all open feature plans
- Update MVP_PLAN.md if timeline shifts
- Write weekly summary
- Archive completed feature plans

**Monthly:**

- Review against BUSINESS_STRATEGY.md
- Update financial projections if needed
- Decide if SCALING_PLAYBOOK.md applies yet

---

## 🎓 Learning Resources

**External references:**

### Neon Database

- [Neon Docs](https://neon.tech/docs)
- [Vercel + Neon Integration](https://vercel.com/docs/storage/vercel-postgres)

### Next.js 14+

- [Next.js Docs](https://nextjs.org/docs)
- [App Router Guide](https://nextjs.org/docs/app)

### Git Best Practices

- [Conventional Commits](https://www.conventionalcommits.org/)
- [Git Flight Rules](https://github.com/k88hudson/git-flight-rules)

### Lean Startup

- [Lean Startup Methodology](http://theleanstartup.com/principles)
- [Shape Up by Basecamp](https://basecamp.com/shapeup)

---

## 📞 Quick Reference

### Frequent Commands

```bash
# Development
pnpm dev              # Start dev server
pnpm build            # Production build
pnpm tsc --noEmit     # Check TypeScript

# Git
git status            # What changed?
git add .             # Stage everything
git commit -m "msg"   # Commit
git push              # Push to remote

# Documentation
cat docs/INDEX.md     # This file!
```

### Key Files

```
docs/
├── INDEX.md (you are here)
├── MVP_PLAN.md (roadmap)
├── DEVELOPMENT_WORKFLOW.md (daily workflow)
├── GIT_SETUP.md (git guide)
├── features/
│   └── 01-neon-setup.md (current)
├── progress/
│   ├── WEEKLY_PROGRESS.md
│   └── BLOCKERS.md
└── templates/
    └── FEATURE_PLAN_TEMPLATE.md
```

### Decision Framework

**Should I build this feature?**

1. Is it in MVP_PLAN.md? → Yes: Build it
2. Does it validate market demand? → Yes: Consider it
3. Can we ship without it? → Yes: Defer it
4. Are we over-engineering? → Yes: Simplify it

**Default: Ship minimal version first, iterate based on feedback.**

---

## 📝 Contributing to Docs

**How to add new documentation:**

1. **Create feature plan:**

   ```bash
   cp docs/templates/FEATURE_PLAN_TEMPLATE.md docs/features/XX-feature-name.md
   ```

2. **Fill it out completely before coding**

3. **Link from relevant strategic docs:**

   ```markdown
   See [Feature Name](./features/XX-feature-name.md) for implementation.
   ```

4. **Update this index:**

   - Add to appropriate section above
   - Keep alphabetical order within sections

5. **Commit documentation with code:**

   ```bash
   git add docs/features/XX-feature-name.md
   git add src/...
   git commit -m "feat(feature): implement feature X

   See docs/features/XX-feature-name.md for full details."
   ```

---

## 🎯 Current Focus (Week 1)

**Active feature plans:**

- [01-neon-setup.md](./features/01-neon-setup.md) - In Progress

**Next up:**

- 02-game-room-hook.md (create from template)
- 03-create-join-flow.md (create from template)

**Last updated:** Dec 14, 2025
