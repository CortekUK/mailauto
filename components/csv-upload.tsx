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

    // Check if it's a CSV file
    if (!file.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file');
      return;
    }

    // Parse CSV
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const data = results.data as any[];

        // Validate that we have name and email columns
        if (data.length === 0) {
          toast.error('CSV file is empty');
          return;
        }

        const firstRow = data[0];
        if (!('name' in firstRow) || !('email' in firstRow)) {
          toast.error('CSV must have "name" and "email" columns');
          return;
        }

        // Filter out rows without name or email
        const validData = data.filter(row => row.name && row.email);

        if (validData.length === 0) {
          toast.error('No valid entries found in CSV');
          return;
        }

        setPreview(validData.slice(0, 5)); // Show first 5 rows as preview
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

          // Filter valid entries
          const validData = data
            .filter(row => row.name && row.email)
            .map(row => ({
              name: row.name.trim(),
              email: row.email.trim(),
            }));

          if (validData.length === 0) {
            toast.error('No valid entries to upload');
            setUploading(false);
            return;
          }

          // Upload to API
          const response = await fetch('/api/sheetdb/bulk', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ data: validData }),
          });

          const result = await response.json();

          if (response.ok && result.success) {
            toast.success(`Successfully uploaded ${validData.length} subscribers!`);
            setPreview([]);
            if (fileInputRef.current) {
              fileInputRef.current.value = '';
            }
            onUploadComplete?.();
          } else {
            toast.error(result.error || 'Failed to upload subscribers');
          }
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
    const csv = 'name,email\nJohn Doe,john@example.com\nJane Smith,jane@example.com';
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
        {/* Download Template Button */}
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

        {/* File Input */}
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
                <p className="text-sm font-medium">
                  Click to select CSV file
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  CSV must have "name" and "email" columns
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Preview */}
        {preview.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Preview (first 5 rows):</p>
            <div className="border rounded-lg p-3 bg-muted/50 max-h-40 overflow-y-auto">
              {preview.map((row, index) => (
                <div key={index} className="text-sm py-1 flex gap-3">
                  <span className="font-medium">{row.name}</span>
                  <span className="text-muted-foreground">{row.email}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upload Button */}
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
            <strong>Note:</strong> Your CSV file should have headers "name" and "email" in the first row.
            Rows without both fields will be skipped.
          </p>
        </div>
    </div>
  );
}
