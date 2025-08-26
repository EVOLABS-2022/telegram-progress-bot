// lib/callbackHandler.js - Handle all button callbacks

const { getAuthenticatedClient, logout } = require('./auth');
const { getClientJobs } = require('./sheets');
const { getClientInvoices } = require('./invoices');
const { getClientFiles, downloadFile, categorizeFiles } = require('./driveFiles');
const { 
  createMainMenu, 
  createJobsMenu, 
  createJobListButtons, 
  createJobDetailsButtons,
  createBackButton,
  createSettingsMenu,
  getStatusEmoji 
} = require('./keyboards');
const {
  createInvoiceFilterButtons,
  createInvoiceListButtons, 
  createInvoiceDetailsButtons,
  createClientFilesButtons,
  createFileCategoryButtons,
  formatInvoiceDetails
} = require('../commands/invoiceButtons');

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
          
        case data === 'menu_invoices':
          await showInvoicesMenu(bot, chatId, messageId, client);
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
          
        // Invoice handlers
        case data === 'invoices_pending':
          await showInvoicesList(bot, chatId, messageId, client, 'pending');
          break;
          
        case data === 'invoices_paid':
          await showInvoicesList(bot, chatId, messageId, client, 'paid');
          break;
          
        case data === 'invoices_all':
          await showInvoicesList(bot, chatId, messageId, client, 'all');
          break;
          
        case data.startsWith('invoice_download_'):
          const downloadInvoiceId = data.replace('invoice_download_', '');
          await downloadInvoicePDF(bot, chatId, client, downloadInvoiceId);
          break;
          
        case data.startsWith('invoice_'):
          const invoiceId = data.replace('invoice_', '');
          if (!invoiceId.startsWith('download_')) {
            await showInvoiceDetails(bot, chatId, messageId, client, invoiceId);
          }
          break;
          
        case data === 'client_files':
          await showClientFiles(bot, chatId, messageId, client);
          break;
          
        case data.startsWith('files_'):
          const fileCategory = data.replace('files_', '');
          await showFileCategory(bot, chatId, messageId, client, fileCategory);
          break;
          
        case data.startsWith('download_'):
          const fileId = data.replace('download_', '');
          await downloadClientFile(bot, chatId, client, fileId);
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

// Invoice handler functions
async function showInvoicesMenu(bot, chatId, messageId, client) {
  const invoices = await getClientInvoices(client.clientId);
  const keyboard = createInvoiceFilterButtons();
  
  await bot.editMessageText(
    `💰 Your Invoices (${invoices.length} total)\n\nChoose a filter:`,
    {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'Markdown',
      ...keyboard
    }
  );
}

