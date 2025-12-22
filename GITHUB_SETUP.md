# GitHub Setup Instructions

## Quick Setup (Recommended)

### 1. Create Repository on GitHub

Go to https://github.com/new and create a new repository with:

- **Repository name**: `iaruba`
- **Description**: `🎚️ Functional audio mixer with hardware control for Linux`
- **Visibility**: Public (or Private if you prefer)
- **❌ DO NOT** initialize with README, .gitignore, or license (we already have them)

### 2. Add Remote and Push

After creating the repository on GitHub, run:

```bash
# Add GitHub as remote origin
git remote add origin https://github.com/YOUR_USERNAME/iaruba.git

# Push main branch and tags
git push -u origin main
git push origin --tags
```

Replace `YOUR_USERNAME` with your actual GitHub username.

### 3. Configure Repository Settings

After pushing, configure your repository:

#### Branch Protection (Optional but Recommended)
- Go to Settings → Branches
- Add rule for `main` branch:
  - ✅ Require pull request reviews before merging
  - ✅ Require status checks to pass (CI/CD)
  - ✅ Require branches to be up to date

#### Topics/Tags
Add these topics to help people find your project:
- `haskell`
- `audio`
- `linux`
- `pulseaudio`
- `arduino`
- `gtk`
- `mixer`
- `functional-programming`

#### About Section
- Description: `🎚️ Functional audio mixer with hardware control for Linux`
- Website: (leave empty for now, or add docs URL later)
- Topics: (add the tags listed above)

## Alternative: GitHub CLI

If you have GitHub CLI (`gh`) installed:

```bash
# Create repository
gh repo create iaruba --public --description "🎚️ Functional audio mixer with hardware control for Linux" --source=.

# Push
git push -u origin main
git push origin --tags
```

## Verify Setup

After pushing, verify everything is correct:

1. Check GitHub repository page
2. Verify all files are present
3. Check that CI/CD workflow runs (may take a few minutes)
4. Verify v0.1.0 tag is visible in Releases section

## Next Steps

### Enable GitHub Actions
The repository includes CI/CD workflows in `.github/workflows/`:
- `ci.yml` - Runs on every push/PR (build, test, lint)
- `release.yml` - Runs on version tags (creates releases)

These will run automatically once you push to GitHub.

### Create First Release
After pushing the tag:

1. Go to repository → Releases
2. Click "Draft a new release"
3. Choose tag: `v0.1.0`
4. Title: `v0.1.0 - Initial Release`
5. Copy content from CHANGELOG.md
6. Click "Publish release"

Or wait for the `release.yml` workflow to create it automatically!

## Troubleshooting

### Permission Denied
If you get permission errors:

```bash
# Use SSH instead of HTTPS
git remote set-url origin git@github.com:YOUR_USERNAME/iaruba.git
```

Make sure you have SSH keys configured on GitHub.

### Large Files
If push fails due to large files, check what's being pushed:

```bash
git ls-files -s | awk '{print $4, $2}' | sort -k2 -rn | head -20
```

The `.gitignore` should already exclude `.stack-work/` and other build artifacts.

## Current Repository State

```
Commit: 0f8135e
Tag: v0.1.0
Branch: main
Files: 45
Lines: 2581
```

Happy coding! 🚀
