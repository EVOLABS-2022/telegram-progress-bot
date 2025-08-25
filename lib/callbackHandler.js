// lib/callbackHandler.js - Handle all button callbacks

const { getAuthenticatedClient, logout } = require('./auth');
const { getClientJobs } = require('./sheets');
const { 
  createMainMenu, 
  createJobsMenu, 
  createJobListButtons, 
  createJobDetailsButtons,
  createBackButton,
  createSettingsMenu,
  getStatusEmoji 
} = require('./keyboards');

// Status emojis for different job states
const statusEmojis = {
  'pending': '📋',
  'open': '📋', 
  'in-progress': '🔄',
  'in progress': '🔄',
  'review': '👀',
  'completed': '✅',
  'cancelled': '❌',
  'on-hold': '⏸️',
  'blocked': '🚫',
  'overdue': '🚨'
};

function formatJobDetails(job) {
  const statusEmoji = getStatusEmoji(job.Status || job.status);
  const title = job.Title || job.title;
  const id = job.ID || job.id;
  const status = job.Status || job.status;
  const priority = job.Priority || job.priority;
  const deadline = job.Deadline || job.deadline;
  const description = job.Description || job.description;
  const notes = job.Notes || job.notes;
  
  function formatDate(dateString) {
    if (!dateString) return 'Not set';
    try {
      const { format } = require('date-fns');
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch {
      return dateString;
    }
  }
  
  let details = `${statusEmoji} **${title}**\n\n`;
  details += `📋 ID: ${id}\n`;
  details += `📊 Status: ${status}`;
  
  if (priority) {
    const priorityEmojis = { 'low': '🟢', 'medium': '🟡', 'high': '🔴', 'urgent': '🚨' };
    const priorityEmoji = priorityEmojis[priority?.toLowerCase()] || '';
    if (priorityEmoji) {
      details += ` ${priorityEmoji} ${priority}`;
    }
  }
  
  details += `\n`;
  
  if (deadline) {
    details += `📅 **Deadline:** ${formatDate(deadline)}\n`;
  }
  
  if (description) {
    details += `\n📝 **Description:**\n${description}`;
  }
  
  return details;
}

async function handleCallback(bot, callbackQuery) {
  const chatId = callbackQuery.message.chat.id;
  const messageId = callbackQuery.message.message_id;
  const data = callbackQuery.data;
  const userId = callbackQuery.from.id;
  
  try {
    // Check authentication for all actions except logout
    if (data !== 'logout') {
      const client = getAuthenticatedClient(userId);
      if (!client) {
        await bot.answerCallbackQuery(callbackQuery.id, { 
          text: 'Please authenticate first with /auth <code>',
          show_alert: true 
        });
        return;
      }
      
      // Handle different callback actions
      switch (true) {
        case data === 'main_menu':
          await showMainMenu(bot, chatId, messageId, client);
          break;
          
        case data === 'menu_jobs':
          await showJobsMenu(bot, chatId, messageId, client);
          break;
          
        case data === 'menu_settings':
          await showSettingsMenu(bot, chatId, messageId);
          break;
          
        case data === 'jobs_active':
          await showJobsList(bot, chatId, messageId, client, 'active');
          break;
          
        case data === 'jobs_completed':
          await showJobsList(bot, chatId, messageId, client, 'completed');
          break;
          
        case data === 'jobs_all':
          await showJobsList(bot, chatId, messageId, client, 'all');
          break;
          
        case data.startsWith('job_'):
          const jobId = data.replace('job_', '');
          await showJobDetails(bot, chatId, messageId, client, jobId);
          break;
          
        case data.startsWith('files_'):
          const filesJobId = data.replace('files_', '');
          await showJobFiles(bot, chatId, messageId, client, filesJobId);
          break;
          
        case data.startsWith('notes_'):
          const notesJobId = data.replace('notes_', '');
          await showJobNotes(bot, chatId, messageId, client, notesJobId);
          break;
          
        default:
          await bot.answerCallbackQuery(callbackQuery.id, { 
            text: 'Unknown action',
            show_alert: true 
          });
      }
    } else {
      // Handle logout
      logout(userId);
      await bot.editMessageText(
        '👋 You have been logged out successfully.\n\nUse /auth <code> to sign in again.',
        {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: 'Markdown'
        }
      );
    }
    
    // Answer the callback query
    await bot.answerCallbackQuery(callbackQuery.id);
    
  } catch (error) {
    console.error('Callback handler error:', error);
    await bot.answerCallbackQuery(callbackQuery.id, { 
      text: 'An error occurred. Please try again.',
      show_alert: true 
    });
  }
}

async function showMainMenu(bot, chatId, messageId, client) {
  const keyboard = createMainMenu(client.clientName);
  await bot.editMessageText(
    `📋 Welcome ${client.clientName}!\n\nWhat would you like to do?`,
    {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'Markdown',
      ...keyboard
    }
  );
}

async function showJobsMenu(bot, chatId, messageId, client) {
  const jobs = await getClientJobs(client.clientId);
  const keyboard = createJobsMenu(jobs.length);
  
  await bot.editMessageText(
    `📋 Your Jobs (${jobs.length} total)\n\nChoose a filter:`,
    {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'Markdown',
      ...keyboard
    }
  );
}

async function showSettingsMenu(bot, chatId, messageId) {
  const keyboard = createSettingsMenu();
  await bot.editMessageText(
    `⚙️ **Settings**\n\nChoose an option:`,
    {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'Markdown',
      ...keyboard
    }
  );
}

async function showJobsList(bot, chatId, messageId, client, filter) {
  const allJobs = await getClientJobs(client.clientId);
  let jobs = [];
  let title = '';
  
  switch (filter) {
    case 'active':
      jobs = allJobs.filter(job => {
        const status = (job.Status || job.status || '').toLowerCase();
        return status && !['completed', 'cancelled', 'closed'].includes(status);
      });
      title = `🔄 Active Jobs (${jobs.length})`;
      break;
      
    case 'completed':
      jobs = allJobs.filter(job => {
        const status = (job.Status || job.status || '').toLowerCase();
        return status && ['completed', 'cancelled', 'closed'].includes(status);
      });
      title = `✅ Completed Jobs (${jobs.length})`;
      break;
      
    case 'all':
      jobs = allJobs;
      title = `📊 All Jobs (${jobs.length})`;
      break;
  }
  
  if (jobs.length === 0) {
    const backButton = createBackButton('menu_jobs');
    await bot.editMessageText(
      `${title}\n\nNo jobs found.`,
      {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'Markdown',
        ...backButton
      }
    );
    return;
  }
  
  const keyboard = createJobListButtons(jobs, 'menu_jobs');
  await bot.editMessageText(
    title,
    {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'Markdown',
      ...keyboard
    }
  );
}

async function showJobDetails(bot, chatId, messageId, client, jobId) {
  const jobs = await getClientJobs(client.clientId);
  const job = jobs.find(j => (j.ID || j.id) === jobId);
  
  if (!job) {
    const backButton = createBackButton('menu_jobs');
    await bot.editMessageText(
      '❌ Job not found.',
      {
        chat_id: chatId,
        message_id: messageId,
        ...backButton
      }
    );
    return;
  }
  
  const jobDetails = formatJobDetails(job);
  const keyboard = createJobDetailsButtons(jobId, 'menu_jobs');
  
  await bot.editMessageText(
    jobDetails,
    {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'Markdown',
      ...keyboard
    }
  );
}

async function showJobFiles(bot, chatId, messageId, client, jobId) {
  // For now, show placeholder - we'll implement file integration later
  const backButton = createBackButton(`job_${jobId}`);
  
  await bot.sendMessage(
    chatId,
    `📎 **Files for Job ${jobId}:**\n\n🚧 File integration coming soon!\n\nFiles will be pulled from your dedicated Google Drive folder.`,
    {
      parse_mode: 'Markdown',
      ...backButton
    }
  );
}

async function showJobNotes(bot, chatId, messageId, client, jobId) {
  const jobs = await getClientJobs(client.clientId);
  const job = jobs.find(j => (j.ID || j.id) === jobId);
  
  if (!job) {
    const backButton = createBackButton(`job_${jobId}`);
    await bot.sendMessage(
      chatId,
      '❌ Job not found.',
      { ...backButton }
    );
    return;
  }
  
  const notes = job.Notes || job.notes;
  const jobTitle = job.Title || job.title;
  const backButton = createBackButton(`job_${jobId}`);
  
  const message = notes 
    ? `💬 **Notes for ${jobTitle}:**\n\n${notes}`
    : `💬 **Notes for ${jobTitle}:**\n\nNo notes available for this job.`;
  
  await bot.sendMessage(
    chatId,
    message,
    {
      parse_mode: 'Markdown',
      ...backButton
    }
  );
}

module.exports = {
  handleCallback,
  showMainMenu
};
