const { v4: uuidv4 } = require('uuid');
const { addNewClient } = require('./sheets');

// Store intake form sessions in memory
const intakeSessions = new Map();

// Form steps
const FORM_STEPS = {
  NAME: 'name',
  EMAIL: 'email', 
  COMPANY: 'company',
  PHONE: 'phone',
  PROJECT_TYPE: 'project_type',
  PROJECT_GOAL: 'project_goal',
  TIMEFRAME: 'timeframe',
  BUDGET: 'budget',
  ADDITIONAL_INFO: 'additional_info',
  CONFIRMATION: 'confirmation'
};

// Form data structure
function createIntakeSession(userId) {
  return {
    userId,
    step: FORM_STEPS.NAME,
    data: {
      name: '',
      email: '',
      company: '',
      phone: '',
      projectTypes: [],
      projectGoal: '',
      timeframe: '',
      budget: '',
      additionalInfo: ''
    },
    messageId: null,
    createdAt: new Date()
  };
}

// Start intake form
function startIntake(userId) {
  const session = createIntakeSession(userId);
  intakeSessions.set(userId, session);
  return session;
}

// Get current session
function getIntakeSession(userId) {
  return intakeSessions.get(userId);
}

// Clear session
function clearIntakeSession(userId) {
  intakeSessions.delete(userId);
}

