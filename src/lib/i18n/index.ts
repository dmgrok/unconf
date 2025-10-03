import { browser } from '$app/environment';
import { init, register } from 'svelte-i18n';

const defaultLocale = 'en-US';

// Register the locales
register('en-US', () => import('./locales/en-US.json'));
register('fr-FR', () => import('./locales/fr-FR.json'));

// Initialize svelte-i18n
init({
  fallbackLocale: defaultLocale,
  initialLocale: browser ? window.navigator.language : defaultLocale,
  loadingDelay: 200,
  formats: {
    number: {
      EUR: { style: 'currency', currency: 'EUR' },
      USD: { style: 'currency', currency: 'USD' },
    }
  },
  warnOnMissingMessages: true,
});

export { defaultLocale };
export * from 'svelte-i18n';