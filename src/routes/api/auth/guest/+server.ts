import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createGuestToken, verifyGuestToken, refreshGuestToken } from '$lib/auth/guest';

export const POST: RequestHandler = async ({ request, cookies }) => {
  try {
    const { action } = await request.json();

    switch (action) {
      case 'create': {
        // Create a new guest token
        const { token, user } = createGuestToken();

        // Set secure HTTP-only cookie
        cookies.set('guest-token', token, {
          httpOnly: true,
          secure: true,
          sameSite: 'lax',
          path: '/',
          maxAge: 24 * 60 * 60 // 24 hours
        });

        return json({
          success: true,
          user,
          message: 'Guest session created successfully'
        });
      }

      case 'refresh': {
        // Refresh existing guest token
        const currentToken = cookies.get('guest-token');
        if (!currentToken) {
          return json({
            success: false,
            error: 'No guest token found'
          }, { status: 401 });
        }

        const refreshResult = refreshGuestToken(currentToken);
        if (!refreshResult) {
          return json({
            success: false,
            error: 'Invalid or expired guest token'
          }, { status: 401 });
        }

        // Set new token in cookie
        cookies.set('guest-token', refreshResult.token, {
          httpOnly: true,
          secure: true,
          sameSite: 'lax',
          path: '/',
          maxAge: 24 * 60 * 60 // 24 hours
        });

        return json({
          success: true,
          user: refreshResult.user,
          message: 'Guest session refreshed successfully'
        });
      }

      case 'verify': {
        // Verify existing guest token
        const currentToken = cookies.get('guest-token');
        if (!currentToken) {
          return json({
            success: false,
            error: 'No guest token found'
          }, { status: 401 });
        }

        const tokenData = verifyGuestToken(currentToken);
        if (!tokenData) {
          return json({
            success: false,
            error: 'Invalid or expired guest token'
          }, { status: 401 });
        }

        const user = {
          id: tokenData.id,
          name: 'Guest User',
          role: 'guest' as const,
          sessionId: tokenData.sessionId,
          isGuest: true
        };

        return json({
          success: true,
          user,
          message: 'Guest session is valid'
        });
      }

      default:
        return json({
          success: false,
          error: 'Invalid action'
        }, { status: 400 });
    }
  } catch (error) {
    console.error('Guest auth error:', error);
    return json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
};

export const DELETE: RequestHandler = async ({ cookies }) => {
  try {
    // Clear guest token cookie
    cookies.delete('guest-token', {
      path: '/'
    });

    return json({
      success: true,
      message: 'Guest session cleared successfully'
    });
  } catch (error) {
    console.error('Guest logout error:', error);
    return json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
};