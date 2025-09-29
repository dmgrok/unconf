import { json } from '@sveltejs/kit';
import { createGuestToken } from '$lib/auth/guest';

export async function GET() {
  try {
    const guestToken = await createGuestToken();
    return json({ token: guestToken });
  } catch (error) {
    console.error('Failed to create guest token:', error);
    return json(
      { error: 'Failed to create guest token' },
      { status: 500 }
    );
  }
}