# Current Blockers & Solutions

> **Purpose:** Track issues that slow down development for > 1 hour

## Active Blockers

### [None Yet]

---

## Resolved Blockers

### Template for Future Blockers

**Issue:** Brief description  
**Discovered:** Date  
**Time Lost:** X hours  
**Impact:** What's blocked by this

**Attempted Solutions:**

1. Tried X - didn't work because Y
2. Tried Z - partially worked but...

**Resolution:**

- Final solution that worked
- Why it worked
- How to prevent in future

**Resolved:** Date  
**Total Time Impact:** X hours

---

## Common Issues & Quick Fixes

### Neon Connection Issues

```bash
# Check DATABASE_URL in Vercel
vercel env pull .env.local

# Test connection locally
pnpm add @neondatabase/serverless
node -e "require('@neondatabase/serverless').neon(process.env.DATABASE_URL)('SELECT 1')"
```

### TypeScript Type Errors

- Check `tsconfig.json` is correct
- Run `pnpm tsc --noEmit` to see all errors
- Use `// @ts-expect-error` with comment as last resort

### Vercel Deployment Fails

- Check build logs in Vercel dashboard
- Test locally: `pnpm build`
- Check environment variables are set
- Ensure all dependencies in `package.json`

---

## Blocker Prevention

**Before starting new feature:**

- [ ] Review feature plan dependencies
- [ ] Check all required tools/services are accessible
- [ ] Verify local environment is working

**During development:**

- [ ] Commit frequently (easy rollback)
- [ ] Test after each logical change
- [ ] Ask for help if stuck > 1 hour