// Get step message and keyboard
function getStepContent(step, data = {}) {
  switch (step) {
    case FORM_STEPS.NAME:
      return {
        message: "📝 **Client Intake Form**\n\n**What's your full name?** \\*\n\n_Please type your name below._",
        keyboard: null,
        requiresInput: true
      };

    case FORM_STEPS.EMAIL:
      return {
        message: `✅ Name: ${data.name}\n\n📧 **What's your email address?** \\*\n\n_Please type your email below._`,
        keyboard: null,
        requiresInput: true
      };

    case FORM_STEPS.COMPANY:
      return {
        message: `✅ Name: ${data.name}\n✅ Email: ${data.email}\n\n🏢 **Company name** (optional)\n\n_Type your company name or send /skip to skip._`,
        keyboard: null,
        requiresInput: true
      };

    case FORM_STEPS.PHONE:
      return {
        message: `✅ Name: ${data.name}\n✅ Email: ${data.email}\n${data.company ? `✅ Company: ${data.company}\n` : ''}\n📱 **Phone number** (optional)\n\n_Type your phone number or send /skip to skip._`,
        keyboard: null,
        requiresInput: true
      };

    case FORM_STEPS.PROJECT_TYPE:
      return {
        message: `✅ Name: ${data.name}\n✅ Email: ${data.email}\n${data.company ? `✅ Company: ${data.company}\n` : ''}${data.phone ? `✅ Phone: ${data.phone}\n` : ''}\n🎯 **Project Type** \\* (select all that apply)\n\n_Choose your project type(s):_`,
        keyboard: {
          reply_markup: {
            inline_keyboard: [
              [{ text: '💻 Web/Mobile Development', callback_data: 'intake_type_web' }],
              [{ text: '🔗 Web3 Development', callback_data: 'intake_type_web3' }],
              [{ text: '🎬 2D/3D Animation', callback_data: 'intake_type_animation' }],
              [{ text: '🎨 Digital Art/Graphics', callback_data: 'intake_type_art' }],
              [{ text: '🎭 Mixed Media', callback_data: 'intake_type_mixed' }],
              [{ text: '✅ Continue', callback_data: 'intake_continue' }]
            ]
          }
        },
        requiresInput: false
      };

    case FORM_STEPS.PROJECT_GOAL:
      return {
        message: `✅ Name: ${data.name}\n✅ Email: ${data.email}\n${data.company ? `✅ Company: ${data.company}\n` : ''}${data.phone ? `✅ Phone: ${data.phone}\n` : ''}✅ Project Type(s): ${data.projectTypes.join(', ')}\n\n🎯 **What's your project goal?** \\*\n\n_Please describe what you want to achieve._`,
        keyboard: null,
        requiresInput: true
      };

    case FORM_STEPS.TIMEFRAME:
      return {
        message: `✅ Name: ${data.name}\n✅ Email: ${data.email}\n${data.company ? `✅ Company: ${data.company}\n` : ''}${data.phone ? `✅ Phone: ${data.phone}\n` : ''}✅ Project Type(s): ${data.projectTypes.join(', ')}\n✅ Project Goal: ${data.projectGoal.substring(0, 50)}${data.projectGoal.length > 50 ? '...' : ''}\n\n⏰ **Project Timeframe** \\*\n\n_When do you need this completed?_`,
        keyboard: {
          reply_markup: {
            inline_keyboard: [
              [{ text: '🚀 ASAP', callback_data: 'intake_time_asap' }],
              [{ text: '📅 Within 1 month', callback_data: 'intake_time_1month' }],
              [{ text: '📆 1-3 months', callback_data: 'intake_time_3months' }],
              [{ text: '🗓️ 3-6 months', callback_data: 'intake_time_6months' }],
              [{ text: '⏳ 6+ months', callback_data: 'intake_time_6plus' }],
              [{ text: '🤝 Flexible', callback_data: 'intake_time_flexible' }]
            ]
          }
        },
        requiresInput: false
      };

    case FORM_STEPS.BUDGET:
      return {
        message: `✅ Name: ${data.name}\n✅ Email: ${data.email}\n${data.company ? `✅ Company: ${data.company}\n` : ''}${data.phone ? `✅ Phone: ${data.phone}\n` : ''}✅ Project Type(s): ${data.projectTypes.join(', ')}\n✅ Project Goal: ${data.projectGoal.substring(0, 50)}${data.projectGoal.length > 50 ? '...' : ''}\n✅ Timeframe: ${data.timeframe}\n\n💰 **Project Budget** \\*\n\n_What's your budget range?_`,
        keyboard: {
          reply_markup: {
            inline_keyboard: [
              [{ text: '💵 Under $5,000', callback_data: 'intake_budget_5k' }],
              [{ text: '💰 $5,000 - $15,000', callback_data: 'intake_budget_15k' }],
              [{ text: '💎 $15,000 - $50,000', callback_data: 'intake_budget_50k' }],
              [{ text: '💸 $50,000 - $100,000', callback_data: 'intake_budget_100k' }],
              [{ text: '🏆 Over $100,000', callback_data: 'intake_budget_100k_plus' }]
            ]
          }
        },
        requiresInput: false
      };

    case FORM_STEPS.ADDITIONAL_INFO:
      return {
        message: `✅ Name: ${data.name}\n✅ Email: ${data.email}\n${data.company ? `✅ Company: ${data.company}\n` : ''}${data.phone ? `✅ Phone: ${data.phone}\n` : ''}✅ Project Type(s): ${data.projectTypes.join(', ')}\n✅ Project Goal: ${data.projectGoal.substring(0, 50)}${data.projectGoal.length > 50 ? '...' : ''}\n✅ Timeframe: ${data.timeframe}\n✅ Budget: ${data.budget}\n\n📋 **Additional Information** (optional)\n\n_Any other details about your project? Type your message or send /skip to skip._`,
        keyboard: null,
        requiresInput: true
      };

    case FORM_STEPS.CONFIRMATION:
      return {
        message: `🎉 **Review Your Information**\n\n👤 **Name:** ${data.name}\n📧 **Email:** ${data.email}\n${data.company ? `🏢 **Company:** ${data.company}\n` : ''}${data.phone ? `📱 **Phone:** ${data.phone}\n` : ''}🎯 **Project Type(s):** ${data.projectTypes.join(', ')}\n📝 **Project Goal:** ${data.projectGoal}\n⏰ **Timeframe:** ${data.timeframe}\n💰 **Budget:** ${data.budget}\n${data.additionalInfo ? `📋 **Additional Info:** ${data.additionalInfo}\n` : ''}\n_Is this information correct?_`,
        keyboard: {
          reply_markup: {
            inline_keyboard: [
              [
                { text: '✅ Submit', callback_data: 'intake_submit' },
                { text: '❌ Cancel', callback_data: 'intake_cancel' }
              ]
            ]
          }
        },
        requiresInput: false
      };

    default:
      return {
        message: 'Unknown step',
        keyboard: null,
        requiresInput: false
      };
  }
}

