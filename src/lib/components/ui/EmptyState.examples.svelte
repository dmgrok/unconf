<script lang="ts">
	/**
	 * EmptyState Component - Usage Examples
	 *
	 * This file demonstrates various use cases for the EmptyState component.
	 * Copy and adapt these examples for your specific needs.
	 */

	import EmptyState from './EmptyState.svelte';
	import Button from './Button.svelte';

	// Example state
	let showExample = $state('all');
	let searchQuery = $state('');

	// Example handlers
	function createEvent() {
		console.log('Creating event...');
	}

	function clearFilters() {
		console.log('Clearing filters...');
		searchQuery = '';
	}

	function retry() {
		console.log('Retrying...');
	}

	function redirectToLogin() {
		console.log('Redirecting to login...');
	}

	function learnMore() {
		console.log('Opening roadmap...');
	}
</script>

<div class="examples-container">
	<div class="examples-header">
		<h1>EmptyState Component Examples</h1>
		<p>Interactive demonstrations of all EmptyState variants and use cases</p>
	</div>

	<div class="examples-controls">
		<Button
			variant={showExample === 'all' ? 'primary' : 'outline'}
			onclick={() => (showExample = 'all')}
		>
			Show All
		</Button>
		<Button
			variant={showExample === 'variants' ? 'primary' : 'outline'}
			onclick={() => (showExample = 'variants')}
		>
			Variants
		</Button>
		<Button
			variant={showExample === 'sizes' ? 'primary' : 'outline'}
			onclick={() => (showExample = 'sizes')}
		>
			Sizes
		</Button>
		<Button
			variant={showExample === 'use-cases' ? 'primary' : 'outline'}
			onclick={() => (showExample = 'use-cases')}
		>
			Use Cases
		</Button>
	</div>

	{#if showExample === 'all' || showExample === 'variants'}
		<section class="example-section">
			<h2>Variants</h2>

			<div class="example-grid">
				<div class="example-item">
					<h3>No Results</h3>
					<EmptyState
						variant="no-results"
						title="No results found"
						description="Try adjusting your filters or search terms"
						illustration="search"
						actionLabel="Clear Filters"
						onAction={clearFilters}
					/>
				</div>

				<div class="example-item">
					<h3>No Content</h3>
					<EmptyState
						variant="no-content"
						title="No events yet"
						description="Create your first unconference event to get started"
						illustration="create"
						actionLabel="Create Event"
						onAction={createEvent}
					/>
				</div>

				<div class="example-item">
					<h3>Error State</h3>
					<EmptyState
						variant="error"
						title="Something went wrong"
						description="We couldn't load your data. Please try again."
						illustration="error"
						actionLabel="Try Again"
						onAction={retry}
					/>
				</div>

				<div class="example-item">
					<h3>Permission Denied</h3>
					<EmptyState
						variant="permission"
						title="Access restricted"
						description="You need to be signed in to view this content"
						illustration="lock"
						actionLabel="Sign In"
						onAction={redirectToLogin}
					/>
				</div>

				<div class="example-item">
					<h3>Coming Soon</h3>
					<EmptyState
						variant="coming-soon"
						title="Feature coming soon"
						description="We're working on analytics. Check back soon!"
						illustration="rocket"
						actionLabel="Learn More"
						onAction={learnMore}
					/>
				</div>
			</div>
		</section>
	{/if}

	{#if showExample === 'all' || showExample === 'sizes'}
		<section class="example-section">
			<h2>Size Variants</h2>

			<div class="example-grid">
				<div class="example-item">
					<h3>Small</h3>
					<EmptyState
						size="sm"
						variant="no-content"
						title="No comments"
						description="Be the first to comment"
						actionLabel="Add Comment"
						onAction={() => console.log('Add comment')}
					/>
				</div>

				<div class="example-item">
					<h3>Medium (Default)</h3>
					<EmptyState
						variant="no-content"
						title="No notifications"
						description="You're all caught up!"
						icon="🔔"
					/>
				</div>

				<div class="example-item full-width">
					<h3>Large</h3>
					<EmptyState
						size="lg"
						variant="no-content"
						title="Welcome to Unconf!"
						description="Get started by creating your first event and inviting participants"
						illustration="rocket"
						actionLabel="Get Started"
						onAction={createEvent}
					/>
				</div>
			</div>
		</section>
	{/if}

	{#if showExample === 'all' || showExample === 'use-cases'}
		<section class="example-section">
			<h2>Real-World Use Cases</h2>

			<div class="example-grid">
				<div class="example-item">
					<h3>Events List (Empty)</h3>
					<EmptyState
						variant="no-content"
						title="No events scheduled"
						description="Start organizing your first unconference event"
						illustration="create"
						actionLabel="Create Event"
						onAction={createEvent}
					/>
				</div>

				<div class="example-item">
					<h3>Search Results (No Matches)</h3>
					<EmptyState
						variant="no-results"
						title="No topics found for 'design'"
						description="Try different keywords or browse all topics"
						illustration="search"
						actionLabel="View All Topics"
						onAction={() => console.log('View all')}
					/>
				</div>

				<div class="example-item">
					<h3>Topic Voting (Empty)</h3>
					<EmptyState
						variant="no-content"
						title="No topics submitted yet"
						description="Share your ideas and help shape the agenda"
						icon="💡"
						actionLabel="Suggest Topic"
						onAction={() => console.log('Suggest topic')}
					/>
				</div>

				<div class="example-item">
					<h3>Discussion Groups (Not Generated)</h3>
					<EmptyState
						variant="no-content"
						title="No discussion groups assigned"
						description="Room assignments will appear once they're generated"
						illustration="empty"
					/>
				</div>

				<div class="example-item">
					<h3>Analytics (No Data)</h3>
					<EmptyState
						variant="no-content"
						title="No analytics data yet"
						description="Data will appear once the event is active"
						icon="📊"
					/>
				</div>

				<div class="example-item">
					<h3>API Error</h3>
					<EmptyState
						variant="error"
						title="Failed to load events"
						description="Network error. Please check your connection and try again."
						illustration="error"
						actionLabel="Retry"
						onAction={retry}
					/>
				</div>

				<div class="example-item">
					<h3>Admin Area (Non-Admin)</h3>
					<EmptyState
						variant="permission"
						title="Admin access required"
						description="You need administrator privileges to access this area"
						illustration="lock"
						actionLabel="Request Access"
						onAction={() => console.log('Request access')}
					/>
				</div>

				<div class="example-item">
					<h3>Feature Flag (Disabled)</h3>
					<EmptyState
						variant="coming-soon"
						title="Advanced analytics coming soon"
						description="We're building powerful insights for your events"
						illustration="rocket"
						actionLabel="Join Beta"
						onAction={() => console.log('Join beta')}
					/>
				</div>
			</div>
		</section>
	{/if}

	<section class="example-section">
		<h2>Custom Styling Example</h2>

		<div class="example-grid">
			<div class="example-item">
				<h3>Custom Icon</h3>
				<EmptyState
					variant="no-content"
					title="No messages"
					description="Your inbox is empty"
					icon="💬"
					actionLabel="Compose Message"
					onAction={() => console.log('Compose')}
				/>
			</div>

			<div class="example-item">
				<h3>No Action Button</h3>
				<EmptyState
					variant="no-content"
					title="All done!"
					description="You've completed all tasks"
					icon="✅"
				/>
			</div>

			<div class="example-item">
				<h3>Custom Class</h3>
				<EmptyState
					variant="no-content"
					title="Special state"
					description="With custom styling"
					class="custom-empty-state"
				/>
			</div>
		</div>
	</section>

	<section class="example-section">
		<h2>Integration Pattern Examples</h2>

		<div class="code-examples">
			<div class="code-example">
				<h3>Conditional Rendering</h3>
				<pre><code>{`{#if events.length === 0}
  <EmptyState
    variant="no-content"
    title="No events found"
    description="Create your first event"
    actionLabel="Create Event"
    onAction={createEvent}
  />
{:else}
  <!-- Event list -->
{/if}`}</code></pre>
			</div>

			<div class="code-example">
				<h3>Search Results</h3>
				<pre><code>{`{#if results.length === 0 && searchQuery}
  <EmptyState
    variant="no-results"
    title="No results for '{searchQuery}'"
    description="Try different keywords"
    actionLabel="Clear Search"
    onAction={clearSearch}
  />
{/if}`}</code></pre>
			</div>

			<div class="code-example">
				<h3>Error Handling</h3>
				<pre><code>{`{#if error}
  <EmptyState
    variant="error"
    title="Failed to load data"
    description={error.message}
    actionLabel="Try Again"
    onAction={loadData}
  />
{:else if loading}
  <LoadingScreen />
{:else}
  <!-- Content -->
{/if}`}</code></pre>
			</div>
		</div>
	</section>
</div>

<style>
	.examples-container {
		max-width: 1400px;
		margin: 0 auto;
		padding: 2rem 1rem;
	}

	.examples-header {
		text-align: center;
		margin-bottom: 3rem;
	}

	.examples-header h1 {
		font-size: 2.5rem;
		font-weight: 700;
		color: var(--color-text-primary);
		margin-bottom: 0.5rem;
	}

	.examples-header p {
		font-size: 1.125rem;
		color: var(--color-text-secondary);
	}

	.examples-controls {
		display: flex;
		gap: 0.75rem;
		justify-content: center;
		margin-bottom: 3rem;
		flex-wrap: wrap;
	}

	.example-section {
		margin-bottom: 4rem;
	}

	.example-section h2 {
		font-size: 1.75rem;
		font-weight: 600;
		color: var(--color-text-primary);
		margin-bottom: 1.5rem;
		padding-bottom: 0.75rem;
		border-bottom: 2px solid var(--color-border);
	}

	.example-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
		gap: 2rem;
	}

	.example-item {
		background: var(--color-surface-secondary);
		border-radius: 0.5rem;
		padding: 1.5rem;
	}

	.example-item.full-width {
		grid-column: 1 / -1;
	}

	.example-item h3 {
		font-size: 1rem;
		font-weight: 600;
		color: var(--color-text-primary);
		margin-bottom: 1rem;
		padding-bottom: 0.5rem;
		border-bottom: 1px solid var(--color-border);
	}

	.code-examples {
		display: grid;
		gap: 1.5rem;
	}

	.code-example {
		background: var(--color-surface-secondary);
		border-radius: 0.5rem;
		padding: 1.5rem;
	}

	.code-example h3 {
		font-size: 1rem;
		font-weight: 600;
		color: var(--color-text-primary);
		margin-bottom: 1rem;
	}

	.code-example pre {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 0.375rem;
		padding: 1rem;
		overflow-x: auto;
		font-family: 'Courier New', monospace;
		font-size: 0.875rem;
		line-height: 1.6;
		margin: 0;
	}

	.code-example code {
		color: var(--color-text-primary);
	}

	/* Custom empty state styling example */
	:global(.custom-empty-state) {
		background: linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(147, 51, 234, 0.1) 100%);
		border: 2px dashed var(--color-primary);
	}

	/* Responsive */
	@media (max-width: 768px) {
		.example-grid {
			grid-template-columns: 1fr;
		}

		.examples-header h1 {
			font-size: 2rem;
		}

		.examples-header p {
			font-size: 1rem;
		}

		.example-section h2 {
			font-size: 1.5rem;
		}
	}
</style>
