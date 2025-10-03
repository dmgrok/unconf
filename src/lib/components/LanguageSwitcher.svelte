<script lang="ts">
	import { locale } from '$lib/i18n';
	import { t } from '$lib/i18n';
	import { setAndSaveLocale } from '$lib/utils/locale-persistence';

	// Available locales with their display names
	const availableLocales = [
		{ code: 'en-US', name: 'English', flag: '🇺🇸' },
		{ code: 'fr-FR', name: 'Français', flag: '🇫🇷' }
	];

	// Get current locale
	let currentLocale = $locale || 'en-US';

	// Update when locale changes
	$: currentLocale = $locale || 'en-US';

	// Get display info for current locale
	$: currentLocaleInfo =
		availableLocales.find((l) => l.code === currentLocale) || availableLocales[0];

	// Handle locale change
	function changeLocale(newLocale: string) {
		setAndSaveLocale(newLocale);
	}

	// Dropdown state
	let isOpen = $state(false);

	function toggleDropdown() {
		isOpen = !isOpen;
	}

	function selectLocale(localeCode: string) {
		changeLocale(localeCode);
		isOpen = false;
	}

	// Close dropdown when clicking outside
	function handleClickOutside(event: MouseEvent) {
		const target = event.target as HTMLElement;
		if (!target.closest('.language-switcher')) {
			isOpen = false;
		}
	}
</script>

<svelte:window onclick={handleClickOutside} />

<div class="language-switcher">
	<button class="language-button" onclick={toggleDropdown} aria-label={$t('navigation.language')}>
		<span class="flag">{currentLocaleInfo.flag}</span>
		<span class="language-name">{currentLocaleInfo.name}</span>
		<span class="dropdown-arrow" class:open={isOpen}>▼</span>
	</button>

	{#if isOpen}
		<div class="language-dropdown">
			{#each availableLocales as loc}
				<button
					class="language-option"
					class:active={loc.code === currentLocale}
					onclick={() => selectLocale(loc.code)}
				>
					<span class="flag">{loc.flag}</span>
					<span class="language-name">{loc.name}</span>
					{#if loc.code === currentLocale}
						<span class="checkmark">✓</span>
					{/if}
				</button>
			{/each}
		</div>
	{/if}
</div>

<style>
	.language-switcher {
		position: relative;
		display: inline-block;
	}

	.language-button {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 0.75rem;
		background: white;
		border: 1px solid #dee2e6;
		border-radius: 4px;
		cursor: pointer;
		font-size: 0.9rem;
		transition: all 0.2s ease;
	}

	.language-button:hover {
		background: #f8f9fa;
		border-color: #adb5bd;
	}

	.language-button:focus {
		outline: 2px solid #007bff;
		outline-offset: 2px;
	}

	.flag {
		font-size: 1.2rem;
		line-height: 1;
	}

	.language-name {
		color: #333;
		font-weight: 500;
	}

	.dropdown-arrow {
		font-size: 0.7rem;
		color: #666;
		transition: transform 0.2s ease;
	}

	.dropdown-arrow.open {
		transform: rotate(180deg);
	}

	.language-dropdown {
		position: absolute;
		top: calc(100% + 0.25rem);
		right: 0;
		min-width: 150px;
		background: white;
		border: 1px solid #dee2e6;
		border-radius: 4px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
		z-index: 1000;
		overflow: hidden;
	}

	.language-option {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		width: 100%;
		padding: 0.75rem 1rem;
		background: white;
		border: none;
		text-align: left;
		cursor: pointer;
		transition: background-color 0.15s ease;
	}

	.language-option:hover {
		background: #f8f9fa;
	}

	.language-option.active {
		background: #e7f3ff;
	}

	.language-option .language-name {
		flex: 1;
	}

	.checkmark {
		color: #007bff;
		font-weight: bold;
	}

	/* Mobile responsive */
	@media (max-width: 768px) {
		.language-button {
			padding: 0.4rem 0.6rem;
			font-size: 0.85rem;
		}

		.language-name {
			display: none;
		}

		.flag {
			font-size: 1.5rem;
		}

		.language-dropdown {
			right: auto;
			left: 0;
		}

		.language-option .language-name {
			display: inline;
		}
	}
</style>
