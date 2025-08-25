#!/bin/bash

# Telegram Progress Bot Deployment Script for Google Cloud Compute Engine
echo "🚀 Starting Telegram Progress Bot deployment..."

# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 for process management
sudo npm install -g pm2

# Create bot directory
mkdir -p /home/$USER/telegram-progress-bot
cd /home/$USER/telegram-progress-bot

# Clone or copy your bot files here
echo "📂 Bot directory created at: /home/$USER/telegram-progress-bot"
echo "📋 Next steps:"
echo "1. Upload your bot files to this directory"
echo "2. Create .env file with your credentials"
echo "3. Run: npm install"
echo "4. Run: pm2 start index.js --name telegram-bot"
echo "5. Run: pm2 startup (to start on boot)"
echo "6. Run: pm2 save (to save current processes)"

echo "✅ Server setup complete!"