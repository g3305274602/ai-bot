import { createTables } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    await createTables();
    return NextResponse.json({ message: 'Database initialized successfully' });
  } catch (error) {
    console.error('Error initializing database:', error);
    return NextResponse.json({ error: 'Failed to initialize database' }, { status: 500 });
  }
} 