/**
 * Minimal Poll API Test - to identify what's causing the crash
 */

import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';

// Constants
const BLOB_BASE_URL = 'https://nspbwyiutuovvkcx.public.blob.vercel-storage.com';

export const GET: RequestHandler = async ({ url }) => {
  const pollId = url.searchParams.get('id');
  const hasToken = !!env.BLOB_READ_WRITE_TOKEN;
  const fullUrl = url.toString();
  const searchParams = url.searchParams.toString();
  
  if (!pollId) {
    return json({ error: 'Poll ID required', hasToken, fullUrl, searchParams });
  }
  
  // Try to fetch from blob
  const blobUrl = `${BLOB_BASE_URL}/polls/${pollId}.json`;
  
  try {
    const response = await fetch(blobUrl);
    
    if (!response.ok) {
      return json({ 
        error: 'Poll not found', 
        status: response.status,
        blobUrl,
        hasToken,
        pollId 
      }, { status: 404 });
    }
    
    const poll = await response.json();
    return json({ poll, hasToken, pollId });
  } catch (error) {
    return json({ 
      error: 'Fetch failed', 
      details: String(error),
      blobUrl,
      hasToken,
      pollId 
    }, { status: 500 });
  }
};
