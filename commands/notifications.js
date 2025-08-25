const { getAuthenticatedClient, requireAuth } = require('../lib/auth');

const notificationsCommand = requireAuth(async (msg, notificationManager) => {
  try {
    const args = msg.text.split(' ').slice(1);
    const action = args[0]?.toLowerCase();
    
    const client = getAuthenticatedClient(msg.from.id);
    const telegramId = msg.from.id;
    
    if (!action || action === 'status') {
      // Show current subscription status
      const isSubscribed = notificationManager.isUserSubscribed(telegramId, client.clientId);
      const subscriptions = notificationManager.getSubscriptionInfo(telegramId);
      
      let message = `🔔 **Notification Settings**\n\n`;
      message += `📊 **Current Status:** ${isSubscribed ? '✅ Subscribed' : '❌ Not subscribed'}\n`;
      message += `👤 **Client:** ${client.clientName}\n\n`;
      
      if (isSubscribed) {
        message += `You'll receive notifications when:\n`;
        message += `• 🆕 New jobs are created\n`;
        message += `• 🔄 Job status changes\n`;
        message += `• 🎯 Milestones are reached\n\n`;
        message += `Use \`/notifications off\` to unsubscribe`;
      } else {
        message += `You're not receiving notifications.\n\n`;
        message += `Use \`/notifications on\` to subscribe to updates`;
      }
      
      return { message };
    }
    
    if (action === 'on' || action === 'enable' || action === 'subscribe') {
      // Enable notifications
      notificationManager.subscribeUser(telegramId, client.clientId);
      
      const message = `🔔 **Notifications Enabled**\n\n` +
        `✅ You'll now receive updates about your jobs including:\n` +
        `• 🆕 New job creation\n` +
        `• 🔄 Status changes\n` +
        `• 🎯 Milestone completions\n\n` +
        `💡 Use \`/notifications off\` to disable anytime`;
        
      return { message };
    }
    
    if (action === 'off' || action === 'disable' || action === 'unsubscribe') {
      // Disable notifications
      notificationManager.unsubscribeUser(telegramId, client.clientId);
      
      const message = `🔕 **Notifications Disabled**\n\n` +
        `❌ You'll no longer receive job update notifications.\n\n` +
        `💡 Use \`/notifications on\` to re-enable anytime`;
        
      return { message };
    }
    
    // Invalid action
    return {
      message: `❌ Invalid action "${action}"\n\n` +
        `**Available commands:**\n` +
        `• \`/notifications\` - Show current status\n` +
        `• \`/notifications on\` - Enable notifications\n` +
        `• \`/notifications off\` - Disable notifications`
    };
    
  } catch (error) {
    console.error('Notifications command error:', error);
    return {
      message: "❌ Error managing notifications. Please try again later."
    };
  }
});

module.exports = {
  notificationsCommand
};