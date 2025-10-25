/**
 * Google Apps Script for Pumpkinfest 2025 RSVP System
 * Provides bidirectional sync between web UI and Google Sheets
 * Based on the infinite-hips todo system architecture
 * 
 * SETUP INSTRUCTIONS:
 * 1. Open Google Apps Script (script.google.com)
 * 2. Create new project
 * 3. Replace Code.gs with this content
 * 4. Update SHEET_ID constant below with your Google Sheet ID
 * 5. Deploy as web app with "Anyone" access
 * 6. Copy the web app URL to your frontend (pumpkinfest-app.js)
 */

// Configuration - UPDATE THESE VALUES
const SHEET_ID = '1XEfcdwvrg54w_Aw8bEiBC4_f8pLJOT6bH55sau92mvg'; // Your Pumpkinfest 2025 sheet
const SHEET_NAME = 'Sheet1'; // Name of the sheet tab for RSVPs (default Google Sheets name)
const GID = '0'; // Sheet tab ID (0 = first sheet)
const DRIVE_FOLDER_ID = '11kjpIv6IHcRa8lFLGiwwSJy9hyh4cYWN'; // Your public Google Drive folder for photos

/**
 * Main entry point for HTTP requests
 */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    
    switch (action) {
      case 'getRSVPs':
        return createResponse(getRSVPs());
      
      case 'addRSVP':
        return createResponse(addRSVP(data.rsvp));
      
      case 'uploadPhoto':
        return createResponse(uploadPhoto(data.filename, data.fileData, data.mimeType));
      
      case 'getLastModified':
        return createResponse({ lastModified: getLastModified() });
      
      case 'getGalleryImages':
        return createResponse(getGalleryImages());
      
      default:
        throw new Error('Unknown action: ' + action);
    }
  } catch (error) {
    console.error('Error processing request:', error);
    return createResponse({ error: error.toString() }, 500);
  }
}

/**
 * Handle GET requests (for testing and simple operations)
 */
