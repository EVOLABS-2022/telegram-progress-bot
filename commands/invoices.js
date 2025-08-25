const { getClientInvoices, getInvoicePDFUrl } = require('../lib/invoices');
const { getAuthenticatedClient, requireAuth } = require('../lib/auth');
const { format } = require('date-fns');

const statusEmojis = {
  'draft': '📝',
  'sent': '📤',
  'paid': '✅',
  'overdue': '⚠️',
  'cancelled': '❌',
  'pending': '⏳'
};

function getStatusEmoji(status) {
  const normalizedStatus = status?.toLowerCase();
  return statusEmojis[normalizedStatus] || '📄';
}

function formatDate(dateString) {
  if (!dateString) return 'Not set';
  try {
    return format(new Date(dateString), 'MMM dd, yyyy');
  } catch {
    return dateString;
  }
}

function formatCurrency(amount) {
  if (!amount) return '$0.00';
  const num = parseFloat(amount);
  return isNaN(num) ? amount : `$${num.toFixed(2)}`;
}

function formatInvoiceSummary(invoice) {
  const statusEmoji = getStatusEmoji(invoice.status);
  const dueDate = formatDate(invoice.dueAt);
  const amount = formatCurrency(invoice.total);
  
  let summary = `${statusEmoji} **Invoice #${invoice.id}**\n`;
  summary += `   Amount: ${amount}`;
  
  if (invoice.status) {
    summary += ` • Status: ${invoice.status}`;
  }
  
  if (invoice.dueAt) {
    summary += `\n   Due: ${dueDate}`;
  }
  
  return summary;
}

function formatInvoiceDetails(invoice) {
  const statusEmoji = getStatusEmoji(invoice.status);
  const amount = formatCurrency(invoice.total);
  
  let details = `${statusEmoji} **Invoice #${invoice.id}**\n\n`;
  details += `💰 **Amount:** ${amount}\n`;
  details += `📊 **Status:** ${invoice.status || 'Unknown'}\n`;
  
  if (invoice.dueAt) {
    details += `📅 **Due Date:** ${formatDate(invoice.dueAt)}\n`;
  }
  
  if (invoice.jobId) {
    details += `🔗 **Job:** ${invoice.jobId}\n`;
  }
  
  // Parse line items if they exist
  if (invoice.lineItems) {
    let lineItems;
    try {
      lineItems = typeof invoice.lineItems === 'string' 
        ? JSON.parse(invoice.lineItems) 
        : invoice.lineItems;
    } catch {
      lineItems = null;
    }
    
    if (lineItems && Array.isArray(lineItems) && lineItems.length > 0) {
      details += `\n📋 **Line Items:**\n`;
      lineItems.forEach((item, index) => {
        details += `${index + 1}. ${item.description} - ${formatCurrency(item.price)}\n`;
      });
    }
  }
  
  if (invoice.notes) {
    details += `\n📝 **Notes:**\n${invoice.notes}\n`;
  }
  
  if (invoice.terms) {
    details += `\n📄 **Terms:**\n${invoice.terms}\n`;
  }
  
  details += `\n📅 **Created:** ${formatDate(invoice.createdAt)}`;
  
  return details;
}

const invoicesCommand = requireAuth(async (msg) => {
  try {
    const client = getAuthenticatedClient(msg.from.id);
    const invoices = await getClientInvoices(client.clientId);
    
    if (!invoices || invoices.length === 0) {
      return {
        message: "📄 No invoices found for your account."
      };
    }
    
    // Sort by creation date (newest first)
    const sortedInvoices = invoices.sort((a, b) => {
      const dateA = new Date(a.createdAt || 0);
      const dateB = new Date(b.createdAt || 0);
      return dateB - dateA;
    });
    
    const pendingInvoices = sortedInvoices.filter(inv => 
      inv.status && !['paid', 'cancelled'].includes(inv.status.toLowerCase())
    );
    
    const paidInvoices = sortedInvoices.filter(inv => 
      inv.status && inv.status.toLowerCase() === 'paid'
    );
    
    let message = `📄 **Your Invoices** (${invoices.length} total)\n\n`;
    
    if (pendingInvoices.length > 0) {
      message += `**📋 Pending Invoices (${pendingInvoices.length}):**\n`;
      pendingInvoices.forEach(invoice => {
        message += `${formatInvoiceSummary(invoice)}\n\n`;
      });
    }
    
    if (paidInvoices.length > 0) {
      message += `**✅ Paid Invoices (${Math.min(paidInvoices.length, 5)}):**\n`;
      paidInvoices.slice(0, 5).forEach(invoice => {
        message += `${formatInvoiceSummary(invoice)}\n\n`;
      });
      
      if (paidInvoices.length > 5) {
        message += `... and ${paidInvoices.length - 5} more paid invoices\n\n`;
      }
    }
    
    // Calculate total amounts
    const totalPending = pendingInvoices.reduce((sum, inv) => {
      const amount = parseFloat(inv.total || 0);
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);
    
    const totalPaid = paidInvoices.reduce((sum, inv) => {
      const amount = parseFloat(inv.total || 0);
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);
    
    if (totalPending > 0) {
      message += `💰 **Total Pending:** ${formatCurrency(totalPending)}\n`;
    }
    
    if (totalPaid > 0) {
      message += `✅ **Total Paid:** ${formatCurrency(totalPaid)}\n`;
    }
    
    message += `\n💡 Use /invoice <number> to see details and download PDF`;
    
    return { message };
    
  } catch (error) {
    console.error('Invoices command error:', error);
    return {
      message: "❌ Error retrieving your invoices. Please try again later."
    };
  }
});

const invoiceCommand = requireAuth(async (msg) => {
  try {
    const args = msg.text.split(' ').slice(1);
    
    if (args.length === 0) {
      return {
        message: "📄 Please specify an invoice number.\n\nExample: `/invoice 000679`"
      };
    }
    
    const invoiceNumber = args[0];
    const client = getAuthenticatedClient(msg.from.id);
    const invoices = await getClientInvoices(client.clientId);
    
    const invoice = invoices.find(inv => inv.id === invoiceNumber);
    
    if (!invoice) {
      return {
        message: `❌ Invoice #${invoiceNumber} not found in your invoices.`
      };
    }
    
    let message = formatInvoiceDetails(invoice);
    
    // Try to get PDF download link
    try {
      const pdfInfo = await getInvoicePDFUrl(invoice.id);
      if (pdfInfo) {
        message += `\n\n📥 [Download PDF](${pdfInfo.url})`;
      } else {
        message += `\n\n📄 PDF not yet generated. Contact support if needed.`;
      }
    } catch (error) {
      console.error('Error getting PDF URL:', error);
      message += `\n\n📄 PDF download currently unavailable.`;
    }
    
    return { message };
    
  } catch (error) {
    console.error('Invoice command error:', error);
    return {
      message: "❌ Error retrieving invoice details. Please try again later."
    };
  }
});

module.exports = {
  invoicesCommand,
  invoiceCommand
};