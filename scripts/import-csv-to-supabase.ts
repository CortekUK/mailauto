import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Supabase config
const supabaseUrl = 'https://zxrrtakhaifsqhqxmnpw.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4cnJ0YWtoYWlmc3FocXhtbnB3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzQxODIxNiwiZXhwIjoyMDc4OTk0MjE2fQ.hZHqsI0SxwzwOkHgLxqp7UXcU5yER74wPN5_GZlK4No';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

function parseCSV(content: string): Record<string, string>[] {
  const lines = content.split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  const records: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    // Handle CSV with potential commas in values (basic parsing)
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());

    const record: Record<string, string> = {};
    headers.forEach((header, index) => {
      record[header] = values[index] || '';
    });
    records.push(record);
  }

  return records;
}

async function importContacts() {
  console.log('📖 Reading CSV file...');
  const csvPath = path.join(__dirname, '..', 'Olive Octopus book release - Sheet1.csv');
  const content = fs.readFileSync(csvPath, 'utf-8');

  const records = parseCSV(content);
  console.log(`📊 Found ${records.length} records in CSV`);

  // Get existing emails to avoid duplicates
  console.log('🔍 Checking existing contacts in Supabase...');
  const { data: existingContacts } = await supabase
    .from('contacts')
    .select('email');

  const existingEmails = new Set(
    (existingContacts || []).map(c => c.email?.toLowerCase().trim())
  );
  console.log(`📋 Found ${existingEmails.size} existing contacts in Supabase`);

  // Filter out duplicates and empty emails
  const newRecords = records.filter(record => {
    const email = record['Email 1']?.toLowerCase().trim();
    return email && !existingEmails.has(email);
  });

  console.log(`✨ ${newRecords.length} new records to import (after deduplication)`);

  if (newRecords.length === 0) {
    console.log('✅ No new records to import');
    return;
  }

  // Transform to Supabase format
  const contacts = newRecords.map(record => {
    const firstName = record['First Name']?.trim() || '';
    const lastName = record['Last Name']?.trim() || '';
    const email = record['Email 1']?.toLowerCase().trim();

    return {
      email,
      name: `${firstName} ${lastName}`.trim() || null,
      first_name: firstName || null,
      last_name: lastName || null,
      phone: record['Phone 1']?.trim() || null,
      company: record['Company']?.trim() || null,
      city: record['Address 1 - City']?.trim() || null,
      state: record['Address 1 - State/Region']?.trim() || null,
      country: record['Address 1 - Country']?.trim() || null,
      labels: record['Labels']?.trim() || null,
      status: 'active',
      source: record['Source']?.trim() || 'csv-import',
      tags: [],
    };
  });

  // Insert in batches of 100
  const batchSize = 100;
  let inserted = 0;
  let errors = 0;

  for (let i = 0; i < contacts.length; i += batchSize) {
    const batch = contacts.slice(i, i + batchSize);
    console.log(`📤 Inserting batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(contacts.length / batchSize)}...`);

    const { error } = await supabase.from('contacts').insert(batch);

    if (error) {
      console.error(`❌ Error inserting batch:`, error.message);
      errors += batch.length;
    } else {
      inserted += batch.length;
    }
  }

  console.log(`\n✅ Import complete!`);
  console.log(`   - Inserted: ${inserted}`);
  console.log(`   - Errors: ${errors}`);
  console.log(`   - Skipped (duplicates): ${records.length - newRecords.length}`);

  // Update audience count
  const { count } = await supabase
    .from('contacts')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active');

  console.log(`\n📊 Total contacts in Supabase: ${count}`);
}

importContacts().catch(console.error);
