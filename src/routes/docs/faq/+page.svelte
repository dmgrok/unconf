<script lang="ts">
	interface FAQItem {
		id: string;
		question: string;
		answer: string;
		category: string;
		keywords: string[];
	}

	const faqItems: FAQItem[] = [
		{
			id: '1',
			question: 'How do I join an event?',
			answer:
				'You can join an event using an access code provided by your organizer. Click "Join Event" on the homepage, enter the code, and click join. Alternatively, scan the QR code if available.',
			category: 'Getting Started',
			keywords: ['join', 'access code', 'qr code', 'start']
		},
		{
			id: '2',
			question: 'Do I need to create an account?',
			answer:
				'No, you can participate as a guest without creating an account. However, signing in with Google provides additional features and saves your preferences.',
			category: 'Getting Started',
			keywords: ['account', 'sign in', 'guest', 'registration']
		},
		{
			id: '3',
			question: 'How does the voting system work?',
			answer:
				'UnConf uses weighted voting where you allocate 3 points to your first choice, 2 points to your second choice, and 1 point to your third choice. This helps prioritize topics more effectively than simple up/down voting.',
			category: 'Voting',
			keywords: ['vote', 'voting', 'points', 'weighted', 'priority']
		},
		{
			id: '4',
			question: 'Can I change my vote after submitting?',
			answer:
				'Yes! You can change your votes anytime before the voting phase closes. Simply click on a different topic to reassign your vote.',
			category: 'Voting',
			keywords: ['change vote', 'edit vote', 'modify', 'update']
		},
		{
			id: '5',
			question: 'Why can\'t I see voting results?',
			answer:
				'Voting results may be hidden by the organizer until voting closes. This prevents bias and ensures all participants vote based on their genuine interests.',
			category: 'Voting',
			keywords: ['results', 'hidden', 'see votes', 'display']
		},
		{
			id: '6',
			question: 'How are discussion groups assigned?',
			answer:
				'Discussion groups are typically assigned based on your voting preferences. The system attempts to place you in discussions for topics you voted for while managing room capacity and balance.',
			category: 'Discussion Groups',
			keywords: ['assignment', 'groups', 'rooms', 'matching']
		},
		{
			id: '7',
			question: 'Can I switch discussion groups?',
			answer:
				'Usually, group assignments are fixed to ensure balanced discussions. However, organizers may enable group switching or manual overrides in some cases.',
			category: 'Discussion Groups',
			keywords: ['switch', 'change group', 'room', 'move']
		},
		{
			id: '8',
			question: 'What if I lose my internet connection?',
			answer:
				'The app will display a connection warning and attempt to reconnect automatically. Your votes and submissions are saved, but you may need to refresh the page if the connection is lost for an extended period.',
			category: 'Technical',
			keywords: ['connection', 'internet', 'offline', 'disconnect']
		},
		{
			id: '9',
			question: 'Which browsers are supported?',
			answer:
				'UnConf works best on modern browsers: Chrome 80+, Firefox 80+, Safari 12+, and Edge 80+. Mobile browsers (iOS Safari, Chrome Android) are also fully supported.',
			category: 'Technical',
			keywords: ['browser', 'compatibility', 'support', 'chrome', 'firefox', 'safari']
		},
		{
			id: '10',
			question: 'Can I use UnConf on my phone?',
			answer:
				'Yes! UnConf is fully optimized for mobile devices with touch-friendly interfaces, responsive layouts, and mobile-specific navigation patterns.',
			category: 'Technical',
			keywords: ['mobile', 'phone', 'tablet', 'responsive', 'ios', 'android']
		},
		{
			id: '11',
			question: 'Is my voting data private?',
			answer:
				'Yes, your individual votes are private until the organizer chooses to reveal results. Only aggregated voting scores are typically visible to participants.',
			category: 'Privacy',
			keywords: ['privacy', 'private', 'security', 'data', 'votes']
		},
		{
			id: '12',
			question: 'How long is my data stored?',
			answer:
				'Event data is stored for 90 days after the event ends. Guest accounts are removed after 7 days of inactivity. You can request data deletion at any time.',
			category: 'Privacy',
			keywords: ['data storage', 'retention', 'deletion', 'remove']
		},
		{
			id: '13',
			question: 'How do I create an event as an organizer?',
			answer:
				'Sign in to your account, click "Create Event", fill in event details (name, description, capacity), configure settings, and click create. You\'ll receive a unique access code to share with participants.',
			category: 'Organizers',
			keywords: ['create event', 'organizer', 'setup', 'new event']
		},
		{
			id: '14',
			question: 'Can I have multiple organizers for one event?',
			answer:
				'Currently, each event has one primary organizer. However, you can assign participant management privileges to other users to help manage the event.',
			category: 'Organizers',
			keywords: ['co-organizer', 'multiple', 'admin', 'helpers']
		},
		{
			id: '15',
			question: 'How do I export event data?',
			answer:
				'Organizers can export participant lists, voting results, and analytics from the organizer dashboard. Data can be exported in CSV or JSON formats.',
			category: 'Organizers',
			keywords: ['export', 'download', 'data', 'csv', 'json']
		}
	];

	let searchQuery = $state('');
	let selectedCategory = $state<string | null>(null);

	const categories = $derived([...new Set(faqItems.map((item) => item.category))]);

	const filteredFAQs = $derived(
		faqItems.filter((item) => {
			const matchesSearch =
				!searchQuery ||
				item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
				item.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
				item.keywords.some((keyword) =>
					keyword.toLowerCase().includes(searchQuery.toLowerCase())
				);

			const matchesCategory = !selectedCategory || item.category === selectedCategory;

			return matchesSearch && matchesCategory;
		})
	);

	let expandedItems = $state<Set<string>>(new Set());

	function toggleItem(id: string) {
		if (expandedItems.has(id)) {
			expandedItems.delete(id);
		} else {
			expandedItems.add(id);
		}
		expandedItems = new Set(expandedItems);
	}
