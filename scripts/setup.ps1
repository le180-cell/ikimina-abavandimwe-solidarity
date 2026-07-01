# EliteFlow Initialization Script
# Run this after cloning the project

Write-Host "=== EliteFlow Setup ===" -ForegroundColor Cyan
Write-Host ""

# 1. Copy environment files
Write-Host "1. Setting up environment..." -ForegroundColor Yellow
if (-not (Test-Path ".env.local")) {
    Copy-Item ".env.local.template" ".env.local"
    Write-Host "   Created .env.local - EDIT THIS FILE with your Supabase credentials!" -ForegroundColor Red
} else {
    Write-Host "   .env.local already exists" -ForegroundColor Green
}

# 2. Install frontend dependencies
Write-Host "2. Installing frontend dependencies..." -ForegroundColor Yellow
npm install

# 3. Install AI service dependencies (requires Python)
Write-Host "3. Setting up AI service..." -ForegroundColor Yellow
if (Get-Command "python" -ErrorAction SilentlyContinue) {
    python -m venv ai-service/venv
    & "./ai-service/venv/Scripts/pip" install -r ai-service/requirements.txt
    Write-Host "   AI service dependencies installed" -ForegroundColor Green
} else {
    Write-Host "   Python not found. Install Python then run: pip install -r ai-service/requirements.txt" -ForegroundColor Red
}

# 4. Generate PWA icons
Write-Host "4. Generating PWA icons..." -ForegroundColor Yellow
try {
    npm install sharp --save-dev 2>$null
    node scripts/generate-icons.mjs
} catch {
    Write-Host "   Icon generation skipped (sharp not available)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== Setup Complete ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Green
Write-Host "  1. Edit .env.local with your Supabase project URL and anon key"
Write-Host "  2. Run the Supabase SQL migration (supabase/migrations/001_schema.sql)"
Write-Host "  3. Start the frontend: npm run dev"
Write-Host "  4. Start AI service: cd ai-service && python main.py"
Write-Host ""
Write-Host "Frontend: http://localhost:3000" -ForegroundColor White
Write-Host "AI Service: http://localhost:8000" -ForegroundColor White
