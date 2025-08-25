const { getClientJobs } = require('../lib/sheets');
const { getAuthenticatedClient, requireAuth } = require('../lib/auth');
const { format } = require('date-fns');

const statusEmojis = {
  'pending': '⏳',
  'in-progress': '🔄',
  'in progress': '🔄',
  'review': '👀',
  'completed': '✅',
  'cancelled': '❌',
  'on-hold': '⏸️',
  'blocked': '🚫'
};

const priorityEmojis = {
  'low': '🟢',
  'medium': '🟡',
  'high': '🔴',
  'urgent': '🚨'
};

function getStatusEmoji(status) {
  const normalizedStatus = status?.toLowerCase();
  return statusEmojis[normalizedStatus] || '📄';
}

function getPriorityEmoji(priority) {
  const normalizedPriority = priority?.toLowerCase();
  return priorityEmojis[normalizedPriority] || '';
}

function formatDate(dateString) {
  if (!dateString) return 'Not set';
  try {
    return format(new Date(dateString), 'MMM dd, yyyy');
  } catch {
    return dateString;
  }
}

function formatJobSummary(job) {
  const statusEmoji = getStatusEmoji(job.Status || job.status);
  const priorityEmoji = getPriorityEmoji(job.Priority || job.priority);
  const deadline = formatDate(job.Deadline || job.deadline);
  const title = job.Title || job.title;
  const id = job.ID || job.id;
  const status = job.Status || job.status;
  const priority = job.Priority || job.priority;
  const budget = job.Budget || job.budget;
  
  let summary = `${statusEmoji} **${title}** (${id})\n`;
  summary += `   Status: ${status}`;
  
  if (priority && priorityEmoji) {
    summary += ` ${priorityEmoji} ${priority}`;
  }
  
  // Always show deadline if it exists
  if (deadline && deadline !== 'Not set') {
    summary += `\n   📅 Deadline: ${deadline}`;
  }
  
  return summary;
}

function formatJobDetails(job) {
  const statusEmoji = getStatusEmoji(job.Status || job.status);
  const priorityEmoji = getPriorityEmoji(job.Priority || job.priority);
  const title = job.Title || job.title;
  const id = job.ID || job.id;
  const status = job.Status || job.status;
  const priority = job.Priority || job.priority;
  const deadline = job.Deadline || job.deadline;
  const budget = job.Budget || job.budget;
  const description = job.Description || job.description;
  const notes = job.Notes || job.notes;
  const createdAt = job['Created At'] || job.createdAt;
  const closedAt = job.closedAt;
  
  let details = `🛠️ **${title}**\n\n`;
  details += `📋 ID: ${id}\n`;
  details += `📊 Status: ${status}`;
  
  if (priority && priorityEmoji) {
    details += ` ${priorityEmoji} ${priority}`;
  }
  
  details += `\n`;
  
  if (deadline) {
    details += `📅 **Deadline:** ${formatDate(deadline)}\n`;
  }
  
  if (description) {
    details += `\n📝 **Description:**\n${description}`;
  }
  
  if (notes) {
    details += `\n💬 **Notes:**\n${notes}`;
  }
  
  if (closedAt) {
    details += `\n✅ Completed: ${formatDate(closedAt)}`;
  }
  
  return details;
}

const jobsCommand = requireAuth(async (msg) => {
  try {
    const client = getAuthenticatedClient(msg.from.id);
    const jobs = await getClientJobs(client.clientId);
    
    if (!jobs || jobs.length === 0) {
      return {
        message: "📋 No jobs found for your account."
      };
    }
    
    const activeJobs = jobs.filter(job => {
      const status = (job.Status || job.status || '').toLowerCase();
      return status && !['completed', 'cancelled', 'closed'].includes(status);
    });
    
    const completedJobs = jobs.filter(job => {
      const status = (job.Status || job.status || '').toLowerCase();
      return status && ['completed', 'cancelled', 'closed'].includes(status);
    });
    
    let message = `📋 **Your Jobs** (${jobs.length} total)\n\n`;
    
    if (activeJobs.length > 0) {
      message += `**🔄 Active Jobs (${activeJobs.length}):**\n`;
      activeJobs.forEach(job => {
        message += `${formatJobSummary(job)}\n\n`;
      });
    }
    
    if (completedJobs.length > 0) {
      message += `**✅ Completed Jobs (${completedJobs.length}):**\n`;
      completedJobs.slice(0, 5).forEach(job => {
        message += `${formatJobSummary(job)}\n\n`;
      });
      
      if (completedJobs.length > 5) {
        message += `... and ${completedJobs.length - 5} more completed jobs\n\n`;
      }
    }
    
    message += `💡 Use /job <code> to see details of a specific job`;
    
    return { message };
    
  } catch (error) {
    console.error('Jobs command error:', error);
    return {
      message: "❌ Error retrieving your jobs. Please try again later."
    };
  }
});

const jobCommand = requireAuth(async (msg) => {
  try {
    const args = msg.text.split(' ').slice(1);
    
    if (args.length === 0) {
      return {
        message: "📋 Please specify a job code.\n\nExample: `/job J001`"
      };
    }
    
    const jobCode = args[0];
    const client = getAuthenticatedClient(msg.from.id);
    const jobs = await getClientJobs(client.clientId);
    
    const job = jobs.find(j => {
      const id = j.ID || j.id || '';
      const code = j.Code || j.code || '';
      return id.toLowerCase() === jobCode.toLowerCase() || 
             code.toLowerCase() === jobCode.toLowerCase();
    });
    
    if (!job) {
      return {
        message: `❌ Job with code "${jobCode}" not found in your jobs.`
      };
    }
    
    const message = formatJobDetails(job);
    
    return { message };
    
  } catch (error) {
    console.error('Job command error:', error);
    return {
      message: "❌ Error retrieving job details. Please try again later."
    };
  }
});

const statusCommand = requireAuth(async (msg) => {
  try {
    const client = getAuthenticatedClient(msg.from.id);
    const jobs = await getClientJobs(client.clientId);
    
    if (!jobs || jobs.length === 0) {
      return {
        message: "📋 No jobs found for your account."
      };
    }
    
    const statusCounts = {};
    jobs.forEach(job => {
      const status = job.Status || job.status || 'unknown';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });
    
    let message = `📊 **Job Status Overview**\n\n`;
    
    Object.entries(statusCounts).forEach(([status, count]) => {
      const emoji = getStatusEmoji(status);
      message += `${emoji} ${status}: ${count} job${count !== 1 ? 's' : ''}\n`;
    });
    
    const inProgressJobs = jobs.filter(job => {
      const status = (job.Status || job.status || '').toLowerCase();
      return status && ['in-progress', 'in progress', 'review', 'open'].includes(status);
    });
    
    if (inProgressJobs.length > 0) {
      message += `\n**🔄 Currently Active:**\n`;
      inProgressJobs.forEach(job => {
        const title = job.Title || job.title;
        const id = job.ID || job.id;
        message += `• ${title} (${id})\n`;
      });
    }
    
    return { message };
    
  } catch (error) {
    console.error('Status command error:', error);
    return {
      message: "❌ Error retrieving status information. Please try again later."
    };
  }
});

module.exports = {
  jobsCommand,
  jobCommand,
  statusCommand
};