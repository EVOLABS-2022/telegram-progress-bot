const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

let sheets;
async function getSheets() {
  if (sheets) return sheets;
  
  const keyFilePath = process.env.GSHEETS_KEY_FILE;
  
  let auth;
  if (keyFilePath && fs.existsSync(keyFilePath)) {
    auth = new google.auth.GoogleAuth({
      keyFile: path.resolve(keyFilePath),
      scopes: ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive'],
    });
  } else if (process.env.GOOGLE_PRIVATE_KEY_B64) {
    const privateKeyPem = Buffer.from(
      process.env.GOOGLE_PRIVATE_KEY_B64,
      'base64'
    ).toString('utf8');
    
    if (!privateKeyPem.includes('BEGIN PRIVATE KEY')) {
      throw new Error('Decoded GOOGLE_PRIVATE_KEY_B64 is not a PEM');
    }
    
    auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: privateKeyPem,
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive'],
    });
  }
  
  sheets = google.sheets({ version: 'v4', auth });
  return sheets;
}

const SHEET_ID = process.env.GSHEETS_SHEET_ID;

async function getClients() {
  const api = await getSheets();
  
  const response = await api.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: 'Clients!A:Z',
  });
  
  const rows = response.data.values;
  if (!rows || rows.length === 0) return [];
  
  const headers = rows[0];
  const clients = [];
  
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const client = {};
    
    headers.forEach((header, index) => {
      client[header] = row[index] || '';
    });
    
    clients.push(client);
  }
  
  return clients;
}

async function getJobs() {
  const api = await getSheets();
  
  const response = await api.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: 'Jobs!A:Z',
  });
  
  const rows = response.data.values;
  if (!rows || rows.length === 0) return [];
  
  const headers = rows[0];
  const jobs = [];
  
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const job = {};
    
    headers.forEach((header, index) => {
      job[header] = row[index] || '';
    });
    
    jobs.push(job);
  }
  
  return jobs;
}

async function getClientJobs(clientId) {
  const jobs = await getJobs();
  return jobs.filter(job => job['Client ID'] === clientId || job.clientId === clientId);
}

async function findClientByContact(authCode) {
  const clients = await getClients();
  
  // Find client by their unique auth code
  return clients.find(client => 
    client['Auth Code'] && client['Auth Code'] === authCode
  );
}

async function addNewClient(clientData) {
  const api = await getSheets();
  
  try {
    // First, get current clients to determine next ID
    const clients = await getClients();
    const maxId = Math.max(...clients.map(c => parseInt(c.ID || c.id) || 0), 0);
    const nextId = maxId + 1;
    
    // Generate unique client code (3 letters + 3 numbers)
    const letters = Math.random().toString(36).substring(2, 5).toUpperCase();
    const numbers = Math.random().toString(36).substring(2, 5).toUpperCase();
    const clientCode = letters + numbers;
    
    // Create timestamp
    const now = new Date().toISOString();
    
    // Prepare row data in the order of sheet columns
    const rowData = [
      nextId, // ID
      clientCode, // Code
      clientData.name, // Name
      clientData.email || '', // Contact (using email as primary contact)
      clientData.email, // Email
      clientData.phone || '', // Phone
      `Project: ${clientData.projectTypes.join(', ')} | Goal: ${clientData.projectGoal} | Budget: ${clientData.budget} | Timeframe: ${clientData.timeframe}${clientData.additionalInfo ? ` | Notes: ${clientData.additionalInfo}` : ''}`, // Notes
      '', // Channel ID (empty for Telegram clients)
      now, // Created At
      'false', // Archived
      clientData.authCode // Auth Code
    ];
    
    // Append to sheet
    await api.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: 'Clients!A:K', // Adjust range based on your columns
      valueInputOption: 'RAW',
      requestBody: {
        values: [rowData]
      }
    });
    
    return {
      success: true,
      clientId: nextId,
      clientCode: clientCode,
      authCode: clientData.authCode
    };
    
  } catch (error) {
    console.error('Error adding new client to sheets:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  getSheets,
  getClients,
  getJobs,
  getClientJobs,
  findClientByContact,
  addNewClient
};
