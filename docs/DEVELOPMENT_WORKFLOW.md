# Development Workflow & Best Practices

## Documentation System

### Document Types

**Strategic Docs** (`docs/`)

- `MVP_PLAN.md` - 2-3 week roadmap to multiplayer
- `BUSINESS_STRATEGY.md` - Market validation & monetization
- `SCALING_PLAYBOOK.md` - Conditional growth strategy
- `IMPLEMENTATION_PLAN.md` - Full 28-PR refactor (deferred)

**Feature Plans** (`docs/features/`)

- One file per feature using `FEATURE_PLAN_TEMPLATE.md`
- Track progress, design decisions, and learnings
- Cross-reference with strategic docs

**Technical Docs** (`docs/technical/`)

- Architecture decisions (ADRs)
- API documentation
- Database schema references

**Progress Tracking** (`docs/progress/`)

- `WEEKLY_PROGRESS.md` - Weekly summaries
- `BLOCKERS.md` - Current blockers and solutions
- `CHANGELOG.md` - User-facing changes

---

## Git Workflow

### Branch Strategy (Simple - Single Developer)

**Branches:**

- `main` - Production-ready code (protected, auto-deploys to Vercel)
- `dev` - Integration branch for testing
- `feature/feature-name` - Feature development
- `fix/issue-description` - Bug fixes

**Workflow:**

```bash
# Start new feature
git checkout dev
git pull origin dev
git checkout -b feature/room-creation

# Work on feature, commit frequently
git add .
git commit -m "feat: add room creation UI"

# Push to remote
git push origin feature/room-creation

# When done, merge to dev
git checkout dev
git merge feature/room-creation

# Test on dev, then merge to main
git checkout main
git merge dev
git push origin main  # Auto-deploys to Vercel
```

### Commit Message Convention

**Format:** `type(scope): description`

**Types:**

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `refactor:` Code restructuring (no behavior change)
- `perf:` Performance improvement
- `test:` Adding tests
- `chore:` Build process, dependencies, etc.

**Examples:**

```bash
git commit -m "feat(game): add barrier placement validation"
git commit -m "fix(ui): correct player color display"
git commit -m "docs(mvp): update Phase 2 checklist"
git commit -m "refactor(types): extract game types to separate file"
```

### When to Commit

**Commit Frequently:**

- After completing a logical unit of work
- Before switching contexts
- Before trying risky refactoring
- At the end of each work session

**Good Commit:**

- Single logical change
- All related files included
- Tests pass (if any)
- Descriptive message

---

## Feature Development Process

### 1. Planning Phase (Before Coding)

**Create Feature Plan:**

```bash
cp docs/templates/FEATURE_PLAN_TEMPLATE.md docs/features/room-creation.md
```

**Fill out:**

- Context and dependencies
- Success criteria
- Technical design
- Implementation checklist

**Review against:**

- Does this support MVP goals? (See `MVP_PLAN.md`)
- Does this validate market demand? (See `BUSINESS_STRATEGY.md`)
- Are we over-engineering? (Keep it simple!)

### 2. Implementation Phase

**Before starting:**

- [ ] Create feature branch
- [ ] Review feature plan
- [ ] Check dependencies are ready

**While coding:**

- [ ] Update checklist as you progress
- [ ] Commit after each logical step
- [ ] Test manually after each commit
- [ ] Update docs if behavior changes

**Code Standards:**

- Keep functions < 50 lines when possible
- Add comments for non-obvious logic
- Use TypeScript types everywhere
- Follow existing code style (inline styles, functional components)

### 3. Testing Phase

**Manual Testing Checklist:**

- [ ] Happy path works
- [ ] Edge cases handled
- [ ] Error states display correctly
- [ ] Mobile responsive (basic check)
- [ ] No console errors

**Browser Testing:**

- Chrome (primary)
- Safari (if time permits)

### 4. Completion Phase

**Before merging:**

- [ ] All checklist items complete
- [ ] Manual testing passed
- [ ] No debugging code left (console.logs, etc.)
- [ ] Update feature plan with "What We Learned"
- [ ] Update `WEEKLY_PROGRESS.md`

**Merge flow:**

```bash
# Update feature plan
git add docs/features/room-creation.md
git commit -m "docs: complete room creation feature plan"

# Merge to dev
git checkout dev
git merge feature/room-creation

# Test on dev, then to main
git checkout main
git merge dev
git push origin main
```

