// SheetDB configuration
const SHEETDB_API_URL = process.env.NEXT_PUBLIC_SHEETDB_API_URL || '';

if (!SHEETDB_API_URL) {
  console.warn('NEXT_PUBLIC_SHEETDB_API_URL is not set in environment variables');
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
