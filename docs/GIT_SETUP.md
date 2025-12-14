# Git Repository Setup Guide

## Initial Repository Setup

### 1. Configure Git (One-time setup)

```bash
# Set your identity
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# Set default branch name
git config --global init.defaultBranch main

# Helpful aliases
git config --global alias.st status
git config --global alias.co checkout
git config --global alias.br branch
git config --global alias.cm commit
git config --global alias.lg "log --oneline --graph --decorate --all"
```

### 2. Initialize Repository

```bash
cd /Volumes/T7black/projects/blocked

# Initialize git if not already done
git init

# Ensure we're on main branch
git branch -M main

# Check status
git status
```

### 3. Create .gitignore

Already exists, but verify it includes:

```
node_modules/
.next/
.env.local
.vercel
*.log
.DS_Store
```

### 4. Create Initial Commit

```bash
# Stage all files
git add .

# Create first commit
git commit -m "chore: initial project setup with documentation structure"

# View commit history
git log --oneline
```

### 5. Create Development Branch

```bash
# Create and switch to dev branch
git checkout -b dev

# Push dev branch to remote (after remote is added)
git push -u origin dev
```

---

## GitHub Repository Creation

### Option 1: Via GitHub CLI (Recommended)

```bash
# Install GitHub CLI if needed
brew install gh

# Authenticate
gh auth login

# Create repository
gh repo create bloqueio --public --source=. --remote=origin

# Push to GitHub
git push -u origin main
git push origin dev
```

### Option 2: Via GitHub Web Interface

1. Go to https://github.com/new
2. Repository name: `bloqueio`
3. Description: "4-player Quoridor-style board game with online multiplayer"
4. Public or Private: **Public** (for portfolio)
5. DO NOT initialize with README (we already have one)
6. Click "Create repository"

**Then connect locally:**

```bash
git remote add origin https://github.com/YOUR_USERNAME/bloqueio.git
git push -u origin main
git push origin dev
```

---

## Branch Protection Rules

### Protect Main Branch (After pushing to GitHub)

**Via GitHub Web:**

1. Go to repo → Settings → Branches
2. Add rule for `main` branch:
   - ✅ Require pull request reviews (skip for solo dev, but good practice)
   - ✅ Require status checks to pass (Vercel build)
   - ✅ Require branches to be up to date
   - ✅ Include administrators (yes, even you!)

**What this does:**

- Prevents accidental force pushes
- Ensures Vercel builds succeed before merge
- Maintains clean history

---

## Daily Git Workflow

### Starting New Feature

```bash
# Make sure dev is up to date
git checkout dev
git pull origin dev

# Create feature branch
git checkout -b feature/room-creation

# Start coding...
```

### Making Commits

```bash
# Check what changed
git status
git diff

# Stage specific files
git add src/components/RoomCreation.tsx
git add src/types/room.ts

# Or stage everything
git add .

# Commit with descriptive message
git commit -m "feat(room): add room creation UI component"

# Push to remote
git push origin feature/room-creation
```

### Finishing Feature

```bash
# Commit all remaining work
git add .
git commit -m "feat(room): complete room creation flow"

# Switch to dev
git checkout dev

# Merge feature
git merge feature/room-creation

# Test locally on dev branch
pnpm dev

# If everything works, push dev
git push origin dev

# Merge to main (triggers Vercel deploy)
git checkout main
git merge dev
git push origin main

# Delete feature branch (cleanup)
git branch -d feature/room-creation
git push origin --delete feature/room-creation
```

---

## Useful Git Commands

### Viewing Changes

```bash
# See what changed
git status

# See uncommitted changes
git diff

# See changes in specific file
git diff src/app/page.tsx

# See commit history
git log --oneline --graph

# See who changed what
git blame src/app/page.tsx
```

### Undoing Changes

```bash
# Discard changes in file (before staging)
git checkout -- src/app/page.tsx

# Unstage file (after git add)
git reset HEAD src/app/page.tsx

# Undo last commit (keep changes)
git reset --soft HEAD~1

# Undo last commit (discard changes) ⚠️
git reset --hard HEAD~1

# Revert a pushed commit (safe)
git revert <commit-hash>
```

### Branch Management

```bash
# List all branches
git branch -a

# Switch branch
git checkout dev

# Create and switch
git checkout -b feature/new-thing

# Delete local branch
git branch -d feature/old-thing

# Delete remote branch
git push origin --delete feature/old-thing

# Rename current branch
git branch -m new-name
```

### Stashing (Save Work Temporarily)

```bash
# Save current changes
git stash

# List stashes
git stash list

# Apply most recent stash
git stash pop

# Apply specific stash
git stash apply stash@{0}

# Delete stash
git stash drop stash@{0}
```

---

## Commit Message Best Practices

### Format

```
type(scope): short description (50 chars max)

Optional longer description explaining:
- Why this change was needed
- What alternatives were considered
- Any breaking changes

Closes #123
```

### Types

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation only
- `style:` Formatting, missing semicolons
- `refactor:` Code restructuring
- `perf:` Performance improvement
- `test:` Adding tests
- `chore:` Maintenance, dependencies
- `ci:` CI/CD changes

### Good Examples

