const { getClients, getJobs } = require('./sheets');

class NotificationManager {
  constructor(bot) {
    this.bot = bot;
    this.subscribedUsers = new Map();
    this.lastJobStates = new Map();
    this.checkInterval = 300000; // 5 minutes
    this.isRunning = false;
  }
  
  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log('📡 Starting notification system...');
    
    // Initial load of job states
    this.loadJobStates();
    
    // Set up periodic checking
    this.intervalId = setInterval(() => {
      this.checkForUpdates();
    }, this.checkInterval);
  }
  
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    this.isRunning = false;
    console.log('📡 Notification system stopped');
  }
  
  async loadJobStates() {
    try {
      const jobs = await getJobs();
      
      jobs.forEach(job => {
        this.lastJobStates.set(job.id, {
          status: job.status,
          title: job.title,
          clientId: job.clientId,
          updatedAt: job.updatedAt || new Date().toISOString()
        });
      });
      
      console.log(`📊 Loaded ${jobs.length} job states for monitoring`);
    } catch (error) {
      console.error('Error loading job states:', error);
    }
  }
  
  async checkForUpdates() {
    try {
      const currentJobs = await getJobs();
      const clients = await getClients();
      
      for (const job of currentJobs) {
        const lastState = this.lastJobStates.get(job.id);
        
        if (!lastState) {
          // New job
          this.lastJobStates.set(job.id, {
            status: job.status,
            title: job.title,
            clientId: job.clientId,
            updatedAt: job.updatedAt || new Date().toISOString()
          });
          
          await this.notifyJobUpdate(job, 'new', clients);
        } else if (lastState.status !== job.status) {
          // Status changed
          await this.notifyJobUpdate(job, 'status_change', clients, lastState.status);
          
          // Update stored state
          this.lastJobStates.set(job.id, {
            status: job.status,
            title: job.title,
            clientId: job.clientId,
            updatedAt: job.updatedAt || new Date().toISOString()
          });
        }
      }
    } catch (error) {
      console.error('Error checking for updates:', error);
    }
  }
  
  async notifyJobUpdate(job, updateType, clients, oldStatus = null) {
    const client = clients.find(c => c.id === job.clientId);
    if (!client) return;
    
    const subscribedTelegramIds = this.getSubscribersForClient(client.id);
    
    if (subscribedTelegramIds.length === 0) return;
    
    let message = '';
    let emoji = '';
    
    switch (updateType) {
      case 'new':
        emoji = '🆕';
        message = `${emoji} **New Job Created**\n\n`;
        message += `📋 **${job.title}** (${job.code || job.id})\n`;
        message += `📊 Status: ${job.status || 'Pending'}\n`;
        if (job.deadline) {
          message += `📅 Deadline: ${job.deadline}\n`;
        }
        if (job.description) {
          message += `\n📝 ${job.description}`;
        }
        break;
        
      case 'status_change':
        emoji = this.getStatusChangeEmoji(job.status);
        message = `${emoji} **Job Status Updated**\n\n`;
        message += `📋 **${job.title}** (${job.code || job.id})\n`;
        message += `📊 Status: ${oldStatus} → **${job.status}**\n`;
        
        // Add milestone messages for key statuses
        if (job.status && job.status.toLowerCase().includes('progress')) {
          message += `\n🚀 Work has begun on your project!`;
        } else if (job.status && job.status.toLowerCase().includes('review')) {
          message += `\n👀 Your project is ready for review!`;
        } else if (job.status && job.status.toLowerCase().includes('completed')) {
          message += `\n🎉 Your project has been completed!`;
        }
        break;
    }
    
    // Send to all subscribed users for this client
    for (const telegramId of subscribedTelegramIds) {
      try {
        await this.bot.sendMessage(telegramId, message, { 
          parse_mode: 'Markdown',
          disable_web_page_preview: true 
        });
      } catch (error) {
        console.error(`Failed to send notification to ${telegramId}:`, error.message);
        
        // If user blocked bot or chat doesn't exist, remove from subscriptions
        if (error.response && error.response.statusCode === 403) {
          this.unsubscribeUser(telegramId);
        }
      }
    }
  }
  
  getStatusChangeEmoji(status) {
    if (!status) return '📋';
    
    const normalizedStatus = status.toLowerCase();
    
    if (normalizedStatus.includes('progress') || normalizedStatus.includes('active')) {
      return '🔄';
    } else if (normalizedStatus.includes('review')) {
      return '👀';
    } else if (normalizedStatus.includes('completed') || normalizedStatus.includes('done')) {
      return '✅';
    } else if (normalizedStatus.includes('hold') || normalizedStatus.includes('paused')) {
      return '⏸️';
    } else if (normalizedStatus.includes('cancelled')) {
      return '❌';
    } else {
      return '📋';
    }
  }
  
  subscribeUser(telegramId, clientId) {
    if (!this.subscribedUsers.has(clientId)) {
      this.subscribedUsers.set(clientId, new Set());
    }
    
    this.subscribedUsers.get(clientId).add(telegramId);
    console.log(`📱 User ${telegramId} subscribed to notifications for client ${clientId}`);
  }
  
  unsubscribeUser(telegramId, clientId = null) {
    if (clientId) {
      // Unsubscribe from specific client
      const subscribers = this.subscribedUsers.get(clientId);
      if (subscribers) {
        subscribers.delete(telegramId);
        if (subscribers.size === 0) {
          this.subscribedUsers.delete(clientId);
        }
      }
      console.log(`📱 User ${telegramId} unsubscribed from client ${clientId} notifications`);
    } else {
      // Unsubscribe from all
      for (const [cId, subscribers] of this.subscribedUsers.entries()) {
        subscribers.delete(telegramId);
        if (subscribers.size === 0) {
          this.subscribedUsers.delete(cId);
        }
      }
      console.log(`📱 User ${telegramId} unsubscribed from all notifications`);
    }
  }
  
  getSubscribersForClient(clientId) {
    const subscribers = this.subscribedUsers.get(clientId);
    return subscribers ? Array.from(subscribers) : [];
  }
  
  isUserSubscribed(telegramId, clientId) {
    const subscribers = this.subscribedUsers.get(clientId);
    return subscribers ? subscribers.has(telegramId) : false;
  }
  
  getSubscriptionInfo(telegramId) {
    const subscriptions = [];
    
    for (const [clientId, subscribers] of this.subscribedUsers.entries()) {
      if (subscribers.has(telegramId)) {
        subscriptions.push(clientId);
      }
    }
    
    return subscriptions;
  }
}

module.exports = { NotificationManager };