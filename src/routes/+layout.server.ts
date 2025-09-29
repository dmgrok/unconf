import type { LayoutServerLoad } from './$types';
import { dev } from '$app/environment';
import { EventRepository } from '$lib/storage';

export const load: LayoutServerLoad = async (event) => {
  const session = await event.locals.getSession?.();

  // Load demo event for development
  let demoEvent = null;
  if (dev) {
    try {
      const eventRepo = new EventRepository({
        dataDir: './data',
        enableBackups: false
      });

      // Try to find the demo event
      const demoResult = await eventRepo.findByAccessCode('DEMO2024');
      if (demoResult.success) {
        demoEvent = demoResult.data;
      }
    } catch (error) {
      console.warn('Could not load demo event:', error);
    }
  }

  return {
    session,
    demoEvent: dev ? demoEvent : null
  };
};