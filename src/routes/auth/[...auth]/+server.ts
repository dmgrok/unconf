import { SvelteKitAuth } from '@auth/sveltekit';
import Google from '@auth/sveltekit/providers/google';
import { GuestProvider } from '$lib/auth/providers';
import {
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  AUTH_SECRET
} from '$env/static/private';

const { handle } = SvelteKitAuth({
  providers: [
    Google({
      clientId: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
    }),
    GuestProvider,
  ],
  secret: AUTH_SECRET,
  trustHost: true,
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role || 'user'; // Use user's role or default to 'user'
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
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
});

export const GET = handle;
export const POST = handle;