function doGet(e) {
  try {
    const action = e.parameter.action || 'test';
    const callback = e.parameter.callback; // For JSONP support
    
    console.log('doGet called with action:', action);
    console.log('Parameters:', e.parameter);
    
    let result;
    switch (action) {
      case 'getRSVPs':
        result = createResponse(getRSVPs());
        break;
      
      case 'addRSVP':
        // Handle addRSVP via GET parameters
        const newRSVP = {
          name: e.parameter.name || '',
          email: e.parameter.email || '',
          attendance: e.parameter.attendance || '',
          needPumpkin: e.parameter.needPumpkin || '',
          bringing: e.parameter.bringing || '',
          pumpkinPatch: e.parameter.pumpkinPatch || '',
          patchDates: e.parameter.patchDates || '',
          timestamp: e.parameter.timestamp || new Date().toISOString()
        };
        // Check if this is an update (when isUpdate parameter is present)
        if (e.parameter.isUpdate === 'true') {
          result = createResponse(updateRSVP(newRSVP));
        } else {
          result = createResponse(addRSVP(newRSVP));
        }
        break;
      
      case 'updateRSVP':
        // Handle updateRSVP via GET parameters
        const updateRSVPData = {
          name: e.parameter.name || '',
          email: e.parameter.email || '',
          attendance: e.parameter.attendance || '',
          needPumpkin: e.parameter.needPumpkin || '',
          bringing: e.parameter.bringing || '',
          pumpkinPatch: e.parameter.pumpkinPatch || '',
          patchDates: e.parameter.patchDates || '',
          timestamp: e.parameter.timestamp || new Date().toISOString()
        };
        result = createResponse(updateRSVP(updateRSVPData));
        break;
      
      case 'test':
        result = createResponse({ 
          message: 'Pumpkinfest RSVP Apps Script is working!', 
          timestamp: new Date().toISOString(),
          sheetId: SHEET_ID,
          sheetName: SHEET_NAME,
          parameters: e.parameter
        });
        break;
      
      case 'getGalleryImages':
        result = createResponse(getGalleryImages());
        break;
      
      default:
        result = createResponse({ 
          message: 'Default response - Apps Script is accessible',
          action: action,
          availableActions: ['getRSVPs', 'addRSVP', 'test', 'getGalleryImages'],
          parameters: e.parameter
        });
        break;
    }
    
    // Handle JSONP callback if provided
    if (callback) {
      const jsonpResponse = callback + '(' + result.getContent() + ');';
      return ContentService
        .createTextOutput(jsonpResponse)
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    
    return result;
    
  } catch (error) {
    console.error('Error processing GET request:', error);
    const errorResponse = createResponse({ error: error.toString(), stack: error.stack }, 500);
    
    // Handle JSONP callback for errors too
    if (e.parameter.callback) {
      const jsonpResponse = e.parameter.callback + '(' + errorResponse.getContent() + ');';
      return ContentService
        .createTextOutput(jsonpResponse)
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    
    return errorResponse;
  }
}

/**
 * Handle OPTIONS requests for CORS preflight
 */
function doOptions(e) {
  return ContentService
    .createTextOutput(JSON.stringify({
      success: true,
      message: 'CORS preflight supported'
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Helper function to create standardized responses
 */
function createResponse(data, status = 200) {
  const response = {
    success: status === 200,
    data: data,
    timestamp: new Date().toISOString()
  };

  if (status !== 200) {
    response.error = data.error || 'Unknown error';
  }

  return ContentService
    .createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Get sheet by GID or name
 */
function getSheetByGidOrName(spreadsheet, gid, sheetName) {
  // Always use the first sheet for simplicity
  const sheets = spreadsheet.getSheets();
  if (sheets.length === 0) {
    throw new Error('No sheets found in spreadsheet');
  }
  
  console.log(`Found ${sheets.length} sheets, using first sheet: ${sheets[0].getName()}`);
  return sheets[0];
}

/**
 * Get all RSVPs from the sheet
 */
function getRSVPs() {
  try {
    const spreadsheet = SpreadsheetApp.openById(SHEET_ID);
    if (!spreadsheet) {
      throw new Error(`Cannot open spreadsheet with ID: ${SHEET_ID}`);
    }
    
    const sheet = getSheetByGidOrName(spreadsheet, GID, SHEET_NAME);
    return getRSVPsFromSheet(sheet);
    
  } catch (error) {
    console.error('Error in getRSVPs:', error);
    throw new Error(`Failed to get RSVPs: ${error.message}`);
  }
}

/**
 * Extract RSVPs from a specific sheet
 */
function getRSVPsFromSheet(sheet) {
  const data = sheet.getDataRange().getValues();
  
  if (data.length <= 1) {
    return { rsvps: [], lastModified: new Date().toISOString() };
  }
  
  const headers = data[0].map(h => h.toString().toLowerCase().trim()); 
  const rsvps = [];
  
  // Find column indices - flexible header matching
  const nameIndex = findColumnIndex(headers, ['name', 'guest', 'person']);
  const emailIndex = findColumnIndex(headers, ['email', 'e-mail', 'mail', 'contact']);
  const attendanceIndex = findColumnIndex(headers, ['attendance', 'coming', 'status', 'rsvp']);
  const needPumpkinIndex = findColumnIndex(headers, ['need pumpkin', 'needpumpkin', 'pumpkin']);
  const bringingIndex = findColumnIndex(headers, ['bringing', 'notes', 'comment', 'details']);
  const pumpkinPatchIndex = findColumnIndex(headers, ['pumpkin patch', 'pumpkinpatch', 'patch']);
  const patchDatesIndex = findColumnIndex(headers, ['patch dates', 'patchdates', 'dates', 'available dates']);
  const timestampIndex = findColumnIndex(headers, ['timestamp', 'date', 'submitted', 'created']);
  
  // Process each row
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    
    // Skip empty rows
    if (!row[nameIndex] || row[nameIndex].toString().trim() === '') {
      continue;
    }
    
    const rsvp = {
      id: `row-${i + 1}`,
      rowIndex: i + 1,
      name: row[nameIndex]?.toString().trim() || '',
      attendance: row[attendanceIndex]?.toString().trim() || '',
      needPumpkin: row[needPumpkinIndex]?.toString().trim() || '',
      bringing: row[bringingIndex]?.toString().trim() || '',
      pumpkinPatch: row[pumpkinPatchIndex]?.toString().trim() || '',
      patchDates: row[patchDatesIndex]?.toString().trim() || '',
      timestamp: row[timestampIndex] ? new Date(row[timestampIndex]).toISOString() : new Date().toISOString()
    };
    
    rsvps.push(rsvp);
  }
  
  return {
    rsvps: rsvps,
    lastModified: getLastModified(),
    headers: headers
  };
}

/**
 * Add a new RSVP
 */
function addRSVP(rsvpData) {
  try {
    const spreadsheet = SpreadsheetApp.openById(SHEET_ID);
    if (!spreadsheet) {
      throw new Error(`Cannot open spreadsheet with ID: ${SHEET_ID}`);
    }
    
    const sheet = getSheetByGidOrName(spreadsheet, GID, SHEET_NAME);
    
    // Get or create headers
    const lastRow = sheet.getLastRow();
    let headers;
    
    if (lastRow === 0) {
      // Create headers if sheet is empty
      headers = ['Name', 'Attendance', 'Need Pumpkin', 'Bringing', 'Pumpkin Patch', 'Patch Dates', 'Timestamp'];
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    } else {
      headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    }
    
    const headerMap = headers.map(h => h.toString().toLowerCase().trim());
    
    // Find column indices
    const nameIndex = findColumnIndex(headerMap, ['name', 'guest', 'person']);
    const attendanceIndex = findColumnIndex(headerMap, ['attendance', 'coming', 'status', 'rsvp']);
    const needPumpkinIndex = findColumnIndex(headerMap, ['need pumpkin', 'needpumpkin', 'pumpkin']);
    const bringingIndex = findColumnIndex(headerMap, ['bringing', 'notes', 'comment', 'details']);
    const pumpkinPatchIndex = findColumnIndex(headerMap, ['pumpkin patch', 'pumpkinpatch', 'patch']);
    const patchDatesIndex = findColumnIndex(headerMap, ['patch dates', 'patchdates', 'dates', 'available dates']);
    const timestampIndex = findColumnIndex(headerMap, ['timestamp', 'date', 'submitted', 'created']);
    
    // Prepare new row data
    const newRow = new Array(headers.length).fill('');
    
    if (nameIndex >= 0) newRow[nameIndex] = rsvpData.name || '';
    if (attendanceIndex >= 0) newRow[attendanceIndex] = rsvpData.attendance || '';
    if (needPumpkinIndex >= 0) newRow[needPumpkinIndex] = rsvpData.needPumpkin || '';
    if (bringingIndex >= 0) newRow[bringingIndex] = rsvpData.bringing || '';
    if (pumpkinPatchIndex >= 0) newRow[pumpkinPatchIndex] = rsvpData.pumpkinPatch || '';
    if (patchDatesIndex >= 0) newRow[patchDatesIndex] = rsvpData.patchDates || '';
    if (timestampIndex >= 0) newRow[timestampIndex] = new Date(rsvpData.timestamp || new Date());
    
    // Add the new row
    const newRowIndex = sheet.getLastRow() + 1;
    sheet.getRange(newRowIndex, 1, 1, newRow.length).setValues([newRow]);
    
    return {
      success: true,
      rsvpId: `row-${newRowIndex}`,
      rowIndex: newRowIndex
    };
    
  } catch (error) {
    console.error('Error in addRSVP:', error);
    throw new Error(`Failed to add RSVP: ${error.message}`);
  }
}

/**
 * Update an existing RSVP
 */
function updateRSVP(rsvpData) {
  try {
    const spreadsheet = SpreadsheetApp.openById(SHEET_ID);
    if (!spreadsheet) {
      throw new Error(`Cannot open spreadsheet with ID: ${SHEET_ID}`);
    }
    
    const sheet = getSheetByGidOrName(spreadsheet, GID, SHEET_NAME);
    const data = sheet.getDataRange().getValues();
    
    if (data.length <= 1) {
      throw new Error('No RSVPs found to update');
    }
    
    const headers = data[0].map(h => h.toString().toLowerCase().trim());
    
    // Find column indices
    const nameIndex = findColumnIndex(headers, ['name', 'guest', 'person']);
    const attendanceIndex = findColumnIndex(headers, ['attendance', 'coming', 'status', 'rsvp']);
    const needPumpkinIndex = findColumnIndex(headers, ['need pumpkin', 'needpumpkin', 'pumpkin']);
    const bringingIndex = findColumnIndex(headers, ['bringing', 'notes', 'comment', 'details']);
    const pumpkinPatchIndex = findColumnIndex(headers, ['pumpkin patch', 'pumpkinpatch', 'patch']);
    const patchDatesIndex = findColumnIndex(headers, ['patch dates', 'patchdates', 'dates', 'available dates']);
    const timestampIndex = findColumnIndex(headers, ['timestamp', 'date', 'submitted', 'created']);
    
    // Find the row to update
    let rowToUpdate = -1;
    for (let i = 1; i < data.length; i++) {
      if (data[i][nameIndex] && data[i][nameIndex].toString().trim() === rsvpData.name) {
        rowToUpdate = i + 1; // +1 because sheet rows are 1-indexed
        break;
      }
    }
    
    if (rowToUpdate === -1) {
      throw new Error(`RSVP not found for name: ${rsvpData.name}`);
    }
    
    // Update the row
    if (attendanceIndex >= 0) sheet.getRange(rowToUpdate, attendanceIndex + 1).setValue(rsvpData.attendance || '');
    if (needPumpkinIndex >= 0) sheet.getRange(rowToUpdate, needPumpkinIndex + 1).setValue(rsvpData.needPumpkin || '');
    if (bringingIndex >= 0) sheet.getRange(rowToUpdate, bringingIndex + 1).setValue(rsvpData.bringing || '');
    if (pumpkinPatchIndex >= 0) sheet.getRange(rowToUpdate, pumpkinPatchIndex + 1).setValue(rsvpData.pumpkinPatch || '');
    if (patchDatesIndex >= 0) sheet.getRange(rowToUpdate, patchDatesIndex + 1).setValue(rsvpData.patchDates || '');
    if (timestampIndex >= 0) sheet.getRange(rowToUpdate, timestampIndex + 1).setValue(new Date(rsvpData.timestamp || new Date()));
    
    return {
      success: true,
      rsvpId: `row-${rowToUpdate}`,
      rowIndex: rowToUpdate,
      action: 'updated'
    };
    
  } catch (error) {
    console.error('Error in updateRSVP:', error);
    throw new Error(`Failed to update RSVP: ${error.message}`);
  }
}

/**
 * Get the last modified timestamp of the sheet
 */
function getLastModified() {
  try {
    const spreadsheet = SpreadsheetApp.openById(SHEET_ID);
    const file = DriveApp.getFileById(SHEET_ID);
    return file.getLastUpdated().toISOString();
  } catch (error) {
    console.error('Error getting last modified:', error);
    return new Date().toISOString();
  }
}

/**
 * Upload photo to Google Drive
 */
function uploadPhoto(filename, base64Data, mimeType = 'image/png') {
  try {
    // Get the target folder
    const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
    
    // Convert base64 to blob
    const blob = Utilities.base64Decode(base64Data);
    const fileBlob = Utilities.newBlob(blob, mimeType, filename);
    
    // Create file in Drive
    const file = folder.createFile(fileBlob);
    
    // Make file publicly viewable
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    // Get the public URL
    const driveUrl = `https://drive.google.com/file/d/${file.getId()}/view?usp=sharing`;
    const directUrl = `https://drive.google.com/uc?id=${file.getId()}`;
    
    console.log(`Photo uploaded successfully: ${filename}`);
    console.log(`Drive URL: ${driveUrl}`);
    console.log(`Direct URL: ${directUrl}`);
    
    return {
      success: true,
      fileId: file.getId(),
      driveUrl: driveUrl,
      directUrl: directUrl,
      filename: filename
    };
    
  } catch (error) {
    console.error('Error uploading photo:', error);
    throw new Error(`Failed to upload photo: ${error.message}`);
  }
}

/**
 * Get gallery images from Google Drive folder
 */
function getGalleryImages() {
  try {
    const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
    const files = folder.getFiles();
    const images = [];
    
    while (files.hasNext()) {
      const file = files.next();
      const mimeType = file.getBlob().getContentType();
      
      // Only include image files
      if (mimeType && mimeType.startsWith('image/')) {
        const fileId = file.getId();
        images.push({
          id: fileId,
          name: file.getName(),
          driveUrl: `https://drive.google.com/file/d/${fileId}/view?usp=sharing`,
          directUrl: `https://drive.google.com/uc?id=${fileId}`,
          thumbnailUrl: `https://drive.google.com/thumbnail?id=${fileId}&sz=w400`,
          mimeType: mimeType,
          size: file.getSize(),
          lastModified: file.getLastUpdated().toISOString()
        });
      }
    }
    
    // Sort by last modified date (newest first)
    images.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));
    
    console.log(`Found ${images.length} images in gallery folder`);
    
    return {
      images: images,
      folderUrl: `https://drive.google.com/drive/folders/${DRIVE_FOLDER_ID}`,
      count: images.length
    };
    
  } catch (error) {
    console.error('Error getting gallery images:', error);
    throw new Error(`Failed to get gallery images: ${error.message}`);
  }
}

/**
 * Helper function to find column index by multiple possible names
 */
function findColumnIndex(headers, possibleNames) {
  for (let name of possibleNames) {
    const index = headers.indexOf(name.toLowerCase());
    if (index !== -1) {
      return index;
    }
  }
  return -1;
}

/**
 * Test function - call this to verify setup
 */
function testScript() {
  console.log('Testing Pumpkinfest RSVP Apps Script...');
  
  try {
    // Test spreadsheet access
    console.log('Testing spreadsheet access...');
    const spreadsheet = SpreadsheetApp.openById(SHEET_ID);
    console.log('Spreadsheet opened successfully');
    
    // Test sheet access
    const sheets = spreadsheet.getSheets();
    console.log(`Found ${sheets.length} sheets:`);
    sheets.forEach((sheet, index) => {
      console.log(`  ${index + 1}. ${sheet.getName()} (GID: ${sheet.getSheetId()})`);
    });
    
    const sheet = getSheetByGidOrName(spreadsheet, GID, SHEET_NAME);
    console.log(`Using sheet: ${sheet.getName()} (GID: ${sheet.getSheetId()})`);
    
    // Test data access
    const dataRange = sheet.getDataRange();
    console.log(`Data range: ${dataRange.getA1Notation()}`);
    
    const rsvps = getRSVPs();
    console.log('Successfully retrieved RSVPs:', rsvps.rsvps.length);
    
    const lastModified = getLastModified();
    console.log('Last modified:', lastModified);
    
    return { 
      success: true, 
      sheetId: SHEET_ID,
      gid: GID,
      sheetName: SHEET_NAME,
      actualSheetName: sheet.getName(),
      actualGid: sheet.getSheetId().toString(),
      sheetsFound: sheets.map(s => `${s.getName()} (GID: ${s.getSheetId()})`),
      rsvpCount: rsvps.rsvps.length, 
      lastModified: lastModified 
    };
  } catch (error) {
    console.error('Test failed:', error);
    return { 
      success: false, 
      error: error.toString(),
      sheetId: SHEET_ID,
      sheetName: SHEET_NAME
    };
  }
}