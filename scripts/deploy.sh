#!/bin/bash
set -e

echo "================================"
echo "  EliteFlow Deployment Script"
echo "================================"

# --- Prerequisites ---
if ! command -v docker &> /dev/null; then
    echo "Installing Docker..."
    curl -fsSL https://get.docker.com | sh
    sudo usermod -aG docker $USER
fi

if ! command -v docker-compose &> /dev/null; then
    echo "Installing Docker Compose..."
    sudo apt-get update && sudo apt-get install -y docker-compose-plugin
fi

# --- Clone or pull ---
if [ ! -d "elite-flow" ]; then
    echo "Cloning repository..."
    git clone https://github.com/le180-cell/ikimina-abavandimwe-solidarity.git elite-flow
fi

cd elite-flow

# --- Environment config ---
if [ ! -f ".env.production" ]; then
    echo ""
    echo "========================================="
    echo "  SET UP ENVIRONMENT VARIABLES"
    echo "========================================="
    echo "You need a Supabase project. Create one at:"
    echo "  https://supabase.com"
    echo ""
    read -p "Supabase URL: " supabase_url
    read -p "Supabase Anon Key: " supabase_key

    cat > .env.production << EOF
NEXT_PUBLIC_SUPABASE_URL=$supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=$supabase_key
NEXT_PUBLIC_APP_URL=https://eliteflow.com
EOF
    echo "✓ .env.production created"
fi

# --- SSL Certificate ---
if [ ! -d "ssl/live/eliteflow.com" ]; then
    echo ""
    echo "========================================="
    echo "  SET UP SSL CERTIFICATE"
    echo "========================================="
    echo "Make sure your domain (eliteflow.com) points"
    echo "to this server's IP address before continuing."
    echo ""
    read -p "Press Enter to continue..."

    mkdir -p ssl
    docker compose run --rm certbot certonly --webroot \
        -w /var/www/certbot \
        -d eliteflow.com -d www.eliteflow.com \
        --email admin@eliteflow.com --agree-tos --no-eff-email
fi

# --- Build & Run ---
echo "Building and starting containers..."
docker compose up -d --build

echo ""
echo "================================"
echo "  DEPLOYMENT COMPLETE"
echo "================================"
echo "Your app is running at:"
echo "  https://eliteflow.com"
echo ""
echo "Useful commands:"
echo "  docker compose logs -f    View logs"
echo "  docker compose restart    Restart app"
echo "  docker compose down       Stop app"
