
// ==================================================
// CHEQUE HARMONY - BACKEND SCRIPT
// ==================================================
// Instructions:
// 1. Paste this code into Google Sheets > Extensions > Apps Script
// 2. Deploy > New Deployment > Web App
// 3. Set 'Who has access' to 'Anyone' (Crucial for React App access)
// 4. Copy the Web App URL and paste it into the App Settings.
// ==================================================

const SHEET_NAMES = {
  CHEQUES: 'Cheques',
  BRANCHES: 'Branches',
  BOOKS: 'Chequebooks',
  USERS: 'Users',
  LOGS: 'Logs'
};

// Handle GET requests (Reading data)
function doGet(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    const action = e.parameter.action || 'getAll';
    
    if (action === 'getAll') {
      const data = {
        cheques: getSheetData(SHEET_NAMES.CHEQUES),
        branches: getSheetData(SHEET_NAMES.BRANCHES),
        chequeBooks: getSheetData(SHEET_NAMES.BOOKS),
        users: getSheetData(SHEET_NAMES.USERS)
      };
      return jsonResponse(data);
    }
    
    return jsonResponse({error: 'Invalid action'});
    
  } catch (err) {
    return jsonResponse({error: err.toString()});
  } finally {
    lock.releaseLock();
  }
}

// Handle POST requests (Writing data)
function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(10000); // Wait up to 10s to avoid conflicts

  try {
    // Apps Script receives POST body as string
    const payload = JSON.parse(e.postData.contents);
    const action = payload.action;
    
    let result = { status: 'success' };

    if (action === 'SAVE_CHEQUE') {
      saveRow(SHEET_NAMES.CHEQUES, payload.cheque);
    } else if (action === 'SAVE_BATCH_CHEQUES') {
      // Handle bulk save
      if (payload.cheques && Array.isArray(payload.cheques)) {
         payload.cheques.forEach(c => saveRow(SHEET_NAMES.CHEQUES, c));
      }
    } else if (action === 'DELETE_CHEQUE') {
      deleteRow(SHEET_NAMES.CHEQUES, payload.id);
    } else if (action === 'SAVE_BRANCH') {
      saveRow(SHEET_NAMES.BRANCHES, payload.branch);
    } else if (action === 'DELETE_BRANCH') {
      deleteRow(SHEET_NAMES.BRANCHES, payload.id);
    } else if (action === 'SAVE_CHEQUEBOOK') {
      saveRow(SHEET_NAMES.BOOKS, payload.chequeBook);
    } else if (action === 'DELETE_CHEQUEBOOK') {
      deleteRow(SHEET_NAMES.BOOKS, payload.id);
    } else if (action === 'SAVE_USER') {
      saveRow(SHEET_NAMES.USERS, payload.user);
    } else if (action === 'DELETE_USER') {
      deleteRow(SHEET_NAMES.USERS, payload.id);
    } else {
      result = { status: 'error', message: 'Unknown action: ' + action };
    }
    
    return jsonResponse(result);

  } catch (err) {
    return jsonResponse({status: 'error', message: err.toString()});
  } finally {
    lock.releaseLock();
  }
}

// --- Helper Functions ---

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSheetData(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);
  
  // Create sheet if it doesn't exist
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    // Setup Header: ID in Col A, Full JSON in Col B (Flexible Schema)
    sheet.appendRow(['ID', 'JSON_DATA', 'LAST_UPDATED']);
    sheet.setFrozenRows(1);
    return [];
  }
  
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];
  
  // Get all data: ID (A), JSON (B)
  const range = sheet.getRange(2, 1, lastRow - 1, 2);
  const rows = range.getValues();
  
  const data = [];
  for (let i = 0; i < rows.length; i++) {
    try {
      const jsonString = rows[i][1]; // Column B
      if (jsonString && jsonString !== "") {
        data.push(JSON.parse(jsonString));
      }
    } catch (e) {
      // Skip malformed JSON rows
    }
  }
  return data;
}

function saveRow(sheetName, item) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow(['ID', 'JSON_DATA', 'LAST_UPDATED']);
    sheet.setFrozenRows(1);
  }
  
  const id = item.id;
  const json = JSON.stringify(item);
  const timestamp = new Date().toISOString();
  
  // Find if ID exists
  const lastRow = sheet.getLastRow();
  let foundIndex = -1;
  
  if (lastRow > 1) {
    const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues().flat();
    foundIndex = ids.indexOf(id);
  }
  
  if (foundIndex !== -1) {
    // Update existing row (Row index is: foundIndex + 2 because header is 1 and array is 0-indexed)
    sheet.getRange(foundIndex + 2, 2).setValue(json);
    sheet.getRange(foundIndex + 2, 3).setValue(timestamp);
  } else {
    // Insert new row
    sheet.appendRow([id, json, timestamp]);
  }
}

function deleteRow(sheetName, id) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return;
  
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return;
  
  const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues().flat();
  const foundIndex = ids.indexOf(id);
  
  if (foundIndex !== -1) {
    sheet.deleteRow(foundIndex + 2);
  }
}