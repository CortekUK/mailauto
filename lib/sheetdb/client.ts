// SheetDB configuration
const SHEETDB_API_URL = process.env.NEXT_PUBLIC_SHEETDB_API_URL || '';

if (!SHEETDB_API_URL) {
  console.warn('NEXT_PUBLIC_SHEETDB_API_URL is not set in environment variables');
}

// Type definitions for the client's sheet schema
export interface SheetDBContact {
  'First Name': string;
  'Last Name': string;
  'Email 1': string;
  'Phone 1'?: string;
  'Address 1 - Type'?: string;
  'Address 1 - Street'?: string;
  'Address 1 - City'?: string;
  'Address 1 - State/Region'?: string;
  'Address 1 - Zip'?: string;
  'Address 1 - Country'?: string;
  'Address 2 - Type'?: string;
  'Address 2 - Street'?: string;
  'Address 2 - City'?: string;
  'Address 2 - State/Region'?: string;
  'Address 2 - Country'?: string;
  'Address 3 - Street'?: string;
  'Address 3 - City'?: string;
  'Address 3 - State/Region'?: string;
  'Address 3 - Zip'?: string;
  'Address 3 - Country'?: string;
  'Company'?: string;
  'Labels'?: string;
  'Created At (UTC+0)'?: string;
  'Email subscriber status'?: string;
  'SMS subscriber status'?: string;
  'Last Activity'?: string;
  'Last Activity Date (UTC+0)'?: string;
  'Source'?: string;
  'Language'?: string;
}

// Type definitions for common operations
export interface SheetDBRow {
  [key: string]: string | number | boolean;
}

export interface SheetDBOptions {
  sheet?: string;
  limit?: number;
  offset?: number;
}

export interface SheetDBSearchOptions extends SheetDBOptions {
  casesensitive?: boolean;
}

// Helper function to normalize column names (handle spaces and special chars)
export function normalizeContactFromSheet(row: SheetDBContact): {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  company?: string;
  address1?: {
    type?: string;
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  };
  address2?: {
    type?: string;
    street?: string;
    city?: string;
    state?: string;
    country?: string;
  };
  address3?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  };
  labels?: string;
  createdAt?: string;
  emailStatus?: string;
  smsStatus?: string;
  lastActivity?: string;
  lastActivityDate?: string;
  source?: string;
  language?: string;
} {
  return {
    firstName: row['First Name'] || '',
    lastName: row['Last Name'] || '',
    email: row['Email 1'] || '',
    phone: row['Phone 1'],
    company: row['Company'],
    address1: {
      type: row['Address 1 - Type'],
      street: row['Address 1 - Street'],
      city: row['Address 1 - City'],
      state: row['Address 1 - State/Region'],
      zip: row['Address 1 - Zip'],
      country: row['Address 1 - Country'],
    },
    address2: {
      type: row['Address 2 - Type'],
      street: row['Address 2 - Street'],
      city: row['Address 2 - City'],
      state: row['Address 2 - State/Region'],
      country: row['Address 2 - Country'],
    },
    address3: {
      street: row['Address 3 - Street'],
      city: row['Address 3 - City'],
      state: row['Address 3 - State/Region'],
      zip: row['Address 3 - Zip'],
      country: row['Address 3 - Country'],
    },
    labels: row['Labels'],
    createdAt: row['Created At (UTC+0)'],
    emailStatus: row['Email subscriber status'],
    smsStatus: row['SMS subscriber status'],
    lastActivity: row['Last Activity'],
    lastActivityDate: row['Last Activity Date (UTC+0)'],
    source: row['Source'],
    language: row['Language'],
  };
}

// Utility functions for common SheetDB operations using fetch API
export const sheetDBService = {
  /**
   * Read all rows from the sheet
   */
  async read(options?: SheetDBOptions): Promise<SheetDBRow[]> {
    try {
      let url = SHEETDB_API_URL;
      const params = new URLSearchParams();

      if (options?.sheet) params.append('sheet', options.sheet);
      if (options?.limit) params.append('limit', options.limit.toString());
      if (options?.offset) params.append('offset', options.offset.toString());

      if (params.toString()) {
        url += '?' + params.toString();
      }

      const response = await fetch(url);
      const result = await response.json();

      return Array.isArray(result) ? result : [];
    } catch (error) {
      console.error('SheetDB read error:', error);
      return [];
    }
  },

  /**
   * Create new rows in the sheet
   */
  async create(data: SheetDBRow | SheetDBRow[], options?: { sheet?: string }): Promise<any> {
    try {
      console.log('SheetDB create called with:', { data, options });

      let url = SHEETDB_API_URL;
      if (options?.sheet) {
        url += `?sheet=${options.sheet}`;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data }),
      });

      const result = await response.json();
      console.log('SheetDB create result:', result);

      return result;
    } catch (error) {
      console.error('SheetDB create error details:', error);
      throw error;
    }
  },

  /**
   * Update rows in the sheet
   */
  async update(
    columnName: string,
    columnValue: string,
    data: SheetDBRow,
    options?: { sheet?: string }
  ): Promise<any> {
    try {
      let url = `${SHEETDB_API_URL}/${columnName}/${columnValue}`;
      if (options?.sheet) {
        url += `?sheet=${options.sheet}`;
      }

      const response = await fetch(url, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data }),
      });

      return await response.json();
    } catch (error) {
      console.error('SheetDB update error:', error);
      throw error;
    }
  },

  /**
   * Delete rows from the sheet
   */
  async delete(
    columnName: string,
    columnValue: string,
    options?: { sheet?: string }
  ): Promise<any> {
    try {
      let url = `${SHEETDB_API_URL}/${columnName}/${columnValue}`;
      if (options?.sheet) {
        url += `?sheet=${options.sheet}`;
      }

      const response = await fetch(url, {
        method: 'DELETE',
      });

      return await response.json();
    } catch (error) {
      console.error('SheetDB delete error:', error);
      throw error;
    }
  },

  /**
   * Search for specific rows
   */
  async search(
    columnName: string,
    columnValue: string,
    options?: SheetDBSearchOptions
  ): Promise<SheetDBRow[]> {
    try {
      let url = `${SHEETDB_API_URL}/search`;
      const params = new URLSearchParams();

      params.append(columnName, columnValue);
      if (options?.sheet) params.append('sheet', options.sheet);
      if (options?.limit) params.append('limit', options.limit.toString());
      if (options?.offset) params.append('offset', options.offset.toString());
      if (options?.casesensitive !== undefined) {
        params.append('casesensitive', options.casesensitive.toString());
      }

      url += '?' + params.toString();

      const response = await fetch(url);
      const result = await response.json();

      return Array.isArray(result) ? result : [];
    } catch (error) {
      console.error('SheetDB search error:', error);
      return [];
    }
  },
};

export default sheetDBService;
