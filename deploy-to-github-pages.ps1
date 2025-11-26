<#
PowerShell helper to prepare, create remote (via gh or manual), push and hint to check Actions.

Usage: run this from the project root in PowerShell:
  .\deploy-to-github-pages.ps1

It will:
 - init git if missing
 - create or switch to branch `main`
 - commit current changes
 - create the GitHub repo using `gh` if available (recommended)
 - or prompt for remote URL and push via git

Note: You still must authenticate (gh auth login) or provide a PAT for HTTPS push.
#>

$ErrorActionPreference = 'Stop'

Write-Host "Running deployment helper for GitHub Pages..." -ForegroundColor Cyan

# Default repo full name (change if needed)
$defaultRepoFull = 'mohamedomar00700-sudo/LMS-Duplicate-Resolver'
$defaultRemoteUrl = "https://github.com/$defaultRepoFull.git"

function Run-Git([string]$args) {
    & git $args
}

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "git not found in PATH. Please install Git and rerun." -ForegroundColor Red
    exit 1
}

if (-not (Test-Path .git)) {
    Write-Host "No .git found — initializing repository..." -ForegroundColor Yellow
    Run-Git 'init'
}

$currentBranch = (git rev-parse --abbrev-ref HEAD) -replace "\r|\n",""
if ($currentBranch -ne 'main') {
    Write-Host "Switching/creating branch 'main'..." -ForegroundColor Yellow
    try { Run-Git 'switch main' } catch { Run-Git 'switch -c main' }
}

$status = (git status --porcelain)
if (-not [string]::IsNullOrEmpty($status)) {
    Write-Host "Staging files and committing changes..." -ForegroundColor Yellow
    Run-Git 'add -A'
    try {
        Run-Git 'commit -m "Prepare repo for GitHub Pages deployment"'
    } catch {
        Write-Host "Nothing to commit or commit failed (maybe identical commit)." -ForegroundColor Yellow
    }
} else {
    Write-Host "No working-tree changes to commit." -ForegroundColor Green
}

# Try GitHub CLI first
if (Get-Command gh -ErrorAction SilentlyContinue) {
    Write-Host "GitHub CLI detected — attempting to create or verify repository: $defaultRepoFull" -ForegroundColor Cyan
    try {
        gh repo view $defaultRepoFull --json name 2>$null | Out-Null
        Write-Host "Repository already exists or is viewable." -ForegroundColor Green
    } catch {
        Write-Host "Repository not found — creating repo via gh..." -ForegroundColor Yellow
        gh repo create $defaultRepoFull --public --source=. --remote=origin --push
        Write-Host "Repository created and pushed via gh." -ForegroundColor Green
    }
} else {
    Write-Host "GitHub CLI (gh) not found. Will use manual remote/push. You may want to install gh for a smoother flow." -ForegroundColor Yellow
    $remoteExists = (git remote) -contains 'origin'
    if (-not $remoteExists) {
        $remoteUrl = Read-Host "Enter remote URL (press Enter to use $defaultRemoteUrl)"
        if ([string]::IsNullOrWhiteSpace($remoteUrl)) { $remoteUrl = $defaultRemoteUrl }
        Run-Git "remote add origin $remoteUrl"
    } else {
        Write-Host "Remote 'origin' already configured." -ForegroundColor Green
    }

    Write-Host "Pushing to origin/main (you may be prompted for credentials)..." -ForegroundColor Cyan
    Run-Git 'push -u origin main'
}

Write-Host "Push complete (if no errors)." -ForegroundColor Green

Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1) Open GitHub Actions in your repo and watch 'Deploy to GitHub Pages' workflow run." -ForegroundColor Cyan
Write-Host "2) After successful deploy, open: https://$($defaultRepoFull.Split('/')[0]).github.io/$($defaultRepoFull.Split('/')[1])/" -ForegroundColor Cyan

Write-Host "If you see errors during push or repo creation, copy the error output and paste it here so I can help." -ForegroundColor Magenta

exit 0
