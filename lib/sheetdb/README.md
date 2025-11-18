# SheetDB Integration

This project integrates SheetDB to use Google Sheets as a database.

## Setup

1. **Get your SheetDB API URL**
   - Go to [SheetDB.io](https://sheetdb.io/)
   - Create a new API from your Google Sheet
   - Copy your API URL (e.g., `https://sheetdb.io/api/v1/your_api_id`)

2. **Add environment variable**
   Create or update your `.env.local` file:
   ```env
   NEXT_PUBLIC_SHEETDB_API_URL=https://sheetdb.io/api/v1/your_api_id
   ```

## Usage

### Using the API Routes

#### Read all data
```typescript
const response = await fetch('/api/sheetdb');
const { data } = await response.json();
```

#### Read with options
```typescript
// With limit and offset
const response = await fetch('/api/sheetdb?limit=10&offset=0');

// Search for specific data
const response = await fetch('/api/sheetdb?searchColumn=email&searchValue=user@example.com');

// Specify a sheet name (if you have multiple sheets)
const response = await fetch('/api/sheetdb?sheet=Sheet2');
```

#### Create new rows
```typescript
const response = await fetch('/api/sheetdb', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    data: {
      name: 'John Doe',
      email: 'john@example.com',
      status: 'active'
    }
  })
});
```

#### Create multiple rows
```typescript
const response = await fetch('/api/sheetdb', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    data: [
      { name: 'John Doe', email: 'john@example.com' },
      { name: 'Jane Smith', email: 'jane@example.com' }
    ]
  })
});
```

#### Update rows
```typescript
const response = await fetch('/api/sheetdb', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    columnName: 'email',
    columnValue: 'john@example.com',
    data: {
      status: 'inactive',
      updated_at: new Date().toISOString()
    }
  })
});
```

#### Delete rows
```typescript
const response = await fetch('/api/sheetdb', {
  method: 'DELETE',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    columnName: 'email',
    columnValue: 'john@example.com'
  })
});
```

### Using the SheetDB Client Directly (Server-Side Only)

You can also use the SheetDB client directly in server components or API routes:

```typescript
import { sheetDBService } from '@/lib/sheetdb/client';

// Read data
const data = await sheetDBService.read({ limit: 10 });

// Create data
await sheetDBService.create({
  name: 'John Doe',
  email: 'john@example.com'
});

// Update data
await sheetDBService.update('email', 'john@example.com', {
  status: 'active'
});

// Delete data
await sheetDBService.delete('email', 'john@example.com');

// Search data
const results = await sheetDBService.search('status', 'active', {
  limit: 5,
  casesensitive: false
});
```

## Example Component

Here's an example React component that uses SheetDB:

```typescript
'use client';

import { useState, useEffect } from 'react';

interface Contact {
  id: string;
  name: string;
  email: string;
  status: string;
}

export function ContactsList() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    try {
      const response = await fetch('/api/sheetdb');
      const { data } = await response.json();
      setContacts(data);
    } catch (error) {
      console.error('Failed to fetch contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  const addContact = async (contact: Omit<Contact, 'id'>) => {
    try {
      const response = await fetch('/api/sheetdb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: contact })
      });

      if (response.ok) {
        fetchContacts(); // Refresh the list
      }
    } catch (error) {
      console.error('Failed to add contact:', error);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h2>Contacts</h2>
      <ul>
        {contacts.map((contact, index) => (
          <li key={index}>
            {contact.name} - {contact.email}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

## Google Sheet Structure

Make sure your Google Sheet has column headers in the first row. For example:

| id | name | email | status |
|----|------|-------|--------|
| 1  | John Doe | john@example.com | active |
| 2  | Jane Smith | jane@example.com | inactive |

The column headers will become the keys in your data objects.

## Notes

- SheetDB operations are performed on the server side to keep your API URL secure
- The API URL is stored in environment variables
- All operations support multiple sheets if your spreadsheet has multiple tabs
- Make sure your Google Sheet is accessible to SheetDB (permissions are set when creating the API)
