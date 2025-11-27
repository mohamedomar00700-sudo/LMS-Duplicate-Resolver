<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/12WdX79XZ1VDdn78I1x7kGxoT7G3rvAKl

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/12WdX79XZ1VDdn78I1x7kGxoT7G3rvAKl

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## GitHub Pages Deployment

The app is configured to be published to GitHub Pages under the path `/LMS-Duplicate-Resolver/`.

- Site URL (expected): `https://mohamedomar00700-sudo.github.io/LMS-Duplicate-Resolver/`

To publish from this repository:

1. Ensure the repo's default branch is `main`.
2. Commit and push your changes:
```powershell
git add .
git commit -m "Prepare site for GitHub Pages"
git push origin main
```
3. The included GitHub Actions workflow (`.github/workflows/pages.yml`) will build the app and publish the `dist/` folder to GitHub Pages automatically.

If you use a different repository name, update the `base` option in `vite.config.ts` to `'/your-repo-name/'` and push again.

<!-- Auto-update marker: trigger GitHub Actions -->
Last action trigger: 2025-11-27T20:05:00Z
