const { findClientByContact } = require('./sheets');

const authenticatedUsers = new Map();

async function authenticateUser(telegramId, contact) {
  try {
    const client = await findClientByContact(contact);
    
    if (!client) {
      return {
        success: false,
        message: "Authentication failed. Please use your unique auth code.\n\n🔑 You should have received your auth code from us.\n\nExample: `/auth ABC123XYZ`"
      };
    }
    
    authenticatedUsers.set(telegramId, {
      clientId: client.ID || client.id,
      clientCode: client.Code || client.code,
      clientName: client.Name || client.name,
      authenticatedAt: new Date()
    });
    
    return {
      success: true,
      message: `Welcome ${client.Name || client.name}! You've been authenticated successfully.`,
      client
    };
  } catch (error) {
    console.error('Authentication error:', error);
    return {
      success: false,
      message: "Authentication failed. Please try again later."
    };
  }
}

function isAuthenticated(telegramId) {
  return authenticatedUsers.has(telegramId);
}

function getAuthenticatedClient(telegramId) {
  return authenticatedUsers.get(telegramId);
}

function logout(telegramId) {
  authenticatedUsers.delete(telegramId);
}

function requireAuth(callback) {
  return async (msg) => {
    const telegramId = msg.from.id;
    
    if (!isAuthenticated(telegramId)) {
      return {
        requiresAuth: true,
        message: "🔐 You need to authenticate first. Send /auth followed by your unique auth code.\n\n🔑 You should have received your auth code from us.\n\nExample: `/auth ABC123XYZ`"
      };
    }
    
    return callback(msg);
  };
}

module.exports = {
  authenticateUser,
  isAuthenticated,
  getAuthenticatedClient,
  logout,
  requireAuth
};