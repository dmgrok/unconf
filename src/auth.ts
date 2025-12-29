import { SvelteKitAuth } from '@auth/sveltekit';
import Credentials from '@auth/sveltekit/providers/credentials';
import Google from '@auth/sveltekit/providers/google';
import bcrypt from 'bcryptjs';
import { UserRepository } from '$lib/storage/UserRepository';
import { createGuestToken } from '$lib/auth/guest';
import {
	GOOGLE_CLIENT_ID,
	GOOGLE_CLIENT_SECRET,
	AUTH_SECRET
} from '$env/static/private';

export const { handle, signIn, signOut } = SvelteKitAuth({
	providers: [
		Credentials({
			id: 'credentials',
			name: 'Email & Password',
			credentials: {
				email: { label: 'Email', type: 'email', placeholder: 'you@example.com' },
				password: { label: 'Password', type: 'password' }
			},
			async authorize(credentials) {
				console.log('[Credentials Provider] authorize called');
				try {
					if (!credentials?.email || !credentials?.password) {
						console.error('[Credentials Provider] Missing email or password');
						return null;
					}

					console.log('[Credentials Provider] Email:', credentials.email);

					// Initialize user repository
					const userRepo = new UserRepository({
						dataDir: './data'
					});

					// Find user by email
					const userResult = await userRepo.findByEmail(credentials.email as string);

					if (!userResult.success || !userResult.data) {
						console.error('[Credentials Provider] User not found');
						return null;
					}

					const user = userResult.data;
					console.log('[Credentials Provider] User found:', user.email);

					// Verify password
					if (!user.password) {
						console.error('[Credentials Provider] User has no password set');
						return null;
					}

					const isValidPassword = await bcrypt.compare(
						credentials.password as string,
						user.password
					);

					if (!isValidPassword) {
						console.error('[Credentials Provider] Invalid password');
						return null;
					}

					console.log('[Credentials Provider] Password valid, returning user');

					// Update last active
					await userRepo.updateLastActive(user.id);

					// Return user data (excluding password)
					return {
						id: user.id,
						name: user.name,
						email: user.email || null,
						image: user.avatar || null,
						role: user.role,
						sessionId: user.id,
						isGuest: false
					};
				} catch (error) {
					console.error('[Credentials Provider] Authorization error:', error);
					return null;
				}
			}
		}),
		Credentials({
			id: 'guest',
			name: 'Guest',
			credentials: {
				guest: { label: 'Guest Access', type: 'hidden', value: 'true' }
			},
			async authorize() {
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
					console.error('[Guest Provider] Authorization error:', error);
					return null;
				}
			}
		}),
		Google({
			clientId: GOOGLE_CLIENT_ID,
			clientSecret: GOOGLE_CLIENT_SECRET
		})
	],
	secret: AUTH_SECRET,
	trustHost: true,
	callbacks: {
		async jwt({ token, user }) {
			if (user) {
				token.id = user.id;
				token.role = user.role || 'user';
				token.sessionId = user.sessionId;
				token.isGuest = user.isGuest || false;
			}
			return token;
		},
		async session({ session, token }) {
			if (token && session.user) {
				session.user.id = token.id as string;
				session.user.role = token.role as string;
				session.user.sessionId = token.sessionId as string;
				session.user.isGuest = token.isGuest as boolean;
			}
			return session;
		}
	},
	pages: {
		signIn: '/signin',
		error: '/auth/error'
	}
});
