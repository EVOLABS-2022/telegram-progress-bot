// commands/invoiceButtons.js - Invoice button handlers

const { getClientInvoices } = require('../lib/invoices');
const { getClientFiles, downloadFile, categorizeFiles } = require('../lib/driveFiles');
const { getAuthenticatedClient } = require('../lib/auth');
const { format } = require('date-fns');

function formatCurrency(amount) {
  if (!amount) return '$0.00';
  const num = parseFloat(amount);
  return isNaN(num) ? amount : `$${num.toFixed(2)}`;
}

function formatDate(dateString) {
  if (!dateString) return 'Not set';
  try {
    return format(new Date(dateString), 'MMM dd, yyyy');
  } catch {
    return dateString;
  }
}

// Create invoice filter buttons
function createInvoiceFilterButtons() {
  return {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '📋 Pending', callback_data: 'invoices_pending' },
          { text: '✅ Paid', callback_data: 'invoices_paid' }
        ],
        [
          { text: '📊 All Invoices', callback_data: 'invoices_all' }
        ],
        [
          { text: '🔙 Main Menu', callback_data: 'main_menu' }
        ]
      ]
    }
  };
}

// Create invoice list buttons
function createInvoiceListButtons(invoices, backAction) {
  const buttons = [];
  
  // Create buttons for invoices (1 per row to show amount)
  invoices.forEach(invoice => {
    const amount = formatCurrency(invoice.Total || invoice.total);
    const status = invoice.Status || invoice.status || 'unknown';
    const statusEmoji = getInvoiceStatusEmoji(status);
    
    buttons.push([{
      text: `${statusEmoji} Invoice #${invoice.ID || invoice.id} - ${amount}`,
      callback_data: `invoice_${invoice.ID || invoice.id}`
    }]);
  });
  
  // Back button
  buttons.push([
    { text: '🔙 Invoices Menu', callback_data: backAction }
  ]);
  
  return {
    reply_markup: {
      inline_keyboard: buttons
    }
  };
}

// Create invoice details buttons
function createInvoiceDetailsButtons(invoiceId, backAction) {
  return {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '📥 Download PDF', callback_data: `invoice_download_${invoiceId}` },
          { text: '📁 All Files', callback_data: `client_files` }
        ],
        [
          { text: '🔙 Back', callback_data: backAction }
        ]
      ]
    }
  };
}

// Create client files buttons (categorized)
function createClientFilesButtons(files) {
  const buttons = [];
  const categorized = categorizeFiles(files);
  
  // Add category buttons if files exist
  if (categorized.invoices.length > 0) {
    buttons.push([{ text: `📄 Invoices (${categorized.invoices.length})`, callback_data: 'files_invoices' }]);
  }
  if (categorized.contracts.length > 0) {
    buttons.push([{ text: `📋 Contracts (${categorized.contracts.length})`, callback_data: 'files_contracts' }]);
  }
  if (categorized.images.length > 0) {
    buttons.push([{ text: `🖼️ Images (${categorized.images.length})`, callback_data: 'files_images' }]);
  }
  if (categorized.documents.length > 0) {
    buttons.push([{ text: `📄 Documents (${categorized.documents.length})`, callback_data: 'files_documents' }]);
  }
  if (categorized.other.length > 0) {
    buttons.push([{ text: `📁 Other (${categorized.other.length})`, callback_data: 'files_other' }]);
  }
  
  // If no categories, show all files
  if (buttons.length === 0) {
    files.forEach(file => {
      const emoji = getFileEmoji(file.name, file.mimeType);
      buttons.push([{
        text: `${emoji} ${file.name}`,
        callback_data: `download_${file.id}`
      }]);
    });
  }
  
  buttons.push([{ text: '🔙 Back', callback_data: 'menu_invoices' }]);
  
  return {
    reply_markup: {
      inline_keyboard: buttons
    }
  };
}

// Create file category buttons
function createFileCategoryButtons(files, category) {
  const buttons = [];
  
  files.forEach(file => {
    const emoji = getFileEmoji(file.name, file.mimeType);
    buttons.push([{
      text: `${emoji} ${file.name}`,
      callback_data: `download_${file.id}`
    }]);
  });
  
  buttons.push([{ text: '🔙 All Files', callback_data: 'client_files' }]);
  
  return {
    reply_markup: {
      inline_keyboard: buttons
    }
  };
}

function getInvoiceStatusEmoji(status) {
  const statusEmojis = {
    'draft': '📝',
    'sent': '📤',
    'paid': '✅',
    'pending': '📋',
    'overdue': '⚠️',
    'cancelled': '❌'
  };
  
  return statusEmojis[status?.toLowerCase()] || '📄';
}

function getFileEmoji(fileName, mimeType) {
  const name = fileName.toLowerCase();
  
  if (name.includes('invoice')) return '📄';
  if (name.includes('contract')) return '📋';
  if (mimeType && mimeType.startsWith('image/')) return '🖼️';
  if (name.includes('.pdf')) return '📄';
  if (name.includes('.doc') || name.includes('.docx')) return '📝';
  if (name.includes('.xls') || name.includes('.xlsx')) return '📊';
  if (name.includes('.zip') || name.includes('.rar')) return '🗜️';
  
  return '📁';
}

function formatInvoiceDetails(invoice) {
  const amount = formatCurrency(invoice.Total || invoice.total);
  const status = invoice.Status || invoice.status;
  const dueDate = formatDate(invoice['Due Date'] || invoice.dueAt);
  const jobId = invoice['Job ID'] || invoice.jobId;
  const notes = invoice.Notes || invoice.notes;
  const statusEmoji = getInvoiceStatusEmoji(status);
  
  let details = `${statusEmoji} **Invoice #${invoice.ID || invoice.id}**\n\n`;
  details += `💰 **Amount:** ${amount}\n`;
  details += `📊 **Status:** ${status || 'Unknown'}\n`;
  
  if (dueDate && dueDate !== 'Not set') {
    details += `📅 **Due Date:** ${dueDate}\n`;
  }
  
  if (jobId) {
    details += `🔗 **Job:** ${jobId}\n`;
  }
  
  // Parse and display line items
  const lineItems = parseLineItems(invoice);
  if (lineItems.length > 0) {
    details += `\n📋 **Line Items:**\n`;
    lineItems.forEach((item, index) => {
      details += `${index + 1}. ${item.description} - ${formatCurrency(item.price)}\n`;
    });
  }
  
  if (notes) {
    details += `\n📝 **Notes:**\n${notes}`;
  }
  
  return details;
}

function parseLineItems(invoice) {
  const items = [];
  
  // Parse line items from individual columns (Line1_Description, Line1_Price, etc.)
  for (let i = 1; i <= 10; i++) {
    const description = invoice[`Line${i}_Description`];
    const price = invoice[`Line${i}_Price`];
    
    if (description && price) {
      items.push({
        description: description,
        price: parseFloat(price) || 0
      });
    }
  }
  
  return items;
}

module.exports = {
  createInvoiceFilterButtons,
  createInvoiceListButtons,
  createInvoiceDetailsButtons,
  createClientFilesButtons,
  createFileCategoryButtons,
  formatInvoiceDetails,
  getFileEmoji
};
