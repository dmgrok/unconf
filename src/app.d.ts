// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			session: import('@auth/sveltekit').Session | null;
			getSession(): Promise<import('@auth/sveltekit').Session | null>;
			user: {
				id: string;
				name: string | null;
				email: string | null;
				role: import('$lib/auth/middleware').UserRole;
				isGuest: boolean;
				sessionId?: string;
			} | null;
			cspNonce?: string;
		}
		interface PageData {
			session: import('@auth/sveltekit').Session | null;
		}
		// interface PageState {}
		// interface Platform {}
	}
}

declare module '@auth/sveltekit' {
	interface Session {
		user?: {
			id?: string;
			name?: string | null;
			email?: string | null;
			image?: string | null;
			role?: string;
			sessionId?: string;
			isGuest?: boolean;
		};
	}

	interface JWT {
		id?: string;
		role?: string;
		sessionId?: string;
		isGuest?: boolean;
	}

	interface User {
		id?: string;
		name?: string | null;
		email?: string | null;
		image?: string | null;
		role?: string;
		sessionId?: string;
		isGuest?: boolean;
	}
}

export {};