// Process user input for current step
function processStepInput(session, input) {
  switch (session.step) {
    case FORM_STEPS.NAME:
      if (input.trim()) {
        session.data.name = input.trim();
        session.step = FORM_STEPS.EMAIL;
        return { success: true };
      }
      return { success: false, error: 'Please enter your name.' };

    case FORM_STEPS.EMAIL:
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (emailRegex.test(input.trim())) {
        session.data.email = input.trim();
        session.step = FORM_STEPS.COMPANY;
        return { success: true };
      }
      return { success: false, error: 'Please enter a valid email address.' };

    case FORM_STEPS.COMPANY:
      session.data.company = input.trim();
      session.step = FORM_STEPS.PHONE;
      return { success: true };

    case FORM_STEPS.PHONE:
      session.data.phone = input.trim();
      session.step = FORM_STEPS.PROJECT_TYPE;
      return { success: true };

    case FORM_STEPS.PROJECT_GOAL:
      if (input.trim()) {
        session.data.projectGoal = input.trim();
        session.step = FORM_STEPS.TIMEFRAME;
        return { success: true };
      }
      return { success: false, error: 'Please describe your project goal.' };

    case FORM_STEPS.ADDITIONAL_INFO:
      session.data.additionalInfo = input.trim();
      session.step = FORM_STEPS.CONFIRMATION;
      return { success: true };

    default:
      return { success: false, error: 'Invalid step for text input.' };
  }
}

// Process button callback
function processCallback(session, callbackData) {
  switch (true) {
    // Project type selections
    case callbackData.startsWith('intake_type_'):
      const typeMap = {
        'intake_type_web': 'Web/Mobile Development',
        'intake_type_web3': 'Web3 Development', 
        'intake_type_animation': '2D/3D Animation',
        'intake_type_art': 'Digital Art/Graphics',
        'intake_type_mixed': 'Mixed Media'
      };
      
      const selectedType = typeMap[callbackData];
      if (selectedType) {
        if (!session.data.projectTypes.includes(selectedType)) {
          session.data.projectTypes.push(selectedType);
        } else {
          // Remove if already selected (toggle)
          session.data.projectTypes = session.data.projectTypes.filter(t => t !== selectedType);
        }
      }
      return { success: true, refresh: true };

    case callbackData === 'intake_continue':
      if (session.data.projectTypes.length > 0) {
        session.step = FORM_STEPS.PROJECT_GOAL;
        return { success: true };
      }
      return { success: false, error: 'Please select at least one project type.' };

    // Timeframe selections
    case callbackData.startsWith('intake_time_'):
      const timeMap = {
        'intake_time_asap': 'ASAP',
        'intake_time_1month': 'Within 1 month',
        'intake_time_3months': '1-3 months',
        'intake_time_6months': '3-6 months',
        'intake_time_6plus': '6+ months',
        'intake_time_flexible': 'Flexible'
      };
      
      session.data.timeframe = timeMap[callbackData];
      session.step = FORM_STEPS.BUDGET;
      return { success: true };

    // Budget selections
    case callbackData.startsWith('intake_budget_'):
      const budgetMap = {
        'intake_budget_5k': 'Under $5,000',
        'intake_budget_15k': '$5,000 - $15,000',
        'intake_budget_50k': '$15,000 - $50,000',
        'intake_budget_100k': '$50,000 - $100,000',
        'intake_budget_100k_plus': 'Over $100,000'
      };
      
      session.data.budget = budgetMap[callbackData];
      session.step = FORM_STEPS.ADDITIONAL_INFO;
      return { success: true };

    case callbackData === 'intake_submit':
      return { success: true, submit: true };

    case callbackData === 'intake_cancel':
      return { success: true, cancel: true };

    default:
      return { success: false, error: 'Unknown action.' };
  }
}

// Generate auth code for new client
function generateAuthCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase() + Math.random().toString(36).substring(2, 5).toUpperCase();
}

module.exports = {
  startIntake,
  getIntakeSession,
  clearIntakeSession,
  getStepContent,
  processStepInput,
  processCallback,
  generateAuthCode,
  FORM_STEPS
};
