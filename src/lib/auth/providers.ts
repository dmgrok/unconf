import type { Provider } from '@auth/core/providers';
import { createGuestToken, verifyGuestToken, createGuestUserFromToken } from './guest';
import bcrypt from 'bcryptjs';
import { UserRepository } from '$lib/storage/UserRepository';

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

export const EmailPasswordProvider: Provider = {
  id: 'email-password',
  name: 'Email & Password',
  type: 'credentials',
  credentials: {
    email: { label: 'Email', type: 'email', placeholder: 'you@example.com' },
    password: { label: 'Password', type: 'password' }
  },
  async authorize(credentials) {
    console.log('[EmailPasswordProvider] authorize called');
    try {
      if (!credentials?.email || !credentials?.password) {
        console.error('[EmailPasswordProvider] Missing email or password');
        return null;
      }

      console.log('[EmailPasswordProvider] Email:', credentials.email);

      // Initialize user repository
      const userRepo = new UserRepository({
        dataDir: './data'
      });

      // Find user by email
      const userResult = await userRepo.findByEmail(credentials.email as string);

      if (!userResult.success || !userResult.data) {
        console.error('[EmailPasswordProvider] User not found');
        return null;
      }

      const user = userResult.data;
      console.log('[EmailPasswordProvider] User found:', user.email);

      // Verify password
      if (!user.password) {
        console.error('[EmailPasswordProvider] User has no password set');
        return null;
      }

      const isValidPassword = await bcrypt.compare(
        credentials.password as string,
        user.password
      );

      if (!isValidPassword) {
        console.error('[EmailPasswordProvider] Invalid password');
        return null;
      }

      console.log('[EmailPasswordProvider] Password valid, returning user');

      // Update last active
      await userRepo.updateLastActive(user.id);

      // Return user data (excluding password)
      return {
        id: user.id,
        name: user.name,
        email: user.email || null,
        image: user.avatar || null,
        role: user.role,
        sessionId: user.id, // Use user ID as session ID for consistency
        isGuest: false
      };
    } catch (error) {
      console.error('Email/password authorization error:', error);
      return null;
    }
  }
};