</script>

<svelte:head>
	<title>FAQ - Frequently Asked Questions - UnConf</title>
	<meta name="description" content="Frequently asked questions about the UnConf platform" />
</svelte:head>

<div class="faq-container">
	<header class="faq-header">
		<h1>Frequently Asked Questions</h1>
		<p>Find answers to common questions about using UnConf</p>
	</header>

	<div class="faq-search-section">
		<div class="search-box">
			<svg class="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
				<circle cx="11" cy="11" r="8" stroke-width="2" />
				<path d="m21 21-4.35-4.35" stroke-width="2" stroke-linecap="round" />
			</svg>
			<input
				type="search"
				bind:value={searchQuery}
				placeholder="Search FAQs..."
				class="search-input"
			/>
		</div>

		<div class="category-filters">
			<button
				class="category-btn"
				class:active={!selectedCategory}
				onclick={() => (selectedCategory = null)}
			>
				All
			</button>
			{#each categories as category}
				<button
					class="category-btn"
					class:active={selectedCategory === category}
					onclick={() => (selectedCategory = category)}
				>
					{category}
				</button>
			{/each}
		</div>
	</div>

	<div class="faq-list">
		{#if filteredFAQs.length === 0}
			<div class="no-results">
				<p>No FAQ items found matching your search.</p>
				<button onclick={() => { searchQuery = ''; selectedCategory = null; }} class="reset-btn">
					Reset filters
				</button>
			</div>
		{:else}
			{#each filteredFAQs as item (item.id)}
				<div class="faq-item">
					<button class="faq-question" onclick={() => toggleItem(item.id)}>
						<span class="question-text">{item.question}</span>
						<svg
							class="expand-icon"
							class:expanded={expandedItems.has(item.id)}
							width="20"
							height="20"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="m6 9 6 6 6-6"
							/>
						</svg>
					</button>

					{#if expandedItems.has(item.id)}
						<div class="faq-answer">
							<p>{item.answer}</p>
							<span class="category-badge">{item.category}</span>
						</div>
					{/if}
				</div>
			{/each}
		{/if}
	</div>

	<div class="faq-footer">
		<h3>Still have questions?</h3>
		<p>Can't find what you're looking for? Contact your event organizer or check our <a href="/docs">full documentation</a>.</p>
	</div>
</div>

<style>
	.faq-container {
		max-width: 900px;
		margin: 0 auto;
		padding: 2rem 1rem;
	}

	.faq-header {
		text-align: center;
		margin-bottom: 3rem;
	}

	.faq-header h1 {
		font-size: 2.5rem;
		font-weight: 700;
		margin: 0 0 0.5rem 0;
		color: #111827;
	}

	.faq-header p {
		font-size: 1.125rem;
		color: #6b7280;
		margin: 0;
	}

	.faq-search-section {
		margin-bottom: 2rem;
	}

	.search-box {
		position: relative;
		margin-bottom: 1.5rem;
	}

	.search-icon {
		position: absolute;
		left: 1rem;
		top: 50%;
		transform: translateY(-50%);
		color: #9ca3af;
		pointer-events: none;
	}

	.search-input {
		width: 100%;
		padding: 0.875rem 1rem 0.875rem 3rem;
		border: 2px solid #e5e7eb;
		border-radius: 12px;
		font-size: 1rem;
		transition: border-color 0.2s ease;
	}

	.search-input:focus {
		outline: none;
		border-color: #3b82f6;
	}

	.category-filters {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
	}

	.category-btn {
		padding: 0.5rem 1rem;
		background: white;
		border: 2px solid #e5e7eb;
		border-radius: 8px;
		font-size: 0.9375rem;
		font-weight: 500;
		color: #6b7280;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.category-btn:hover {
		border-color: #d1d5db;
		color: #374151;
	}

	.category-btn.active {
		background: #3b82f6;
		border-color: #3b82f6;
		color: white;
	}

	.faq-list {
		margin-bottom: 3rem;
	}

	.faq-item {
		background: white;
		border: 1px solid #e5e7eb;
		border-radius: 12px;
		margin-bottom: 1rem;
		overflow: hidden;
		transition: box-shadow 0.2s ease;
	}

	.faq-item:hover {
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
	}

	.faq-question {
		width: 100%;
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1.25rem 1.5rem;
		background: transparent;
		border: none;
		text-align: left;
		cursor: pointer;
		font-size: 1.0625rem;
		font-weight: 600;
		color: #111827;
		transition: background 0.2s ease;
	}

	.faq-question:hover {
		background: #f9fafb;
	}

	.question-text {
		flex: 1;
		padding-right: 1rem;
	}

	.expand-icon {
		color: #9ca3af;
		transition: transform 0.2s ease;
		flex-shrink: 0;
	}

	.expand-icon.expanded {
		transform: rotate(180deg);
	}

	.faq-answer {
		padding: 0 1.5rem 1.5rem 1.5rem;
		color: #4b5563;
		line-height: 1.6;
	}

	.faq-answer p {
		margin: 0 0 1rem 0;
	}

	.category-badge {
		display: inline-block;
		padding: 0.25rem 0.75rem;
		background: #eff6ff;
		color: #2563eb;
		border-radius: 12px;
		font-size: 0.8125rem;
		font-weight: 500;
	}

	.no-results {
		text-align: center;
		padding: 3rem 1.5rem;
		background: #f9fafb;
		border-radius: 12px;
		color: #6b7280;
	}

	.reset-btn {
		margin-top: 1rem;
		padding: 0.5rem 1.5rem;
		background: #3b82f6;
		color: white;
		border: none;
		border-radius: 8px;
		font-size: 0.9375rem;
		font-weight: 500;
		cursor: pointer;
		transition: background 0.2s ease;
	}

	.reset-btn:hover {
		background: #2563eb;
	}

	.faq-footer {
		text-align: center;
		padding: 2rem;
		background: #f9fafb;
		border-radius: 12px;
	}

	.faq-footer h3 {
		margin: 0 0 0.5rem 0;
		font-size: 1.25rem;
		font-weight: 600;
		color: #111827;
	}

	.faq-footer p {
		margin: 0;
		color: #6b7280;
	}

	.faq-footer a {
		color: #3b82f6;
		text-decoration: none;
		font-weight: 500;
	}

	.faq-footer a:hover {
		text-decoration: underline;
	}

	@media (max-width: 768px) {
		.faq-header h1 {
			font-size: 2rem;
		}

		.category-filters {
			gap: 0.5rem;
		}

		.category-btn {
			padding: 0.5rem 0.75rem;
			font-size: 0.875rem;
		}

		.faq-question {
			padding: 1rem;
			font-size: 1rem;
		}

		.faq-answer {
			padding: 0 1rem 1rem 1rem;
			font-size: 0.9375rem;
		}
	}
</style>
