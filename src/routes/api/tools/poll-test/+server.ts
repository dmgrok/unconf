import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
  const hasToken = !!env.BLOB_READ_WRITE_TOKEN;
  const testId = url.searchParams.get('id') || 'test';
  
  return json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    hasToken,
    testId
  });
};
