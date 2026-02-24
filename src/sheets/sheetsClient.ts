import { google, sheets_v4 } from 'googleapis';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';
import { SHEET_HEADERS, SHEET_NAMES } from './sheetSchema.js';

class SheetsClient {
  private sheets: sheets_v4.Sheets;

  constructor() {
    const auth = new google.auth.JWT({
      email: config.googleServiceAccountEmail,
      key: config.googlePrivateKey,
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    this.sheets = google.sheets({ version: 'v4', auth });
  }

  async ensureWorkbookStructure(): Promise<void> {
    const existing = await this.sheets.spreadsheets.get({
      spreadsheetId: config.googleSheetId
    });

    const existingNames = new Set((existing.data.sheets || []).map((s) => s.properties?.title || ''));
    const toCreate = Object.values(SHEET_NAMES).filter((name) => !existingNames.has(name));

    if (toCreate.length > 0) {
      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId: config.googleSheetId,
        requestBody: {
          requests: toCreate.map((title) => ({
            addSheet: { properties: { title } }
          }))
        }
      });
      logger.info('Created missing sheet tabs', { tabs: toCreate });
    }

    for (const [sheet, headers] of Object.entries(SHEET_HEADERS)) {
      const current = await this.readRange(`${sheet}!1:1`);
      if (current.length === 0 || current[0].length === 0) {
        await this.writeRange(`${sheet}!1:1`, [headers]);
      }
    }
  }

  async readRange(range: string): Promise<string[][]> {
    const response = await this.sheets.spreadsheets.values.get({
      spreadsheetId: config.googleSheetId,
      range
    });
    return (response.data.values || []) as string[][];
  }

  async writeRange(range: string, values: string[][]): Promise<void> {
    await this.sheets.spreadsheets.values.update({
      spreadsheetId: config.googleSheetId,
      range,
      valueInputOption: 'RAW',
      requestBody: { values }
    });
  }

  async appendRows(sheetName: string, rows: (string | number | boolean)[][]): Promise<void> {
    if (rows.length === 0) return;
    await this.sheets.spreadsheets.values.append({
      spreadsheetId: config.googleSheetId,
      range: `${sheetName}!A:Z`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: rows.map((r) => r.map((v) => String(v))) }
    });
  }
}

export const sheetsClient = new SheetsClient();