```bash
git commit -m "feat(game): add barrier placement validation with BFS pathfinding"

git commit -m "fix(ui): correct player color assignments for players 2-3"

git commit -m "docs(mvp): update Phase 1 timeline with actual hours spent"

git commit -m "refactor(types): extract game types to separate file

Moved all type definitions from page.tsx to src/types/game.ts
for better organization and reusability. No behavior changes."

git commit -m "perf(polling): reduce polling interval to 2s from 5s"
```

### Bad Examples (Don't Do This)

```bash
git commit -m "fix stuff"
git commit -m "WIP"
git commit -m "asdfasdf"
git commit -m "I hate this bug"
git commit -m "Final fix. This time for real. I mean it."
```

---

## Emergency Procedures

### Accidentally Committed to Main

```bash
# If not pushed yet
git reset --soft HEAD~1
git checkout dev
git add .
git commit -m "feat: thing I meant to commit to dev"

# If already pushed (and main is not protected)
git revert HEAD
git push origin main
# Then do it properly on dev
```

### Merge Conflict

```bash
# After git merge shows conflicts
git status  # See which files have conflicts

# Open conflicted files, look for:
<<<<<<< HEAD
Your changes
=======
Their changes
>>>>>>> feature/branch

# Edit to keep what you want, remove markers
# Then:
git add <resolved-files>
git commit -m "fix: resolve merge conflict in game state"
```

### Lost Commits (Undo History)

```bash
# See all your commits (even after reset)
git reflog

# Restore to specific commit
git reset --hard <commit-hash>
```

### Accidentally Deleted Branch

```bash
# Find the commit
git reflog

# Recreate branch
git checkout -b feature/recovered <commit-hash>
```

---

## Pre-Push Checklist

**Before pushing to any branch:**

- [ ] Code compiles: `pnpm build`
- [ ] No TypeScript errors: `pnpm tsc --noEmit`
- [ ] No console.logs or debugger statements
- [ ] Commit message is descriptive
- [ ] All files you intended to change are staged

**Before merging to main:**

- [ ] Tested locally on dev branch
- [ ] Feature plan updated
- [ ] Documentation updated if needed
- [ ] Ready for Vercel deployment

---

## GitHub Best Practices

### README.md

Keep it updated with:

- Current project status
- How to run locally
- How to contribute (if open source)
- Link to live demo (Vercel URL)

### Issues

Create issues for:

- Bugs found in production
- Feature requests from users
- Technical debt to address

Format:

```markdown
## Description

Brief description of the issue

## Steps to Reproduce

1. Go to...
2. Click on...
3. See error

## Expected Behavior

What should happen

## Actual Behavior

What actually happens

## Environment

- Browser: Chrome 120
- Device: Desktop
```

### GitHub Actions (Future)

Once you have tests:

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: pnpm install
      - run: pnpm build
      - run: pnpm test
```

---

## Repository Hygiene

### Weekly Cleanup

```bash
# Delete merged branches
git branch --merged | grep -v "main\|dev" | xargs git branch -d

# Prune remote branches
git fetch --prune

# See repository size
git count-objects -vH
```

### Keep History Clean

**Use:**

- Descriptive commit messages
- Logical commits (one feature = one commit after squashing)
- Linear history (merge, don't rebase main)

**Avoid:**

- "WIP" commits in main/dev
- Committing node_modules or .env files
- Large binary files (use Git LFS if needed)

---

## Useful Git Config

Add to `~/.gitconfig`:

```ini
[user]
  name = Your Name
  email = your.email@example.com

[core]
  editor = code --wait  # Use VS Code for commit messages
  autocrlf = input      # Normalize line endings

[pull]
  rebase = false        # Keep merge commits

[init]
  defaultBranch = main

[alias]
  st = status
  co = checkout
  br = branch
  cm = commit
  lg = log --oneline --graph --decorate --all
  last = log -1 HEAD
  unstage = reset HEAD --
  amend = commit --amend --no-edit

[color]
  ui = auto
```

---

## Vercel Git Integration

### Auto-Deploy Settings

**Production (main branch):**

- Every push to `main` → Deploy to production
- URL: `bloqueio.vercel.app`

**Preview (other branches):**

- Every push to any branch → Deploy preview
- URL: `bloqueio-git-branch-name.vercel.app`

**In Vercel Dashboard:**

- Settings → Git → Production Branch: `main`
- Settings → Git → Deploy Previews: Enabled

### Environment Variables

Set in Vercel Dashboard:

- `DATABASE_URL` → Production & Preview
- Any secrets → Production only (not preview)

---

## Next Steps

After setting up Git:

1. **Initialize repository:**

   ```bash
   git add .
   git commit -m "chore: initial setup with documentation structure"
   ```

2. **Create GitHub repo:**

   ```bash
   gh repo create bloqueio --public --source=. --remote=origin
   git push -u origin main
   ```

3. **Create dev branch:**

   ```bash
   git checkout -b dev
   git push -u origin dev
   ```

4. **Connect Vercel:**

   - Import project from GitHub
   - Configure auto-deploy

5. **Start first feature:**
   ```bash
   git checkout -b feature/neon-setup
   # Follow docs/features/01-neon-setup.md
   ```
