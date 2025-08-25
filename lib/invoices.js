const { google } = require('googleapis');
const { getSheets } = require('./sheets');

const SHEET_ID = process.env.GSHEETS_SHEET_ID;

async function getInvoices() {
  const api = await getSheets();
  
  const response = await api.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: 'Invoices!A:Z',
  });
  
  const rows = response.data.values;
  if (!rows || rows.length === 0) return [];
  
  const headers = rows[0];
  const invoices = [];
  
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const invoice = {};
    
    headers.forEach((header, index) => {
      invoice[header] = row[index] || '';
    });
    
    invoices.push(invoice);
  }
  
  return invoices;
}

async function getClientInvoices(clientId) {
  const invoices = await getInvoices();
  return invoices.filter(invoice => invoice['Client ID'] === clientId || invoice.clientId === clientId);
}

async function getInvoicePDFUrl(invoiceId) {
  try {
    // Get authenticated client for Drive API
    const keyFilePath = process.env.GSHEETS_KEY_FILE;
    const fs = require('fs');
    const path = require('path');
    
    let auth;
    if (keyFilePath && fs.existsSync(keyFilePath)) {
      auth = new google.auth.GoogleAuth({
        keyFile: path.resolve(keyFilePath),
        scopes: ['https://www.googleapis.com/auth/drive'],
      });
    } else if (process.env.GOOGLE_PRIVATE_KEY_B64) {
      const privateKeyPem = Buffer.from(
        process.env.GOOGLE_PRIVATE_KEY_B64,
        'base64'
      ).toString('utf8');
      
      auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: process.env.GOOGLE_CLIENT_EMAIL,
          private_key: privateKeyPem,
        },
        scopes: ['https://www.googleapis.com/auth/drive'],
      });
    }
    
    const drive = google.drive({ version: 'v3', auth });
    
    // Search for invoice PDF in the invoices folder
    const folderId = '1Oa_DYQt7NZFlXdwurAT8LS0WUDkgg84g';
    
    const response = await drive.files.list({
      q: `'${folderId}' in parents and name contains 'Invoice ${invoiceId}'`,
      fields: 'files(id, name, webViewLink)',
      supportsAllDrives: true
    });
    
    if (response.data.files && response.data.files.length > 0) {
      const file = response.data.files[0];
      return {
        url: file.webViewLink,
        fileName: file.name
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error getting invoice PDF:', error);
    return null;
  }
}

module.exports = {
  getInvoices,
  getClientInvoices,
  getInvoicePDFUrl
};