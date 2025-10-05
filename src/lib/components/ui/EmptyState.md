# EmptyState Component

A reusable, accessible empty state component system for displaying helpful messages when content is unavailable.

## Features

- 5 pre-configured variants for common scenarios
- Customizable icons and illustrations
- Clear typography hierarchy
- Responsive design
- Accessibility-first approach
- Dark mode support
- Generous padding and centering

## Usage

### Basic Example

```svelte
<script>
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
</script>

<EmptyState
	variant="no-content"
	title="No events yet"
	description="Create your first event to get started"
	actionLabel="Create Event"
	onAction={() => console.log('Create event')}
/>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `'no-results' \| 'no-content' \| 'error' \| 'permission' \| 'coming-soon'` | `'no-content'` | Predefined variant with default styling |
| `title` | `string` | Required | Main heading text |
| `description` | `string` | `undefined` | Optional descriptive text |
| `icon` | `string` | Auto | Custom emoji or icon (defaults based on variant) |
| `actionLabel` | `string` | `undefined` | Text for action button |
| `onAction` | `() => void` | `undefined` | Click handler for action button |
| `illustration` | `'search' \| 'create' \| 'error' \| 'lock' \| 'rocket' \| 'empty'` | `undefined` | Optional SVG illustration |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Size variant |
| `class` | `string` | `''` | Additional CSS classes |

## Variants

### 1. No Results

Use when search or filters return no matches.

```svelte
<EmptyState
	variant="no-results"
	title="No results found"
	description="Try adjusting your filters or search terms"
	illustration="search"
	actionLabel="Clear filters"
	onAction={clearFilters}
/>
```

**Default Icon:** 🔍
**Use Cases:** Search results, filtered lists, query responses

### 2. No Content Yet

Use when a list or collection is empty but can be populated.

```svelte
<EmptyState
	variant="no-content"
	title="No topics yet"
	description="Be the first to suggest a topic for discussion"
	illustration="create"
	actionLabel="Create Topic"
	onAction={openCreateModal}
/>
```

**Default Icon:** 📝
**Use Cases:** Empty lists, new features, onboarding

### 3. Error State

Use when an error prevents content from loading.

```svelte
<EmptyState
	variant="error"
	title="Something went wrong"
	description="We couldn't load your events. Please try again."
	illustration="error"
	actionLabel="Try Again"
	onAction={retry}
/>
```

**Default Icon:** ⚠️
**Use Cases:** API errors, failed requests, data loading issues

### 4. Permission Denied

Use when users lack access to view content.

```svelte
<EmptyState
	variant="permission"
	title="Access restricted"
	description="You need to be signed in to view this content"
	illustration="lock"
	actionLabel="Sign In"
	onAction={redirectToLogin}
/>
```

**Default Icon:** 🔒
**Use Cases:** Authentication walls, role-based access, private content

### 5. Coming Soon

Use for features in development.

```svelte
<EmptyState
	variant="coming-soon"
	title="Feature coming soon"
	description="We're working on analytics. Check back soon!"
	illustration="rocket"
	actionLabel="Learn More"
	onAction={() => goto('/roadmap')}
/>
```

**Default Icon:** 🚀
**Use Cases:** Unreleased features, roadmap items, beta announcements

## Size Variants

### Small
Compact layout for smaller sections or cards.

```svelte
<EmptyState
	size="sm"
	title="No comments"
	description="Start the conversation"
/>
```

### Medium (Default)
Standard size for most use cases.

```svelte
<EmptyState
	title="No notifications"
	description="You're all caught up!"
/>
```

### Large
Prominent display for full-page empty states.

```svelte
<EmptyState
	size="lg"
	title="Welcome to Unconf!"
	description="Get started by creating your first event"
	actionLabel="Create Event"
	onAction={createEvent}
/>
```

## Common Use Cases

### Events List

```svelte
<script>
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import { goto } from '$app/navigation';

	let events = $state([]);
</script>

