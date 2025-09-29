import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	// Test environment variable access
	const nodeEnv = process.env.NODE_ENV || 'development';
	const vercelEnv = process.env.VERCEL_ENV || 'development';

	// Check if key environment variables are available (without exposing values)
	const envCheck = {
		NODE_ENV: nodeEnv,
		VERCEL_ENV: vercelEnv,
		hasAnthropicKey: !!process.env.ANTHROPIC_API_KEY,
		hasGoogleClientId: !!process.env.GOOGLE_CLIENT_ID,
		hasAuthSecret: !!process.env.AUTH_SECRET,
		timestamp: new Date().toISOString()
	};

	return json({
		status: 'healthy',
		environment: envCheck,
		message: 'UnConf API is running successfully'
	});
};