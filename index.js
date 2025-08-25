require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const { authenticateUser, getAuthenticatedClient, logout } = require('./lib/auth');
const { jobsCommand, jobCommand, statusCommand } = require('./commands/jobs');
const { invoicesCommand, invoiceCommand } = require('./commands/invoices');
const { notificationsCommand } = require('./commands/notifications');
const { NotificationManager } = require('./lib/notifications');
const { handleCallback, showMainMenu } = require('./lib/callbackHandler');
const { createMainMenu } = require('./lib/keyboards');

// Bot setup
const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error('❌ TELEGRAM_BOT_TOKEN is required');
  process.exit(1);
}

const bot = new TelegramBot(token, { polling: true });

// Initialize notification manager
const notificationManager = new NotificationManager(bot);

console.log('🤖 Telegram Progress Bot starting...');

// Error handling
bot.on('error', (error) => {
  console.error('Bot error:', error);
});

bot.on('polling_error', (error) => {
  console.error('Polling error:', error);
});

// Handle button callbacks
bot.on('callback_query', (callbackQuery) => {
  handleCallback(bot, callbackQuery);
});

// Welcome message and help
bot.onText(/\/start/, (msg) => {
  const welcomeMessage = `
🤖 **Welcome to Progress Tracker Bot!**

I help you track your project progress, view job status, check invoices, and get notifications about updates.

**🔐 Getting Started:**
First, authenticate with your unique auth code: \`/auth ABC123XYZ\`
🔑 You should have received your auth code from us.

**📋 Available Commands:**
• \`/auth <code>\` - Authenticate with your unique auth code
• \`/jobs\` - View your current jobs
• \`/job <code>\` - Get details about a specific job
• \`/status\` - Quick status overview
• \`/invoices\` - View your invoices
• \`/invoice <number>\` - Get invoice details and PDF
• \`/notifications\` - Manage notification settings
• \`/help\` - Show this help message
• \`/logout\` - Sign out

🚀 **Start by authenticating:** \`/auth ABC123XYZ\`
  `;
  
  bot.sendMessage(msg.chat.id, welcomeMessage, { parse_mode: 'Markdown' });
});

bot.onText(/\/help/, (msg) => {
  const helpMessage = `
📋 **Available Commands:**

**🔐 Authentication:**
• \`/auth <code>\` - Sign in with your unique auth code
• \`/logout\` - Sign out

**📊 Job Tracking:**
• \`/jobs\` - View all your jobs (active & completed)
• \`/job <code>\` - Detailed view of a specific job
• \`/status\` - Quick overview of job statuses

**💰 Invoices:**
• \`/invoices\` - View all your invoices
• \`/invoice <number>\` - Get invoice details and download PDF

**🔔 Notifications:**
• \`/notifications\` - Check notification status
• \`/notifications on\` - Enable job update notifications
• \`/notifications off\` - Disable notifications

**❓ Help:**
• \`/help\` - Show this help message
• \`/start\` - Welcome message

💡 **Tip:** After authentication, you can use the button interface for easier navigation!
  `;
  
  bot.sendMessage(msg.chat.id, helpMessage, { parse_mode: 'Markdown' });
});

// Authentication command
bot.onText(/\/auth (.+)/, async (msg, match) => {
  const contact = match[1].trim();
  const telegramId = msg.from.id;
  
  try {
    bot.sendMessage(msg.chat.id, '🔍 Authenticating...', { parse_mode: 'Markdown' });
    
    const result = await authenticateUser(telegramId, contact);
    
    if (result.success) {
      await bot.sendMessage(msg.chat.id, `✅ ${result.message}`, { parse_mode: 'Markdown' });
      
      // Auto-enable notifications for authenticated users
      notificationManager.subscribeUser(telegramId, result.client.id);
      
      // Show main menu with buttons
      const client = getAuthenticatedClient(telegramId);
      const keyboard = createMainMenu(client.clientName);
      
      await bot.sendMessage(msg.chat.id, 
        `🔔 Notifications enabled!\n\n📋 Welcome ${client.clientName}! What would you like to do?`,
        { 
          parse_mode: 'Markdown',
          ...keyboard
        }
      );
    } else {
      await bot.sendMessage(msg.chat.id, `❌ ${result.message}`, { parse_mode: 'Markdown' });
    }
  } catch (error) {
    console.error('Auth error:', error);
    await bot.sendMessage(msg.chat.id, 
      '❌ Authentication failed. Please try again or contact support.',
      { parse_mode: 'Markdown' }
    );
  }
});

