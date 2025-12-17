# Neon Database Branch Management

## Current Setup

- **Production**: `main` branch (connected to Vercel production)
- **Preview**: All preview deployments use `main` branch (free tier optimization)

## Why We Don't Use Preview Branches

- Neon free tier: **10 branch limit**
- Each feature branch = 1 preview branch
- Quickly hits limit with active development

## Solution

All preview deployments use the **main database branch** to avoid hitting limits.

### Pros:

- No branch limit issues
- Simpler management
- Preview deployments work immediately

### Cons:

- Preview deployments share production data
- Can't test migrations in isolation

## When to Use Preview Branches

Only for critical testing scenarios:

1. Database schema changes
2. Migration testing
3. Data-sensitive features

### Manual Preview Branch Creation

```bash
# In Neon console, create branch manually
# Use in Vercel environment variable override for specific deployment
```

## Cleanup Checklist

Before deleting a Neon preview branch:

- [ ] Verify Git feature branch is merged/deleted
- [ ] No active Vercel preview deployments using it
- [ ] Delete in Neon console

## Monitoring

Check branch count monthly:

- Neon Console → Branches
- Keep under 10 branches
- Delete merged feature branches

## Emergency Cleanup

If hitting limit:

1. List all branches in Neon console
2. Check which Git branches are merged: `git branch -r --merged main`
3. Delete corresponding `preview/*` branches in Neon
4. Keep only: `main`, optionally `preview/dev`
