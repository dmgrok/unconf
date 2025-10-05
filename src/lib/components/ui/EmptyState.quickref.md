# EmptyState Quick Reference

Quick copy-paste snippets for common EmptyState scenarios.

## Import

```svelte
import { EmptyState } from '$lib/components/ui';
```

## Common Patterns

### Empty List (First Time)

```svelte
<EmptyState
	variant="no-content"
	title="No events yet"
	description="Create your first event to get started"
	illustration="create"
	actionLabel="Create Event"
	onAction={handleCreate}
/>
```

### Search No Results

```svelte
<EmptyState
	variant="no-results"
	title="No results found"
	description="Try different search terms or clear filters"
	illustration="search"
	actionLabel="Clear Search"
	onAction={() => query = ''}
/>
```

### Error State

```svelte
<EmptyState
	variant="error"
	title="Something went wrong"
	description={error.message}
	illustration="error"
	actionLabel="Try Again"
	onAction={retry}
/>
```

### Permission Denied

```svelte
<EmptyState
	variant="permission"
	title="Access restricted"
	description="Sign in to view this content"
	illustration="lock"
	actionLabel="Sign In"
	onAction={() => goto('/login')}
/>
```

### Coming Soon

```svelte
<EmptyState
	variant="coming-soon"
	title="Feature coming soon"
	description="We're working on it. Check back soon!"
	illustration="rocket"
/>
```

## Size Variants

### Small (Cards, Sidebars)

```svelte
<EmptyState
	size="sm"
	title="No comments"
	description="Be the first to comment"
/>
```

### Medium (Default)

```svelte
<EmptyState
	title="No notifications"
	description="You're all caught up!"
/>
```

### Large (Full Page)

```svelte
<EmptyState
	size="lg"
	title="Welcome!"
	description="Get started by creating your first item"
	actionLabel="Get Started"
	onAction={handleStart}
/>
```

## Custom Icons

```svelte
<EmptyState
	title="No messages"
	icon="💬"
	description="Your inbox is empty"
/>
```

## No Action Button

```svelte
<EmptyState
	title="All done!"
	description="You've completed all tasks"
	icon="✅"
/>
```

## Conditional Rendering Patterns

### With Loading State

```svelte
{#if loading}
	<LoadingScreen />
{:else if items.length === 0}
	<EmptyState variant="no-content" title="No items" />
{:else}
	<!-- Content -->
{/if}
```

### With Error Handling

```svelte
{#if error}
	<EmptyState variant="error" title="Error" description={error} actionLabel="Retry" onAction={retry} />
{:else if data.length === 0}
	<EmptyState variant="no-content" title="No data" />
{:else}
	<!-- Content -->
{/if}
```

### Search Results

```svelte
{#if results.length === 0 && query}
	<EmptyState variant="no-results" title="No results for '{query}'" />
{:else if results.length === 0}
	<EmptyState variant="no-content" title="Start searching" />
{:else}
	<!-- Results -->
{/if}
```

### Permission Check

```svelte
{#if !hasPermission}
	<EmptyState variant="permission" title="Access denied" />
{:else}
	<!-- Protected content -->
{/if}
```

## All Props

| Prop | Type | Default | Required |
|------|------|---------|----------|
| `variant` | `'no-results' \| 'no-content' \| 'error' \| 'permission' \| 'coming-soon'` | `'no-content'` | No |
| `title` | `string` | - | Yes |
| `description` | `string` | `undefined` | No |
| `icon` | `string` | Auto | No |
| `actionLabel` | `string` | `undefined` | No |
| `onAction` | `() => void` | `undefined` | No |
| `illustration` | `'search' \| 'create' \| 'error' \| 'lock' \| 'rocket' \| 'empty'` | `undefined` | No |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | No |
| `class` | `string` | `''` | No |

## Default Icons by Variant

- `no-results`: 🔍
- `no-content`: 📝
- `error`: ⚠️
- `permission`: 🔒
- `coming-soon`: 🚀

## Accessibility Features

✅ `role="status"` for state announcements
✅ `aria-live="polite"` for screen readers
✅ Semantic heading hierarchy
✅ Keyboard accessible buttons
✅ Proper color contrast
✅ Respects reduced motion preferences

## Tips

💡 Use `LoadingScreen` for loading states instead of EmptyState
💡 Keep titles under 5 words for clarity
💡 Descriptions should be 1-2 sentences max
💡 Always provide an actionable CTA when possible
💡 Use illustrations for better visual hierarchy
💡 Test in both light and dark modes
