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

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
];

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const width = formData.get('width') as string | null;
    const height = formData.get('height') as string | null;

    if (!file) {
      return NextResponse.json(
        { message: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { message: 'File size exceeds 5MB limit' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return NextResponse.json(
        { message: 'Only JPEG, PNG, GIF, and WebP images are allowed' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    let buffer = Buffer.from(arrayBuffer);

    // Generate unique filename
    const fileId = crypto.randomUUID();
    const fileExt = file.type === 'image/jpeg' ? 'jpg' :
                    file.type === 'image/png' ? 'png' :
                    file.type === 'image/gif' ? 'gif' : 'webp';
    const fileName = `${fileId}.${fileExt}`;
    const filePath = `brand-assets/${fileName}`;

    // Upload to Supabase Storage
    const { data, error } = await supabaseAdmin.storage
      .from('campaign-attachments')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (error) {
      console.error('Supabase storage upload error:', error);

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

    // Get public URL - Supabase supports image transformations via URL params
    const { data: urlData } = supabaseAdmin.storage
      .from('campaign-attachments')
      .getPublicUrl(filePath);

    let publicUrl = urlData.publicUrl;

    // If resize dimensions provided, append transformation params
    // Supabase Storage supports image transformations: ?width=X&height=Y
    if (width || height) {
      const params = new URLSearchParams();
      if (width) params.append('width', width);
      if (height) params.append('height', height);
      publicUrl = `${publicUrl}?${params.toString()}`;
    }

    return NextResponse.json({
      id: fileId,
      name: file.name,
      size: file.size,
      type: file.type,
      url: publicUrl,
      baseUrl: urlData.publicUrl, // URL without resize params
      path: filePath,
    });
  } catch (error: any) {
    console.error('Image upload error:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to upload image' },
      { status: 500 }
    );
  }
}