---

## Time Estimation Guidelines

### Estimation Framework

**Break work into 1-6 hour chunks:**

- 1-2 hours: Small component or function
- 2-4 hours: Medium feature (UI + logic)
- 4-6 hours: Large feature (multiple files)
- 6+ hours: Break into smaller tasks

**Account for:**

- 20% buffer for unknowns
- Testing time (usually 25% of coding time)
- Documentation time (usually 15% of coding time)

**Example Estimates:**

```
Extract types to file:        1-2 hours
  - Create file:              0.5h
  - Move types:               0.5h
  - Fix imports:              0.5h
  - Buffer:                   0.5h

Create useGameRoom hook:      3-4 hours
  - Hook logic:               1.5h
  - Neon integration:         1h
  - Error handling:           0.5h
  - Testing:                  0.5h
  - Buffer:                   0.5h
```

### Tracking Actual Time

**Update feature plans when complete:**

```markdown
**Estimated Time:** 4 hours
**Actual Time:** 5.5 hours

What took longer: Neon connection setup (missing env var issue)
```

**Use for future estimates:**

- Review past feature plans
- Note patterns (always underestimate integration?)
- Adjust future estimates accordingly

---

## Progress Tracking

### Daily Practice

**End of each work session:**

1. Commit all work
2. Update feature plan checklist
3. Note any blockers in `BLOCKERS.md`
4. Push to remote

**Quick log format:**

```markdown
## 2025-12-14 (2 hours)

- ✅ Created Neon database
- ✅ Set up types file
- 🔄 Started useGameRoom hook (50% done)
- ❌ BLOCKER: Figuring out polling interval strategy
```

### Weekly Review

**Update `WEEKLY_PROGRESS.md`:**

- What shipped this week
- What's in progress
- Blockers encountered and resolved
- Next week's focus

**Review against MVP timeline:**

- Are we on track for 2-3 weeks?
- Do we need to cut scope?
- Any technical debt accumulating?

---

## Documentation Maintenance

### Keep Docs Updated

**Update immediately when:**

- Architecture changes (update feature plans)
- API contracts change (update technical docs)
- Business assumptions change (update BUSINESS_STRATEGY.md)
- Timeline shifts (update MVP_PLAN.md)

**Weekly doc review:**

- [ ] Are feature plans up to date?
- [ ] Is MVP_PLAN.md still accurate?
- [ ] Any learnings to capture?

### Cross-Referencing

**Link between docs:**

```markdown
See [MVP_PLAN.md Phase 2](./MVP_PLAN.md#phase-2) for context.
Related to [Room Creation Feature](./features/room-creation.md).
```

**Keep relationships clear:**

- Feature plans → Strategic docs
- Progress logs → Feature plans
- Blockers → Solutions in feature plans

---

## Code Review (Self-Review)

**Before each commit:**

- [ ] Does this code match the feature plan?
- [ ] Are types used correctly?
- [ ] Is error handling present?
- [ ] Are there any console.logs to remove?
- [ ] Does this follow existing patterns?

**Before merging to main:**

- [ ] Re-read all changed files
- [ ] Test in production-like environment
- [ ] Check Vercel preview deployment
- [ ] Verify no secrets in code

---

## Emergency Procedures

### If Build Breaks

1. Check Vercel deployment logs
2. Test locally: `pnpm build`
3. If critical: `git revert` and push
4. Fix in new branch, test thoroughly
5. Document in `BLOCKERS.md`

### If Production Bug Found

1. Create `fix/issue-description` branch
2. Reproduce locally
3. Implement fix
4. Test thoroughly
5. Fast-track to main (skip dev if urgent)
6. Document in feature plan or new bug fix doc

### If Stuck (> 2 hours on single issue)

1. Document the blocker in `BLOCKERS.md`
2. Take a break (rubber duck debugging)
3. Try simplest possible solution
4. Consider if this is MVP-critical
5. If not critical: defer to post-MVP

---

## Lean Startup Principles (Always Remember)

**Before implementing ANY feature:**

- ❓ Does this help validate market demand?
- ❓ Can we ship without this?
- ❓ What's the simplest version?
- ❓ Are we over-engineering?

**Default answer:** Ship minimal version first, iterate based on user feedback.

**When in doubt:** See `BUSINESS_STRATEGY.md` for validation framework.
