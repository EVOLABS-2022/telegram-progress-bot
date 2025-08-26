// lib/driveFiles.js - Google Drive file management for client folders

const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');

const SHARED_DRIVE_ID = '0AA5LsvjQ_vMjUk9PVA';

async function getDriveAuth() {
  const keyFilePath = process.env.GSHEETS_KEY_FILE;
  
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
  
  return auth;
}

// Find client folder by code (handles 3-4 character codes with potential trailing spaces)
async function findClientFolder(clientCode) {
  const auth = await getDriveAuth();
  const drive = google.drive({ version: 'v3', auth });
  
  try {
    // Search for "Client Files" folder first
    const clientFilesSearch = await drive.files.list({
      q: `name='Client Files' and mimeType='application/vnd.google-apps.folder' and parents in '${SHARED_DRIVE_ID}'`,
      includeItemsFromAllDrives: true,
      supportsAllDrives: true,
      fields: 'files(id, name)'
    });
    
    if (!clientFilesSearch.data.files.length) {
      throw new Error('Client Files folder not found');
    }
    
    const clientFilesFolderId = clientFilesSearch.data.files[0].id;
    
    // Search for client folder by code (exact match or with trailing space)
    const possibleNames = [
      clientCode.trim(),
      clientCode.padEnd(4, ' ').substring(0, 4)
    ];
    
    for (const name of possibleNames) {
      const folderSearch = await drive.files.list({
        q: `name='${name}' and mimeType='application/vnd.google-apps.folder' and parents='${clientFilesFolderId}'`,
        includeItemsFromAllDrives: true,
        supportsAllDrives: true,
        fields: 'files(id, name)'
      });
      
      if (folderSearch.data.files.length > 0) {
        return folderSearch.data.files[0].id;
      }
    }
    
    return null; // Client folder not found
    
  } catch (error) {
    console.error('Error finding client folder:', error);
    return null;
  }
}

// Get all files in client's folder
async function getClientFiles(clientCode) {
  const clientFolderId = await findClientFolder(clientCode);
  
  if (!clientFolderId) {
    return [];
  }
  
  const auth = await getDriveAuth();
  const drive = google.drive({ version: 'v3', auth });
  
  try {
    const filesResponse = await drive.files.list({
      q: `parents='${clientFolderId}' and trashed=false`,
      includeItemsFromAllDrives: true,
      supportsAllDrives: true,
      fields: 'files(id, name, mimeType, size, modifiedTime)',
      orderBy: 'name'
    });
    
    return filesResponse.data.files.map(file => ({
      id: file.id,
      name: file.name,
      mimeType: file.mimeType,
      size: file.size,
      modifiedTime: file.modifiedTime,
      isFolder: file.mimeType === 'application/vnd.google-apps.folder'
    }));
    
  } catch (error) {
    console.error('Error getting client files:', error);
    return [];
  }
}

// Get invoices specifically (files that contain "Invoice")
async function getClientInvoices(clientCode) {
  const files = await getClientFiles(clientCode);
  return files.filter(file => 
    file.name.toLowerCase().includes('invoice') && !file.isFolder
  );
}

// Get file download URL or send file directly
async function downloadFile(fileId) {
  const auth = await getDriveAuth();
  const drive = google.drive({ version: 'v3', auth });
  
  try {
    // Get file metadata
    const fileMetadata = await drive.files.get({
      fileId: fileId,
      supportsAllDrives: true,
      fields: 'name, mimeType'
    });
    
    // Get file content
    const fileResponse = await drive.files.get({
      fileId: fileId,
      alt: 'media',
      supportsAllDrives: true
    });
    
    return {
      name: fileMetadata.data.name,
      mimeType: fileMetadata.data.mimeType,
      data: fileResponse.data
    };
    
  } catch (error) {
    console.error('Error downloading file:', error);
    return null;
  }
}

// Get shareable link for file
async function getFileShareableLink(fileId) {
  const auth = await getDriveAuth();
  const drive = google.drive({ version: 'v3', auth });
  
  try {
    // Make file viewable by anyone with link
    await drive.permissions.create({
      fileId: fileId,
      supportsAllDrives: true,
      resource: {
        role: 'reader',
        type: 'anyone'
      }
    });
    
    // Get the shareable link
    const file = await drive.files.get({
      fileId: fileId,
      fields: 'webViewLink',
      supportsAllDrives: true
    });
    
    return file.data.webViewLink;
    
  } catch (error) {
    console.error('Error creating shareable link:', error);
    return null;
  }
}

// Categorize files by type for better display
function categorizeFiles(files) {
  const categories = {
    invoices: [],
    contracts: [],
    images: [],
    documents: [],
    other: []
  };
  
  files.forEach(file => {
    const name = file.name.toLowerCase();
    const mimeType = file.mimeType;
    
    if (name.includes('invoice')) {
      categories.invoices.push(file);
    } else if (name.includes('contract') || name.includes('agreement')) {
      categories.contracts.push(file);
    } else if (mimeType.startsWith('image/')) {
      categories.images.push(file);
    } else if (mimeType.includes('document') || mimeType.includes('pdf') || mimeType.includes('text')) {
      categories.documents.push(file);
    } else {
      categories.other.push(file);
    }
  });
  
  return categories;
}

module.exports = {
  getClientFiles,
  getClientInvoices,
  downloadFile,
  getFileShareableLink,
  categorizeFiles
};
