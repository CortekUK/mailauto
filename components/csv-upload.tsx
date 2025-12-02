'use client';

import { useState, useRef } from 'react';
import Papa from 'papaparse';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Upload, FileText, Loader2, Download } from 'lucide-react';

interface CSVUploadProps {
  onUploadComplete?: () => void;
}

export function CSVUpload({ onUploadComplete }: CSVUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file');
      return;
    }

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const data = results.data as any[];

        if (data.length === 0) {
          toast.error('CSV file is empty');
          return;
        }

        const firstRow = data[0];
        const hasOldFormat = ('name' in firstRow) && ('email' in firstRow);
        const hasNewFormat = ('First Name' in firstRow) && ('Email 1' in firstRow);

        if (!hasOldFormat && !hasNewFormat) {
          toast.error('CSV must have either "First Name" + "Email 1" columns OR "name" + "email" columns');
          return;
        }

        const validData = data.filter(row => {
          if (hasNewFormat) {
            return row['Email 1'];
          }
          return row.email;
        }).map(row => {
          if (hasNewFormat) {
            return {
              firstName: row['First Name'] || '',
              lastName: row['Last Name'] || '',
              email: row['Email 1'],
              phone: row['Phone 1'] || '',
              company: row['Company'] || '',
              city: row['Address 1 - City'] || '',
              state: row['Address 1 - State/Region'] || '',
              country: row['Address 1 - Country'] || '',
            };
          }
          const nameParts = (row.name || '').split(' ');
          return {
            firstName: nameParts[0] || '',
            lastName: nameParts.slice(1).join(' ') || '',
            email: row.email,
            phone: row.phone || '',
            company: row.company || '',
          };
        });

        if (validData.length === 0) {
          toast.error('No valid entries found in CSV');
          return;
        }

        setPreview(validData.slice(0, 5));
        toast.success(`Found ${validData.length} valid entries`);
      },
      error: (error) => {
        console.error('CSV parse error:', error);
        toast.error('Failed to parse CSV file');
      },
    });
  };

  const handleUpload = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      toast.error('Please select a file first');
      return;
    }

    setUploading(true);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const data = results.data as any[];
          const firstRow = data[0];
          const hasNewFormat = ('First Name' in firstRow) && ('Email 1' in firstRow);

          const validData = data
            .filter(row => {
              if (hasNewFormat) {
                return row['Email 1'];
              }
              return row.email;
            })
            .map(row => {
              if (hasNewFormat) {
                return {
                  firstName: row['First Name']?.trim() || '',
                  lastName: row['Last Name']?.trim() || '',
                  email: row['Email 1']?.trim() || '',
                  phone: row['Phone 1']?.trim() || '',
                  company: row['Company']?.trim() || '',
                  city: row['Address 1 - City']?.trim() || '',
                  state: row['Address 1 - State/Region']?.trim() || '',
                  country: row['Address 1 - Country']?.trim() || '',
                };
              }
              const nameParts = (row.name || '').trim().split(' ');
              return {
                firstName: nameParts[0] || '',
                lastName: nameParts.slice(1).join(' ') || '',
                email: row.email.trim(),
                phone: row.phone?.trim() || '',
                company: row.company?.trim() || '',
              };
            });

          if (validData.length === 0) {
            toast.error('No valid entries to upload');
            setUploading(false);
            return;
          }

          // Upload to contacts API (one by one to handle duplicates properly)
          let successCount = 0;
          let duplicateCount = 0;
          let errorCount = 0;

          for (const contact of validData) {
            try {
              const response = await fetch('/api/contacts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(contact),
              });

              const result = await response.json();

              if (response.ok && result.success) {
                successCount++;
              } else if (result.duplicate) {
                duplicateCount++;
              } else {
                errorCount++;
              }
            } catch {
              errorCount++;
            }
          }

          if (successCount > 0) {
            toast.success(`Uploaded ${successCount} subscribers!`);
          }
          if (duplicateCount > 0) {
            toast.info(`${duplicateCount} duplicates skipped`);
          }
          if (errorCount > 0) {
            toast.error(`${errorCount} failed to upload`);
          }

          setPreview([]);
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
          onUploadComplete?.();
        } catch (error) {
          console.error('Upload error:', error);
          toast.error('An error occurred during upload');
        } finally {
          setUploading(false);
        }
      },
      error: (error) => {
        console.error('CSV parse error:', error);
        toast.error('Failed to parse CSV file');
        setUploading(false);
      },
    });
  };

  const downloadTemplate = () => {
    const csv = 'First Name,Last Name,Email 1,Phone 1,Company,Address 1 - City,Address 1 - State/Region,Address 1 - Country\nJohn,Doe,john@example.com,+1234567890,Acme Inc,New York,NY,USA\nJane,Smith,jane@example.com,+0987654321,Tech Corp,Los Angeles,CA,USA';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'subscribers-template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={downloadTemplate}
          className="w-full"
        >
          <Download className="h-4 w-4 mr-2" />
          Download CSV Template
        </Button>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
            className="hidden"
            id="csv-upload"
          />
          <label htmlFor="csv-upload" className="flex-1">
            <div className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary transition-colors">
              <FileText className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm font-medium">Click to select CSV file</p>
              <p className="text-xs text-muted-foreground mt-1">
                CSV must have "name" and "email" columns
              </p>
            </div>
          </label>
        </div>
      </div>

      {preview.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Preview (first 5 rows):</p>
          <div className="border rounded-lg p-3 bg-muted/50 max-h-40 overflow-y-auto">
            {preview.map((row, index) => (
              <div key={index} className="text-sm py-1 flex gap-3">
                <span className="font-medium">{row.firstName} {row.lastName}</span>
                <span className="text-muted-foreground">{row.email}</span>
                {row.company && <span className="text-xs text-muted-foreground">({row.company})</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      <Button
        onClick={handleUpload}
        disabled={uploading || preview.length === 0}
        className="w-full"
      >
        {uploading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Uploading...
          </>
        ) : (
          <>
            <Upload className="mr-2 h-4 w-4" />
            Upload Subscribers
          </>
        )}
      </Button>

      <div className="rounded-lg border bg-muted/50 p-3">
        <p className="text-xs text-muted-foreground leading-relaxed">
          <strong>Note:</strong> Your CSV file should have headers "First Name", "Last Name", and "Email 1" in the first row.
          Optional columns: "Phone 1", "Company", "Address 1 - City", "Address 1 - State/Region", "Address 1 - Country".
          Rows without Email will be skipped. Duplicate emails will be automatically skipped.
        </p>
      </div>
    </div>
  );
}
