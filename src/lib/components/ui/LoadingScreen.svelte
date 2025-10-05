<script lang="ts">
	import Skeleton from './Skeleton.svelte';

	interface LoadingScreenProps {
		variant?: 'page' | 'section' | 'card';
	}

	let { variant = 'page' }: LoadingScreenProps = $props();
</script>

<div class="loading-container loading-{variant}">
	{#if variant === 'page'}
		<!-- Full page loading skeleton -->
		<div class="page-skeleton">
			<Skeleton variant="rectangular" height="60px" />
			<div class="content-skeleton">
				<Skeleton variant="rectangular" height="200px" />
				<div class="grid-skeleton">
					<Skeleton variant="rectangular" height="150px" />
					<Skeleton variant="rectangular" height="150px" />
					<Skeleton variant="rectangular" height="150px" />
				</div>
			</div>
		</div>
	{:else if variant === 'section'}
		<!-- Section loading skeleton -->
		<Skeleton variant="text" width="40%" />
		<Skeleton variant="text" width="100%" />
		<Skeleton variant="text" width="80%" />
	{:else}
		<!-- Card loading skeleton -->
		<Skeleton variant="rectangular" height="120px" />
		<Skeleton variant="text" width="60%" />
		<Skeleton variant="text" width="100%" />
	{/if}
</div>

<style>
	.loading-container {
		width: 100%;
	}

	.page-skeleton {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-6);
		padding: var(--spacing-4);
	}

	.content-skeleton {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-4);
	}

	.grid-skeleton {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: var(--spacing-4);
	}
</style>
