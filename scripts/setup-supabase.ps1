@"
╔═══════════════════════════════════════════════════════════╗
║              EliteFlow - Supabase Setup                    ║
║                                                           ║
║  This script will help you connect EliteFlow to Supabase   ║
║  for cloud sync, auth, and data persistence.              ║
╚═══════════════════════════════════════════════════════════╝
"@ | Write-Host -ForegroundColor Cyan

Write-Host ""
Write-Host "STEP 1: Create a Supabase account and project" -ForegroundColor Yellow
Write-Host "----------------------------------------------"
Write-Host "1. Go to https://supabase.com and click 'Start your project'" -ForegroundColor White
Write-Host "2. Sign up with GitHub or email" -ForegroundColor White
Write-Host "3. Once logged in, click 'New project'" -ForegroundColor White
Write-Host "4. Fill in:" -ForegroundColor White
Write-Host "   - Name: elite-flow (or anything you like)" -ForegroundColor White
Write-Host "   - Database Password: (save this somewhere safe)" -ForegroundColor White
Write-Host "   - Region: choose one close to Rwanda (EU West or South Africa)" -ForegroundColor White
Write-Host "5. Click 'Create new project' and wait ~2 minutes" -ForegroundColor White
Write-Host ""
Write-Host "Opening Supabase in your browser..." -ForegroundColor Green

Start-Process "https://supabase.com"

Write-Host ""
Write-Host "STEP 2: Get your API credentials" -ForegroundColor Yellow
Write-Host "--------------------------------"
Write-Host "After the project is created:" -ForegroundColor White
Write-Host "1. Go to Project Settings > API" -ForegroundColor White
Write-Host "2. Copy the 'Project URL' (looks like: https://xxxxx.supabase.co)" -ForegroundColor White
Write-Host "3. Copy the 'anon public' key (starts with: eyJhbG...)" -ForegroundColor White
Write-Host ""

$supabaseUrl = Read-Host "Paste your Project URL here"
$supabaseKey = Read-Host "Paste your anon public key here"

if ([string]::IsNullOrWhiteSpace($supabaseUrl) -or [string]::IsNullOrWhiteSpace($supabaseKey)) {
    Write-Host "No credentials provided. You can set them later in .env.local" -ForegroundColor Red
    exit
}

Write-Host ""
Write-Host "STEP 3: Configuring EliteFlow..." -ForegroundColor Yellow

$envContent = @"
# EliteFlow Configuration
NEXT_PUBLIC_SUPABASE_URL=$supabaseUrl
NEXT_PUBLIC_SUPABASE_ANON_KEY=$supabaseKey
NEXT_PUBLIC_APP_URL=http://localhost:3000
"@

Set-Content -Path ".env.local" -Value $envContent
Write-Host "✓ .env.local configured" -ForegroundColor Green

Write-Host ""
Write-Host "STEP 4: Run the database schema" -ForegroundColor Yellow
Write-Host "--------------------------------"
Write-Host "Now go to your Supabase dashboard:" -ForegroundColor White
Write-Host "1. Click 'SQL Editor' in the left sidebar" -ForegroundColor White
Write-Host "2. Click 'New Query'" -ForegroundColor White
Write-Host "3. Copy and paste the content from: supabase/migrations/001_schema.sql" -ForegroundColor White
Write-Host "4. Click 'Run' to create all tables" -ForegroundColor White
Write-Host ""
Write-Host "Opening your Supabase project dashboard..." -ForegroundColor Green

Start-Process $supabaseUrl

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  SETUP IN PROGRESS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "After running the SQL schema:" -ForegroundColor White
Write-Host "1. Start EliteFlow: npm run dev" -ForegroundColor Green
Write-Host "2. Register a new account (this creates your profile in Supabase)" -ForegroundColor Green
Write-Host "3. Start managing your business!" -ForegroundColor Green
Write-Host ""
Write-Host "Need help? Refer to the README.md" -ForegroundColor White
