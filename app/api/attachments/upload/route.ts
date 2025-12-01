import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  // Images
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  'application/zip',
];

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { message: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { message: 'File size exceeds 10MB limit' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { message: 'File type not allowed' },
        { status: 400 }
      );
    }

    // Generate unique filename
    const fileId = crypto.randomUUID();
    const fileExt = file.name.split('.').pop() || 'bin';
    const fileName = `${fileId}.${fileExt}`;
    const filePath = `attachments/${fileName}`;

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Supabase Storage
    const { data, error } = await supabaseAdmin.storage
      .from('campaign-attachments')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (error) {
      console.error('Supabase storage upload error:', error);

      // Check if bucket doesn't exist
      if (error.message?.includes('not found') || error.message?.includes('Bucket')) {
        return NextResponse.json(
          { message: 'Storage bucket not configured. Please create a "campaign-attachments" bucket in Supabase Storage.' },
          { status: 500 }
        );
      }

      return NextResponse.json(
        { message: error.message || 'Failed to upload file' },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from('campaign-attachments')
      .getPublicUrl(filePath);

    return NextResponse.json({
      id: fileId,
      name: file.name,
      size: file.size,
      type: file.type,
      url: urlData.publicUrl,
      path: filePath,
    });
  } catch (error: any) {
    console.error('Attachment upload error:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to upload attachment' },
      { status: 500 }
    );
  }
}
