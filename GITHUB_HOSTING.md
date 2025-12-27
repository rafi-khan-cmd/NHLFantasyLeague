# Hosting on GitHub

This guide explains how to host your Supply Chain Digital Twin project on GitHub.

## Option 1: Code Repository Only (Recommended for Portfolio)

Simply push your code to GitHub as a repository. This is perfect for showcasing your work.

### Steps:

1. **Initialize Git Repository** (if not already done):
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Supply Chain Digital Twin"
   ```

2. **Create GitHub Repository**:
   - Go to GitHub.com
   - Click "New Repository"
   - Name it (e.g., `supply-chain-digital-twin`)
   - **Don't** initialize with README (you already have one)
   - Click "Create repository"

3. **Push to GitHub**:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/supply-chain-digital-twin.git
   git branch -M main
   git push -u origin main
   ```

4. **Verify**:
   - Check that `.env` files are NOT in the repository
   - Check that `target/` and `node_modules/` are ignored
   - All sensitive data should be excluded

## Option 2: Frontend on GitHub Pages

You can host the Angular frontend on GitHub Pages (free static hosting).

### Steps:

1. **Build Angular App**:
   ```bash
   cd frontend
   npm install
   ng build --configuration production --base-href /supply-chain-digital-twin/
   ```
   (Replace `supply-chain-digital-twin` with your repo name)

2. **Deploy to GitHub Pages**:
   - Go to your GitHub repository
   - Settings → Pages
   - Source: Deploy from a branch
   - Branch: `gh-pages` (create this branch)
   - Folder: `/root` or `/docs` (if you move dist there)

3. **Create GitHub Actions Workflow** (automated deployment):
   Create `.github/workflows/deploy-frontend.yml`:
   ```yaml
   name: Deploy Frontend to GitHub Pages
   
   on:
     push:
       branches: [ main ]
       paths:
         - 'frontend/**'
   
   jobs:
     build-and-deploy:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v3
         - uses: actions/setup-node@v3
           with:
             node-version: '18'
         - name: Install dependencies
           run: |
             cd frontend
             npm install
         - name: Build
           run: |
             cd frontend
             npm run build -- --base-href /supply-chain-digital-twin/
         - name: Deploy
           uses: peaceiris/actions-gh-pages@v3
           with:
             github_token: ${{ secrets.GITHUB_TOKEN }}
             publish_dir: ./frontend/dist/supply-chain-digital-twin
   ```

## Option 3: Full Stack Deployment

For a fully functional deployed app, you'll need:

### Frontend Hosting Options:
- **GitHub Pages** (free, static only)
- **Vercel** (free tier, great for Angular)
- **Netlify** (free tier)
- **Firebase Hosting** (free tier)

### Backend Hosting Options:
- **Railway** (free tier, easy Spring Boot deployment)
- **Render** (free tier)
- **Heroku** (paid now, but has alternatives)
- **AWS/GCP/Azure** (free tiers available)

### Recommended: Vercel (Frontend) + Railway (Backend)

#### Frontend on Vercel:
1. Push code to GitHub
2. Go to vercel.com
3. Import your GitHub repository
4. Set root directory: `frontend`
5. Build command: `npm run build`
6. Output directory: `dist/supply-chain-digital-twin`
7. Add environment variable: `API_URL` = your backend URL

#### Backend on Railway:
1. Push code to GitHub
2. Go to railway.app
3. New Project → Deploy from GitHub
4. Select your repository
5. Set root directory: `backend`
6. Add environment variables from `.env.example`
7. Railway will auto-detect Spring Boot and deploy

## Security Checklist Before Pushing:

✅ **No hardcoded passwords** - All credentials use environment variables
✅ **`.env` files ignored** - Checked in `.gitignore`
✅ **`target/` directory ignored** - Compiled files excluded
✅ **`node_modules/` ignored** - Dependencies excluded
✅ **`.env.example` included** - Template for others to use

## Adding to Your Portfolio:

1. **Update your portfolio README** with a link to this project
2. **Add a project card** with:
   - Project name
   - Brief description
   - Tech stack badges
   - Live demo link (if deployed)
   - GitHub link

3. **Create a project showcase page** (if you have one) with:
   - Screenshots
   - Key features
   - Architecture diagram
   - Technologies used

## Example Portfolio Integration:

```markdown
## Supply Chain Digital Twin

**Tech Stack**: Angular, Spring Boot, Snowflake, Databricks, Docker, Kubernetes

A comprehensive supply chain simulation platform for scenario analysis and optimization.

- [Live Demo](https://your-app.vercel.app)
- [GitHub Repository](https://github.com/YOUR_USERNAME/supply-chain-digital-twin)
- [Documentation](./README.md)
```

## Quick Start for GitHub:

```bash
# Initialize repository
git init

# Add all files (respects .gitignore)
git add .

# Commit
git commit -m "Initial commit: Supply Chain Digital Twin application"

# Add remote (replace with your repo URL)
git remote add origin https://github.com/YOUR_USERNAME/supply-chain-digital-twin.git

# Push
git push -u origin main
```

Your project is now on GitHub! 🎉

