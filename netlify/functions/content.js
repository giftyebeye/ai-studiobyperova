import { getStore } from '@netlify/blobs';

const DEFAULT_CONTENT = {
  hero: {
    headline: 'AI Studio by Perova',
    subheadline: 'AI-generated videos, built by Perova Media.',
  },
  about: {
    text: 'AI Studio by Perova is where we showcase AI-generated video work — created using tools like Google Veo and CapCut for brands and stories that move.',
  },
  contact: {
    whatsappNumber: '2349112609745',
    whatsappMessage: "Hi! I'd like to know more about AI Studio by Perova.",
    instagram: 'ai.studiobyperova',
    tiktok: 'ai.studiobyperova',
  },
  videos: [],
};

export default async (req) => {
  const store = getStore('ai-studio-content');

  if (req.method === 'GET') {
    const data = (await store.get('content', { type: 'json' })) || DEFAULT_CONTENT;
    return new Response(JSON.stringify(data), {
      headers: {
  'Content-Type': 'application/json',
  'Cache-Control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=300',
},
    });
  }

  if (req.method === 'POST') {
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
    let body;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid request body' }), { status: 400 });
    }

    if (!ADMIN_PASSWORD || body.password !== ADMIN_PASSWORD) {
      return new Response(JSON.stringify({ error: 'Wrong password' }), { status: 401 });
    }

    if (body.verifyOnly) {
      return new Response(JSON.stringify({ ok: true }));
    }

    if (!body.content || typeof body.content !== 'object') {
      return new Response(JSON.stringify({ error: 'Missing content' }), { status: 400 });
    }

    await store.setJSON('content', body.content);
    return new Response(JSON.stringify({ ok: true }));
  }

  return new Response('Method not allowed', { status: 405 });
};

export const config = { path: '/api/content' };
