import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { accountRecovery } from '$lib/auth/password-reset';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { email, sessionId, accountType } = await request.json();

    // Validate input
    if (!email && !sessionId) {
      return json({
        success: false,
        error: 'Please provide an email address or session information.'
      }, { status: 400 });
    }

    // Initiate recovery process
    const result = await accountRecovery.initiateRecovery(email, sessionId, accountType);

    // Always return success for security (don't reveal if account exists)
    // But provide appropriate messaging
    return json(result, {
      status: result.success ? 200 : 400
    });

  } catch (error) {
    console.error('Account recovery error:', error);
    return json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
};

// GET endpoint to check recovery token validity (for future password reset)
export const GET: RequestHandler = async ({ url }) => {
  try {
    const token = url.searchParams.get('token');

    if (!token) {
      return json({
        valid: false,
        error: 'No token provided'
      }, { status: 400 });
    }

    // For now, just return a placeholder response
    // In a real implementation with email/password auth, this would verify the token
    return json({
      valid: false,
      error: 'Token verification not yet implemented',
      message: 'Password reset tokens will be implemented when email/password authentication is added'
    });

  } catch (error) {
    console.error('Token verification error:', error);
    return json({
      valid: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
};