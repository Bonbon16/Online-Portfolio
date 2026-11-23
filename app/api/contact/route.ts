import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
const schema = z.object({ name: z.string().trim().min(1).max(100), email: z.string().trim().email().max(254), message: z.string().trim().min(1).max(5000), website: z.string().max(200).optional() });
const attempts = new Map<string, { count: number; until: number }>();
export async function POST(request: NextRequest) {
  if (Number(request.headers.get('content-length') || 0) > 12000) return NextResponse.json({ error: 'Message is too large.' }, { status: 413 });
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const now = Date.now();
  for (const [key, value] of attempts) if (value.until < now) attempts.delete(key);
  const entry = attempts.get(ip) || { count: 0, until: now + 600000 };
  if (entry.count >= 5) return NextResponse.json({ error: 'Too many attempts. Please try again later.' }, { status: 429 });
  entry.count++; attempts.set(ip, entry);
  let body: unknown; try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid request.' }, { status: 400 }); }
  const result = schema.safeParse(body);
  if (!result.success) return NextResponse.json({ error: 'Please check your name, email, and message.' }, { status: 400 });
  if (result.data.website) return NextResponse.json({ ok: true });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.json({ error: 'The contact form is not configured yet. Please email me instead.' }, { status: 503 });
  const { name, email, message } = result.data;
  const { error } = await createClient(url, key).from('messages').insert({ name, email, message });
  if (error) return NextResponse.json({ error: 'Could not send your message. Please try again or email me directly.' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