{#if events.length === 0}
	<EmptyState
		variant="no-content"
		title="No events found"
		description="Create your first unconference event to get started"
		illustration="create"
		actionLabel="Create Event"
		onAction={() => goto('/admin/events/new')}
	/>
{:else}
	<!-- Event list -->
{/if}
```

### Search Results

```svelte
<script>
	import EmptyState from '$lib/components/ui/EmptyState.svelte';

	let searchQuery = $state('');
	let results = $state([]);

	function clearSearch() {
		searchQuery = '';
		// Trigger new search
	}
</script>

{#if results.length === 0 && searchQuery}
	<EmptyState
		variant="no-results"
		title="No results for '{searchQuery}'"
		description="Try different keywords or clear your search"
		illustration="search"
		actionLabel="Clear Search"
		onAction={clearSearch}
	/>
{/if}
```

### Topic Submission

```svelte
<script>
	import EmptyState from '$lib/components/ui/EmptyState.svelte';

	let topics = $state([]);
	let showModal = $state(false);
</script>

{#if topics.length === 0}
	<EmptyState
		variant="no-content"
		title="No topics submitted yet"
		description="Share your ideas and help shape the agenda"
		icon="💡"
		actionLabel="Suggest Topic"
		onAction={() => showModal = true}
	/>
{/if}
```

### Admin Dashboard

```svelte
<EmptyState
	variant="no-content"
	title="No discussion groups assigned"
	description="Room assignments will appear here once they're generated"
	illustration="empty"
	size="lg"
/>
```

### Error Handling

```svelte
<script>
	import EmptyState from '$lib/components/ui/EmptyState.svelte';

	let error = $state(null);
	let loading = $state(true);

	async function loadData() {
		loading = true;
		error = null;
		try {
			// Fetch data
		} catch (e) {
			error = e.message;
		} finally {
			loading = false;
		}
	}
</script>

{#if error}
	<EmptyState
		variant="error"
		title="Failed to load data"
		description={error}
		illustration="error"
		actionLabel="Try Again"
		onAction={loadData}
	/>
{/if}
```

### Permission Wall

```svelte
<script>
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import { goto } from '$app/navigation';

	let isAdmin = $state(false);
</script>

{#if !isAdmin}
	<EmptyState
		variant="permission"
		title="Admin access required"
		description="You need administrator privileges to access this page"
		illustration="lock"
		actionLabel="Contact Admin"
		onAction={() => goto('/contact')}
	/>
{/if}
```

## Custom Icons

You can override default icons with custom emojis:

```svelte
<EmptyState
	variant="no-content"
	title="No messages"
	icon="💬"
	description="Your inbox is empty"
/>
```

## Accessibility

The component follows accessibility best practices:

- Uses semantic HTML with proper ARIA attributes
- Includes `role="status"` and `aria-live="polite"` for screen reader announcements
- Proper heading hierarchy with `<h3>` for titles
- Sufficient color contrast for all text
- Icons marked with `aria-hidden="true"`
- Keyboard-accessible action buttons
- Respects `prefers-reduced-motion` for animations

## Styling

The component uses CSS custom properties from the theme system:

- `--color-surface` - Background color
- `--color-border` - Border color
- `--color-text-primary` - Title color
- `--color-text-secondary` - Description color
- `--color-text-tertiary` - Illustration color

Override with custom classes:

```svelte
<EmptyState
	title="Custom styled"
	class="my-custom-empty-state"
/>

<style>
	:global(.my-custom-empty-state) {
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		color: white;
	}
</style>
```

## Best Practices

### When to Use

✅ **DO** use EmptyState when:
- A list or collection has no items
- Search returns no results
- Features are not yet available
- Errors prevent content display
- Users lack permissions

❌ **DON'T** use EmptyState when:
- Content is loading (use LoadingScreen or Skeleton)
- Temporary states during user actions
- Brief transition states

### Writing Good Messages

**Titles:**
- Keep it short (2-5 words)
- Be specific to the context
- Use friendly, conversational tone

**Descriptions:**
- Explain why the state is empty
- Suggest what users can do next
- Keep it under 2 sentences

**Actions:**
- Use action verbs ("Create", "Try Again", "Clear Filters")
- Make it clear what will happen
- Only include if there's a meaningful action

### Examples of Good vs. Bad Messages

**❌ Bad:**
```svelte
<EmptyState
	title="Empty"
	description="There's nothing here"
	actionLabel="Click here"
/>
```

**✅ Good:**
```svelte
<EmptyState
	variant="no-content"
	title="No events scheduled"
	description="Start by creating your first unconference event"
	actionLabel="Create Event"
	onAction={createEvent}
/>
```

## Integration Points

Use EmptyState in these areas:

- `/routes/admin/events/+page.svelte` - Event list
- `/routes/[eventId]/+page.svelte` - Topic voting
- `/routes/[eventId]/schedule/+page.svelte` - Schedule display
- `/routes/[eventId]/admin/rooms/+page.svelte` - Room assignments
- `/routes/[eventId]/admin/analytics/+page.svelte` - Analytics dashboard
- Search results across the application
- User dashboards
- Notification panels

## Migration Guide

### From Inline Messages

**Before:**
```svelte
{#if events.length === 0}
	<div class="text-center p-8">
		<p>No events found</p>
		<button onclick={createEvent}>Create Event</button>
	</div>
{/if}
```

**After:**
```svelte
{#if events.length === 0}
	<EmptyState
		variant="no-content"
		title="No events found"
		actionLabel="Create Event"
		onAction={createEvent}
	/>
{/if}
```

### From Custom Components

Replace custom empty state implementations with standardized EmptyState component for consistency.

## Testing

```typescript
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import EmptyState from './EmptyState.svelte';

test('renders title and description', () => {
	render(EmptyState, {
		props: {
			title: 'No results',
			description: 'Try again'
		}
	});

	expect(screen.getByText('No results')).toBeInTheDocument();
	expect(screen.getByText('Try again')).toBeInTheDocument();
});

test('calls onAction when button clicked', async () => {
	const onAction = vi.fn();

	render(EmptyState, {
		props: {
			title: 'Empty',
			actionLabel: 'Click me',
			onAction
		}
	});

	await userEvent.click(screen.getByText('Click me'));
	expect(onAction).toHaveBeenCalledTimes(1);
});
```
