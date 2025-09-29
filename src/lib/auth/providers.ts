import type { Provider } from '@auth/core/providers';
import { createGuestToken, verifyGuestToken, createGuestUserFromToken } from './guest';

export const GuestProvider: Provider = {
  id: 'guest',
  name: 'Guest',
  type: 'credentials',
  credentials: {
    guest: { label: 'Guest Access', type: 'hidden', value: 'true' }
  },
  async authorize(credentials) {
    try {
      // Create a new guest token and user
      const { user } = createGuestToken();

      return {
        id: user.id,
        name: user.name,
        email: null,
        image: null,
        role: user.role,
        sessionId: user.sessionId,
        isGuest: true
      };
    } catch (error) {
      console.error('Guest authorization error:', error);
      return null;
    }
  }
};