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
const SHEET_NAME = 'RSVPs'; // Name of the sheet tab for RSVPs
const GID = '0'; // Sheet tab ID (0 = first sheet)

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
      
      case 'getLastModified':
        return createResponse({ lastModified: getLastModified() });
      
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
  const action = e.parameter.action || 'getRSVPs';
  
  try {
    switch (action) {
      case 'getRSVPs':
        return createResponse(getRSVPs());
      
      case 'addRSVP':
        // Handle addRSVP via GET parameters
        const newRSVP = {
          name: e.parameter.name || '',
          attendance: e.parameter.attendance || '',
          needPumpkin: e.parameter.needPumpkin || '',
          bringing: e.parameter.bringing || '',
          pumpkinPatch: e.parameter.pumpkinPatch || '',
          patchDates: e.parameter.patchDates || '',
          timestamp: e.parameter.timestamp || new Date().toISOString()
        };
        return createResponse(addRSVP(newRSVP));
      
      case 'test':
        return createResponse({ 
          message: 'Pumpkinfest RSVP Apps Script is working!', 
          timestamp: new Date().toISOString(),
          sheetId: SHEET_ID,
          sheetName: SHEET_NAME
        });
      
      default:
        return createResponse(getRSVPs());
    }
  } catch (error) {
    console.error('Error processing GET request:', error);
    return createResponse({ error: error.toString() }, 500);
  }
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
    .setMimeType(ContentService.MimeType.JSON)
    .setHeaders({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
}

/**
 * Get sheet by GID or name
 */
function getSheetByGidOrName(spreadsheet, gid, sheetName) {
  // Try to get sheet by GID first
  if (gid && gid !== '0') {
    try {
      const sheets = spreadsheet.getSheets();
      for (let sheet of sheets) {
        if (sheet.getSheetId().toString() === gid.toString()) {
          return sheet;
        }
      }
    } catch (error) {
      console.warn('Could not find sheet by GID:', gid);
    }
  }
  
  // Fall back to sheet name
  if (sheetName) {
    try {
      return spreadsheet.getSheetByName(sheetName);
    } catch (error) {
      console.warn('Could not find sheet by name:', sheetName);
    }
  }
  
  // Default to first sheet
  return spreadsheet.getSheets()[0];
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