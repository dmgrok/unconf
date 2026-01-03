/**
 * Minimal Poll API Test - to identify what's causing the crash
 */

import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';

// Constants
const BLOB_BASE_URL = 'https://nspbwyiutuovvkcx.public.blob.vercel-storage.com';

// Helper to add no-cache headers
function jsonNoCache(data: unknown, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  headers.set('Pragma', 'no-cache');
  headers.set('Expires', '0');
  return json(data, { ...init, headers });
}

export const GET: RequestHandler = async ({ url, request }) => {
  // Try multiple ways to get the URL params
  const pollIdFromUrl = url.searchParams.get('id');
  const requestUrl = new URL(request.url);
  const pollIdFromRequest = requestUrl.searchParams.get('id');
  
  const hasToken = !!env.BLOB_READ_WRITE_TOKEN;
  const fullUrl = url.toString();
  const fullRequestUrl = request.url;
  const searchParams = url.searchParams.toString();
  const requestSearchParams = requestUrl.searchParams.toString();
  
  // Use pollId from either source
  const pollId = pollIdFromUrl || pollIdFromRequest;
  
  if (!pollId) {
    return jsonNoCache({ 
      error: 'Poll ID required', 
      hasToken, 
      fullUrl, 
      fullRequestUrl,
      searchParams, 
      requestSearchParams,
      pollIdFromUrl,
      pollIdFromRequest
    });
  }
  
  // Try to fetch from blob
  const blobUrl = `${BLOB_BASE_URL}/polls/${pollId}.json`;
  
  try {
    const response = await fetch(blobUrl);
    
    if (!response.ok) {
      return jsonNoCache({ 
        error: 'Poll not found', 
        status: response.status,
        blobUrl,
        hasToken,
        pollId 
      }, { status: 404 });
    }
    
    const poll = await response.json();
    return jsonNoCache({ poll, hasToken, pollId });
  } catch (error) {
    return jsonNoCache({ 
      error: 'Fetch failed', 
      details: String(error),
      blobUrl,
      hasToken,
      pollId 
    }, { status: 500 });
  }
};
