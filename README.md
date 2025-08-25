# Telegram Progress Bot

A Telegram bot that allows clients to track their project progress, view job status, check invoices, and receive notifications about updates. Integrates with your existing Discord CRM system via Google Sheets.

## Features

🔐 **Client Authentication**
- Secure authentication using email, phone, or contact name
- Links Telegram users to existing CRM client records

📊 **Job Tracking**
- View all active and completed jobs
- Get detailed information about specific jobs
- Quick status overviews with progress indicators
- Real-time status tracking with visual indicators

💰 **Invoice Management** 
- View all invoices (pending and paid)
- Get detailed invoice information
- Download invoice PDFs directly from Google Drive
- Track payment status and due dates

🔔 **Smart Notifications**
- Automatic notifications for job status changes
- Milestone update alerts
- New job creation notifications
- Customizable notification preferences

## Setup

### Prerequisites
- Node.js 16+ 
- Google Sheets API access (same as Discord CRM)
- Telegram Bot Token from [@BotFather](https://t.me/botfather)

### Installation

1. **Clone and install dependencies:**
```bash
cd /path/to/your/github/folder
git clone <this-repo> telegram-progress-bot
cd telegram-progress-bot
npm install
```

2. **Environment setup:**
```bash
cp .env.example .env
```

3. **Configure environment variables:**
```env
# Telegram Bot Token (get from @BotFather)
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here

# Google Sheets (same as your Discord CRM)
GSHEETS_SHEET_ID=your_google_sheets_id_here
GOOGLE_CLIENT_EMAIL=your_service_account_email_here
GOOGLE_PRIVATE_KEY_B64=your_base64_encoded_private_key_here

# Optional: Local development key file
GSHEETS_KEY_FILE=path_to_your_service_account_key.json
```

4. **Start the bot:**
```bash
npm start
```

For development with auto-restart:
```bash
npm run dev
```

## Bot Commands

### Authentication
- `/start` - Welcome message and setup instructions
- `/auth <email>` - Authenticate with email/phone/contact name
- `/logout` - Sign out

### Job Tracking
- `/jobs` - View all your jobs (active & completed)
- `/job <code>` - Get detailed information about a specific job
- `/status` - Quick overview of job statuses with counts

### Invoices
- `/invoices` - View all your invoices with totals
- `/invoice <number>` - Get invoice details and PDF download link

### Notifications
- `/notifications` - Check current notification status
- `/notifications on` - Enable job update notifications  
- `/notifications off` - Disable notifications

### Help
- `/help` - Show all available commands

## Usage Flow

1. **Client Authentication:**
   ```
   /auth john@example.com
   ```

2. **View Jobs:**
   ```
   /jobs
   ```

3. **Check Specific Job:**
   ```
   /job J001
   ```

4. **View Invoices:**
   ```
   /invoices
   ```

5. **Download Invoice:**
   ```
   /invoice 000679
   ```

## Integration with Discord CRM

The bot reads from the same Google Sheets that your Discord CRM uses:

- **Clients Sheet:** Client contact information and authentication data
- **Jobs Sheet:** Project status, milestones, and progress tracking  
- **Invoices Sheet:** Invoice data and status information

### Data Structure Expected

**Clients Sheet columns:**
- `id`, `code`, `name`, `contact`, `email`, `phone`, `notes`, `channelId`, `createdAt`, `archived`

**Jobs Sheet columns:**  
- `id`, `code`, `title`, `clientId`, `status`, `priority`, `assigneeId`, `deadline`, `budget`, `tags`, `description`, `threadId`, `createdAt`, `closedAt`

**Invoices Sheet columns:**
- `id`, `clientId`, `clientCode`, `jobId`, `status`, `dueAt`, `total`, `notes`, `terms`, `lineItems`, `createdAt`

## Notification System

The bot monitors job status changes every 30 seconds and sends notifications for:

- 🆕 New job creation
- 🔄 Status changes (pending → in-progress → review → completed)
- 🎯 Milestone completions
- ⚠️ Important status updates

Clients are automatically subscribed to notifications when they authenticate.

## Error Handling

- Invalid authentication attempts
- Missing client/job/invoice data
- Google Sheets API errors
- Telegram API communication issues
- Network connectivity problems

## Security

- Client data is authenticated against existing CRM records
- No sensitive data is stored locally
- Google Sheets API uses service account authentication
- Bot tokens and credentials are environment-based

## Troubleshooting

**Bot not responding:**
- Check `TELEGRAM_BOT_TOKEN` is valid
- Verify bot is started with `npm start`

**Authentication failures:**
- Ensure Google Sheets API credentials are correct  
- Check client email/contact exists in CRM

**Missing job/invoice data:**
- Verify Google Sheets has correct sheet names
- Check data format matches expected structure

**Notification issues:**
- Check notification system logs
- Verify users haven't blocked the bot

## Development

**Project Structure:**
```
telegram-progress-bot/
├── commands/           # Command handlers
│   ├── jobs.js        # Job tracking commands  
│   ├── invoices.js    # Invoice commands
│   └── notifications.js # Notification settings
├── lib/               # Core libraries
│   ├── auth.js        # Authentication system
│   ├── sheets.js      # Google Sheets integration
│   ├── invoices.js    # Invoice data handling
│   └── notifications.js # Notification manager
├── index.js           # Main bot file
├── package.json       # Dependencies
└── README.md         # This file
```

**Adding new commands:**
1. Create command handler in `commands/`
2. Import and register in `index.js`
3. Add help text and documentation

**Extending notifications:**
1. Modify `NotificationManager` in `lib/notifications.js`
2. Add new trigger conditions in `checkForUpdates()`
3. Update notification messages

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes  
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details.