// Menu command for authenticated users
bot.onText(/\/menu/, (msg) => {
  const telegramId = msg.from.id;
  const client = getAuthenticatedClient(telegramId);
  
  if (!client) {
    bot.sendMessage(msg.chat.id, 
      '🔐 You need to authenticate first. Send /auth followed by your unique auth code.\n\nExample: `/auth ABC123XYZ`',
      { parse_mode: 'Markdown' }
    );
    return;
  }
  
  const keyboard = createMainMenu(client.clientName);
  bot.sendMessage(msg.chat.id, 
    `📋 Welcome ${client.clientName}! What would you like to do?`,
    { 
      parse_mode: 'Markdown',
      ...keyboard
    }
  );
});

// Logout command
bot.onText(/\/logout/, (msg) => {
  const telegramId = msg.from.id;
  
  logout(telegramId);
  notificationManager.unsubscribeUser(telegramId);
  
  bot.sendMessage(msg.chat.id, 
    '👋 You have been logged out successfully.\n\nUse `/auth <email>` to sign in again.',
    { parse_mode: 'Markdown' }
  );
});

// Job commands
bot.onText(/\/jobs$/, async (msg) => {
  const result = await jobsCommand(msg);
  
  if (result.requiresAuth) {
    bot.sendMessage(msg.chat.id, result.message, { parse_mode: 'Markdown' });
  } else {
    bot.sendMessage(msg.chat.id, result.message, { parse_mode: 'Markdown' });
  }
});

bot.onText(/\/job (.+)/, async (msg) => {
  const result = await jobCommand(msg);
  
  if (result.requiresAuth) {
    bot.sendMessage(msg.chat.id, result.message, { parse_mode: 'Markdown' });
  } else {
    bot.sendMessage(msg.chat.id, result.message, { parse_mode: 'Markdown' });
  }
});

bot.onText(/\/status$/, async (msg) => {
  const result = await statusCommand(msg);
  
  if (result.requiresAuth) {
    bot.sendMessage(msg.chat.id, result.message, { parse_mode: 'Markdown' });
  } else {
    bot.sendMessage(msg.chat.id, result.message, { parse_mode: 'Markdown' });
  }
});

// Invoice commands
bot.onText(/\/invoices$/, async (msg) => {
  const result = await invoicesCommand(msg);
  
  if (result.requiresAuth) {
    bot.sendMessage(msg.chat.id, result.message, { parse_mode: 'Markdown' });
  } else {
    bot.sendMessage(msg.chat.id, result.message, { parse_mode: 'Markdown' });
  }
});

bot.onText(/\/invoice (.+)/, async (msg) => {
  const result = await invoiceCommand(msg);
  
  if (result.requiresAuth) {
    bot.sendMessage(msg.chat.id, result.message, { parse_mode: 'Markdown' });
  } else {
    bot.sendMessage(msg.chat.id, result.message, { 
      parse_mode: 'Markdown',
      disable_web_page_preview: true
    });
  }
});

// Notifications command
bot.onText(/\/notifications(.*)/, async (msg) => {
  const result = await notificationsCommand(msg, notificationManager);
  
  if (result.requiresAuth) {
    bot.sendMessage(msg.chat.id, result.message, { parse_mode: 'Markdown' });
  } else {
    bot.sendMessage(msg.chat.id, result.message, { parse_mode: 'Markdown' });
  }
});

// Handle unknown commands
bot.on('message', (msg) => {
  if (!msg.text || msg.text.startsWith('/')) return;
  
  // For non-command messages, show help
  const helpText = `
❓ **I didn't understand that command.**

Use \`/help\` to see all available commands, or try:
• \`/jobs\` - View your jobs
• \`/invoices\` - View your invoices  
• \`/status\` - Quick status overview
  `;
  
  bot.sendMessage(msg.chat.id, helpText, { parse_mode: 'Markdown' });
});

// Start the notification system
notificationManager.start();

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down bot...');
  notificationManager.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down bot...');
  notificationManager.stop();
  process.exit(0);
});

console.log('✅ Telegram Progress Bot is running!');
console.log('📡 Notification system started');
console.log('🔍 Monitoring for job updates...');