async function showInvoicesList(bot, chatId, messageId, client, filter) {
  const allInvoices = await getClientInvoices(client.clientId);
  let invoices = [];
  let title = '';
  
  switch (filter) {
    case 'pending':
      invoices = allInvoices.filter(inv => {
        const status = (inv.Status || inv.status || '').toLowerCase();
        return status && !['paid'].includes(status);
      });
      title = `📋 Pending Invoices (${invoices.length})`;
      break;
      
    case 'paid':
      invoices = allInvoices.filter(inv => {
        const status = (inv.Status || inv.status || '').toLowerCase();
        return status && ['paid'].includes(status);
      });
      title = `✅ Paid Invoices (${invoices.length})`;
      break;
      
    case 'all':
      invoices = allInvoices;
      title = `📊 All Invoices (${invoices.length})`;
      break;
  }
  
  if (invoices.length === 0) {
    const backButton = createBackButton('menu_invoices');
    await bot.editMessageText(
      `${title}\n\nNo invoices found.`,
      {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'Markdown',
        ...backButton
      }
    );
    return;
  }
  
  const keyboard = createInvoiceListButtons(invoices, 'menu_invoices');
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

async function showInvoiceDetails(bot, chatId, messageId, client, invoiceId) {
  const invoices = await getClientInvoices(client.clientId);
  const invoice = invoices.find(inv => (inv.ID || inv.id) === invoiceId);
  
  if (!invoice) {
    const backButton = createBackButton('menu_invoices');
    await bot.editMessageText(
      '❌ Invoice not found.',
      {
        chat_id: chatId,
        message_id: messageId,
        ...backButton
      }
    );
    return;
  }
  
  const invoiceDetails = formatInvoiceDetails(invoice);
  const keyboard = createInvoiceDetailsButtons(invoiceId, 'menu_invoices');
  
  await bot.editMessageText(
    invoiceDetails,
    {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'Markdown',
      ...keyboard
    }
  );
}

async function downloadInvoicePDF(bot, chatId, client, invoiceId) {
  try {
    // Get client files and look for invoice
    const files = await getClientFiles(client.clientCode);
    const invoiceFile = files.find(file => 
      file.name.toLowerCase().includes('invoice') && 
      file.name.includes(invoiceId)
    );
    
    if (!invoiceFile) {
      await bot.sendMessage(chatId, '❌ Invoice PDF not found in your files.');
      return;
    }
    
    await bot.sendMessage(chatId, '📥 Downloading your invoice PDF...');
    
    const fileData = await downloadFile(invoiceFile.id);
    
    if (fileData) {
      // Send the PDF file directly
      await bot.sendDocument(chatId, Buffer.from(fileData.data), {
        filename: fileData.name,
        caption: `📄 Invoice #${invoiceId}`
      });
    } else {
      await bot.sendMessage(chatId, '❌ Failed to download invoice PDF. Please try again.');
    }
    
  } catch (error) {
    console.error('Error downloading invoice PDF:', error);
    await bot.sendMessage(chatId, '❌ Error downloading invoice PDF. Please try again.');
  }
}

async function showClientFiles(bot, chatId, messageId, client) {
  try {
    const files = await getClientFiles(client.clientCode);
    
    if (files.length === 0) {
      const backButton = createBackButton('menu_invoices');
      await bot.editMessageText(
        '📁 No files found in your folder.',
        {
          chat_id: chatId,
          message_id: messageId,
          ...backButton
        }
      );
      return;
    }
    
    const keyboard = createClientFilesButtons(files);
    await bot.editMessageText(
      `📁 **Your Files** (${files.length} total)\n\nChoose a category:`,
      {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'Markdown',
        ...keyboard
      }
    );
    
  } catch (error) {
    console.error('Error showing client files:', error);
    const backButton = createBackButton('menu_invoices');
    await bot.editMessageText(
      '❌ Error loading your files. Please try again.',
      {
        chat_id: chatId,
        message_id: messageId,
        ...backButton
      }
    );
  }
}

async function showFileCategory(bot, chatId, messageId, client, category) {
  try {
    const files = await getClientFiles(client.clientCode);
    const categorized = categorizeFiles(files);
    
    let categoryFiles = [];
    let categoryName = '';
    
    switch (category) {
      case 'invoices':
        categoryFiles = categorized.invoices;
        categoryName = 'Invoices';
        break;
      case 'contracts':
        categoryFiles = categorized.contracts;
        categoryName = 'Contracts';
        break;
      case 'images':
        categoryFiles = categorized.images;
        categoryName = 'Images';
        break;
      case 'documents':
        categoryFiles = categorized.documents;
        categoryName = 'Documents';
        break;
      case 'other':
        categoryFiles = categorized.other;
        categoryName = 'Other Files';
        break;
    }
    
    if (categoryFiles.length === 0) {
      const backButton = createBackButton('client_files');
      await bot.editMessageText(
        `📁 No ${categoryName.toLowerCase()} found.`,
        {
          chat_id: chatId,
          message_id: messageId,
          ...backButton
        }
      );
      return;
    }
    
    const keyboard = createFileCategoryButtons(categoryFiles, category);
    await bot.editMessageText(
      `📁 **${categoryName}** (${categoryFiles.length})\n\nTap to download:`,
      {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'Markdown',
        ...keyboard
      }
    );
    
  } catch (error) {
    console.error('Error showing file category:', error);
    const backButton = createBackButton('client_files');
    await bot.editMessageText(
      '❌ Error loading files. Please try again.',
      {
        chat_id: chatId,
        message_id: messageId,
        ...backButton
      }
    );
  }
}

async function downloadClientFile(bot, chatId, client, fileId) {
  try {
    await bot.sendMessage(chatId, '📥 Downloading file...');
    
    const fileData = await downloadFile(fileId);
    
    if (fileData) {
      // Send the file directly
      await bot.sendDocument(chatId, Buffer.from(fileData.data), {
        filename: fileData.name,
        caption: `📁 ${fileData.name}`
      });
    } else {
      await bot.sendMessage(chatId, '❌ Failed to download file. Please try again.');
    }
    
  } catch (error) {
    console.error('Error downloading client file:', error);
    await bot.sendMessage(chatId, '❌ Error downloading file. Please try again.');
  }
}

module.exports = {
  handleCallback,
  showMainMenu
};
