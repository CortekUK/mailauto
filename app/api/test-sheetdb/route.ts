import { NextResponse } from 'next/server';

export async function GET() {
  const apiUrl = process.env.NEXT_PUBLIC_SHEETDB_API_URL;

  console.log('Testing SheetDB connection...');
  console.log('API URL:', apiUrl);

  if (!apiUrl) {
    return NextResponse.json({
      success: false,
      error: 'NEXT_PUBLIC_SHEETDB_API_URL not found',
      env: process.env.NEXT_PUBLIC_SHEETDB_API_URL
    });
  }

  try {
    // Test 1: Try to read data
    console.log('Test 1: Reading data from SheetDB...');
    const readResponse = await fetch(apiUrl);
    const readData = await readResponse.json();
    console.log('Read response:', readData);

    // Test 2: Try to create data
    console.log('Test 2: Creating test data...');
    const testData = {
      name: 'Test User',
      email: 'test@example.com'
    };

    const createResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ data: testData }),
    });

    const createData = await createResponse.json();
    console.log('Create response:', createData);

    return NextResponse.json({
      success: true,
      apiUrl,
      readTest: {
        status: readResponse.status,
        data: readData
      },
      createTest: {
        status: createResponse.status,
        data: createData
      }
    });
  } catch (error: any) {
    console.error('Test error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
}
