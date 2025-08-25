// lib/keyboards.js - Inline keyboard utilities

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

function getStatusEmoji(status) {
  const normalizedStatus = status?.toLowerCase();
  return statusEmojis[normalizedStatus] || '📋';
}

// Main menu after authentication
function createMainMenu(clientName) {
  return {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '📊 My Jobs', callback_data: 'menu_jobs' },
          { text: '💰 Invoices', callback_data: 'menu_invoices' }
        ],
        [
          { text: '⚙️ Settings', callback_data: 'menu_settings' }
        ]
      ]
    }
  };
}

// Jobs menu (Active/Completed/All)
function createJobsMenu(totalJobs) {
  return {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '🔄 Active', callback_data: 'jobs_active' },
          { text: '✅ Completed', callback_data: 'jobs_completed' }
        ],
        [
          { text: '📊 All Jobs', callback_data: 'jobs_all' }
        ],
        [
          { text: '🔙 Main Menu', callback_data: 'main_menu' }
        ]
      ]
    }
  };
}

// Job list buttons (individual jobs)
function createJobListButtons(jobs, backAction) {
  const buttons = [];
  
  // Create buttons for jobs (2 per row)
  for (let i = 0; i < jobs.length; i += 2) {
    const row = [];
    
    const job1 = jobs[i];
    const emoji1 = getStatusEmoji(job1.Status || job1.status);
    const title1 = (job1.Title || job1.title || '').substring(0, 25);
    row.push({
      text: `${emoji1} ${title1}`,
      callback_data: `job_${job1.ID || job1.id}`
    });
    
    if (i + 1 < jobs.length) {
      const job2 = jobs[i + 1];
      const emoji2 = getStatusEmoji(job2.Status || job2.status);
      const title2 = (job2.Title || job2.title || '').substring(0, 25);
      row.push({
        text: `${emoji2} ${title2}`,
        callback_data: `job_${job2.ID || job2.id}`
      });
    }
    
    buttons.push(row);
  }
  
  // Back button
  buttons.push([
    { text: '🔙 Jobs Menu', callback_data: backAction }
  ]);
  
  return {
    reply_markup: {
      inline_keyboard: buttons
    }
  };
}

// Job details action buttons
function createJobDetailsButtons(jobId, backAction) {
  return {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '📎 Files', callback_data: `files_${jobId}` },
          { text: '💬 Notes', callback_data: `notes_${jobId}` }
        ],
        [
          { text: '🔙 Back', callback_data: backAction }
        ]
      ]
    }
  };
}

// Files list with download buttons
function createFilesButtons(jobId, files, backAction) {
  const buttons = [];
  
  // File download buttons
  files.forEach(file => {
    buttons.push([
      { text: `📄 ${file.name}`, callback_data: `download_${file.id}` }
    ]);
  });
  
  // Back button
  buttons.push([
    { text: '🔙 Back to Job', callback_data: backAction }
  ]);
  
  return {
    reply_markup: {
      inline_keyboard: buttons
    }
  };
}

// Simple back button
function createBackButton(backAction) {
  return {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '🔙 Back', callback_data: backAction }
        ]
      ]
    }
  };
}

// Settings menu
function createSettingsMenu() {
  return {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '🚪 Logout', callback_data: 'logout' }
        ],
        [
          { text: '🔙 Main Menu', callback_data: 'main_menu' }
        ]
      ]
    }
  };
}

module.exports = {
  getStatusEmoji,
  createMainMenu,
  createJobsMenu,
  createJobListButtons,
  createJobDetailsButtons,
  createFilesButtons,
  createBackButton,
  createSettingsMenu
};
