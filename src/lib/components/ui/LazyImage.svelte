<script lang="ts">
	import { onMount } from 'svelte';

	interface Props {
		src: string;
		alt: string;
		class?: string;
		width?: number | string;
		height?: number | string;
		loading?: 'lazy' | 'eager';
		placeholder?: string;
	}

	let {
		src,
		alt,
		class: className = '',
		width,
		height,
		loading = 'lazy',
		placeholder = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect fill="%23f0f0f0" width="100" height="100"/%3E%3C/svg%3E'
	}: Props = $props();

	let imgElement: HTMLImageElement;
	let isLoaded = $state(false);
	let isInView = $state(false);
	let currentSrc = $state(placeholder);

	onMount(() => {
		// Use Intersection Observer for lazy loading
		const observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting) {
						isInView = true;
						currentSrc = src;
						observer.disconnect();
					}
				});
			},
			{
				rootMargin: '50px' // Start loading 50px before coming into view
			}
		);

		if (imgElement) {
			observer.observe(imgElement);
		}

		return () => {
			observer.disconnect();
		};
	});

	function handleLoad() {
		isLoaded = true;
	}
</script>

<img
	bind:this={imgElement}
	src={currentSrc}
	{alt}
	class={`lazy-image ${className} ${isLoaded ? 'loaded' : 'loading'}`}
	{width}
	{height}
	loading={loading}
	onload={handleLoad}
/>

<style>
	.lazy-image {
		transition: opacity 0.3s ease-in-out;
	}

	.lazy-image.loading {
		opacity: 0.5;
		filter: blur(5px);
	}

	.lazy-image.loaded {
		opacity: 1;
		filter: none;
	}
</style>
