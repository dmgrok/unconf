<script lang="ts">
	import { page } from '$app/stores';

	const sections = [
		{ id: 'getting-started', title: 'Getting Started', href: '/docs#getting-started' },
		{ id: 'participants', title: 'For Participants', href: '/docs#participants' },
		{ id: 'organizers', title: 'For Organizers', href: '/docs#organizers' },
		{ id: 'features', title: 'Features', href: '/docs#features' },
		{ id: 'troubleshooting', title: 'Troubleshooting', href: '/docs#troubleshooting' },
		{ id: 'faq', title: 'FAQ', href: '/docs#faq' }
	];

	let activeSection = $derived($page.url.hash.slice(1) || 'getting-started');
</script>

<svelte:head>
	<title>Documentation - UnConf Platform</title>
	<meta
		name="description"
		content="Complete documentation for the UnConf unconference management platform"
	/>
</svelte:head>

<div class="docs-container">
	<aside class="docs-sidebar">
		<nav>
			<h3>Documentation</h3>
			<ul>
				{#each sections as section}
					<li>
						<a
							href={section.href}
							class:active={activeSection === section.id}
							class="nav-link"
						>
							{section.title}
						</a>
					</li>
				{/each}
			</ul>
		</nav>
	</aside>

	<main class="docs-content">
		<article>
			<section id="getting-started" class="doc-section">
				<h1>Getting Started with UnConf</h1>
				<p class="lead">
					Welcome to UnConf! This guide will help you understand how to use the platform for your
					unconference events.
				</p>

				<h2>What is UnConf?</h2>
				<p>
					UnConf is a modern platform for managing unconference events. It provides real-time
					collaboration tools, weighted voting for topic prioritization, and interactive
					activities to enhance participant engagement.
				</p>

				<h2>Quick Start</h2>
				<div class="steps">
					<div class="step">
						<div class="step-number">1</div>
						<div class="step-content">
							<h3>Join an Event</h3>
							<p>Use the access code provided by your organizer or scan the QR code</p>
						</div>
					</div>

					<div class="step">
						<div class="step-number">2</div>
						<div class="step-content">
							<h3>Create Your Profile</h3>
							<p>Sign in with Google or continue as a guest</p>
						</div>
					</div>

					<div class="step">
						<div class="step-number">3</div>
						<div class="step-content">
							<h3>Participate</h3>
							<p>Submit topics, vote, and join discussions</p>
						</div>
					</div>
				</div>
			</section>

			<section id="participants" class="doc-section">
				<h1>For Participants</h1>

				<h2>Joining an Event</h2>
				<h3>Using an Access Code</h3>
				<ol>
					<li>Navigate to the homepage</li>
					<li>Click "Join Event"</li>
					<li>Enter the access code provided by your organizer</li>
					<li>Click "Join"</li>
				</ol>

				<h3>Using a QR Code</h3>
				<ol>
					<li>Open your camera app or QR code scanner</li>
					<li>Scan the QR code displayed by the organizer</li>
					<li>Follow the link to join the event</li>
				</ol>

				<h2>Submitting Topics</h2>
				<p>During the topic submission phase:</p>
				<ol>
					<li>Click "Propose Topic"</li>
					<li>Enter a clear, descriptive title</li>
					<li>Add details about what you'd like to discuss</li>
					<li>Add relevant tags (optional)</li>
					<li>Submit your topic</li>
				</ol>

				<div class="info-box">
					<strong>💡 Tip:</strong> Good topics are specific, actionable, and interesting to others.
					Example: "How to implement authentication in SvelteKit" rather than "Web development".
				</div>

				<h2>Voting on Topics</h2>
				<p>UnConf uses a weighted voting system:</p>
				<ul>
					<li><strong>First Choice (3 points):</strong> Your top priority</li>
					<li><strong>Second Choice (2 points):</strong> Very interested</li>
					<li><strong>Third Choice (1 point):</strong> Moderately interested</li>
				</ul>

				<h3>How to Vote</h3>
				<ol>
					<li>Browse the submitted topics</li>
					<li>Click on a topic to select it as first, second, or third choice</li>
					<li>You can change your votes anytime before voting closes</li>
					<li>Topics are ranked by total points received</li>
				</ol>

				<h2>Participating in Activities</h2>
				<p>Events include different activity types:</p>
				<ul>
					<li><strong>Voting:</strong> Submit and vote on discussion topics</li>
					<li><strong>Group Intelligence Games:</strong> Collaborative activities to build connections</li>
					<li><strong>Discussion Groups:</strong> Breakout discussions on selected topics</li>
					<li><strong>Team Distribution:</strong> Form teams for collaborative work</li>
				</ul>
			</section>

			<section id="organizers" class="doc-section">
				<h1>For Organizers</h1>

				<h2>Creating an Event</h2>
				<ol>
					<li>Sign in to your account</li>
					<li>Click "Create Event"</li>
					<li>Fill in event details (name, description, dates)</li>
					<li>Configure settings (capacity, features enabled)</li>
					<li>Click "Create" to generate your event</li>
				</ol>

				<h2>Event Configuration</h2>
				<h3>Basic Settings</h3>
				<ul>
					<li><strong>Event Name:</strong> Display name for your event</li>
					<li><strong>Description:</strong> Brief overview of the event</li>
					<li><strong>Access Code:</strong> Unique code for participants to join</li>
					<li><strong>Max Participants:</strong> Capacity limit (optional)</li>
				</ul>

				<h3>Feature Configuration</h3>
				<p>Enable or disable features based on your needs:</p>
				<ul>
					<li>Topic Voting</li>
					<li>Group Intelligence Games</li>
					<li>Discussion Groups</li>
					<li>Team Distribution</li>
				</ul>

				<h2>Managing Activities</h2>
				<h3>Switching Activities</h3>
				<ol>
					<li>Open the Organizer Dashboard</li>
					<li>Select the activity you want to activate</li>
					<li>Click "Switch Activity"</li>
					<li>All participants will see the new activity in real-time</li>
				</ol>

				<h3>Setting Timers</h3>
				<p>Control activity duration with timers:</p>
				<ol>
					<li>In the Organizer Dashboard, find the Timer section</li>
					<li>Set duration (minutes)</li>
					<li>Click "Start Timer"</li>
					<li>Timer is visible to all participants</li>
				</ol>

				<h2>Managing Participants</h2>
				<h3>Viewing Participants</h3>
				<p>Access the participant list to see:</p>
				<ul>
					<li>All registered participants</li>
					<li>Guest vs authenticated users</li>
					<li>Connection status</li>
					<li>Last active time</li>
				</ul>

				<h3>Managing Roles</h3>
				<p>You can upgrade guests to participants or assign co-organizer roles.</p>

				<h2>Monitoring Event Health</h2>
				<p>Track key metrics:</p>
				<ul>
					<li>Active participants</li>
					<li>Topics submitted</li>
					<li>Votes cast</li>
					<li>Engagement rates</li>
				</ul>
			</section>

			<section id="features" class="doc-section">
				<h1>Features</h1>

				<h2>Real-Time Collaboration</h2>
				<p>
					All changes sync instantly across all participants. When someone submits a topic, votes,
					or the organizer switches activities, everyone sees updates immediately.
				</p>

				<h2>Weighted Voting System</h2>
				<p>
					Our unique voting system gives participants three weighted votes (3, 2, 1 points) to
					express their preferences more nuancedly than simple up/down voting.
				</p>

				<h2>Group Intelligence Games</h2>
				<p>Interactive activities designed to:</p>
				<ul>
					<li>Break the ice between participants</li>
					<li>Build connections and trust</li>
					<li>Stimulate creative thinking</li>
					<li>Prepare for deeper discussions</li>
				</ul>

				<h2>Discussion Groups</h2>
				<p>Features include:</p>
				<ul>
					<li>Automatic room assignments based on votes</li>
					<li>Capacity management</li>
					<li>Manual overrides for organizers</li>
					<li>Real-time occupancy tracking</li>
				</ul>

				<h2>Team Distribution</h2>
				<p>Organize participants into balanced teams:</p>
				<ul>
					<li>Automatic distribution algorithms</li>
					<li>Custom team sizes</li>
					<li>Skill-based balancing (optional)</li>
					<li>Export team lists</li>
				</ul>

				<h2>Mobile Responsive</h2>
				<p>
					Fully optimized for mobile devices with touch-friendly interfaces, responsive layouts,
					and offline detection.
				</p>

				<h2>Internationalization</h2>
				<p>Support for multiple languages (currently English and French).</p>
			</section>

			<section id="troubleshooting" class="doc-section">
				<h1>Troubleshooting</h1>

				<h2>Connection Issues</h2>
				<h3>Not seeing real-time updates</h3>
				<ul>
					<li>Check your internet connection</li>
					<li>Refresh the page</li>
					<li>Look for the connection indicator (should be green)</li>
					<li>Try a different browser</li>
				</ul>

				<h3>Slow performance</h3>
				<ul>
					<li>Close unnecessary browser tabs</li>
					<li>Clear your browser cache</li>
					<li>Check your internet speed</li>
					<li>Try incognito/private mode</li>
				</ul>

				<h2>Voting Issues</h2>
				<h3>Can't submit vote</h3>
				<ul>
					<li>Verify voting is still open (check with organizer)</li>
					<li>Ensure you haven't exceeded vote limit</li>
					<li>Try refreshing the page</li>
					<li>Check your connection</li>
				</ul>

				<h3>Votes not appearing</h3>
				<ul>
					<li>Results may be hidden until voting closes</li>
					<li>Organizer controls result visibility</li>
					<li>Check if you're looking at the right event</li>
				</ul>

				<h2>Mobile Issues</h2>
				<h3>Text too small</h3>
				<ul>
					<li>Try landscape orientation</li>
					<li>Zoom in using browser controls</li>
					<li>Adjust device text size settings</li>
				</ul>

				<h3>Buttons not responding</h3>
				<ul>
					<li>Ensure you're tapping directly on buttons</li>
					<li>Try removing any screen protector</li>
					<li>Restart your browser</li>
				</ul>

				<h2>Getting Help</h2>
				<p>If you continue to experience issues:</p>
				<ol>
					<li>Press <kbd>?</kbd> to open the help panel</li>
					<li>Contact your event organizer</li>
					<li>Report a bug through the feedback form</li>
					<li>Check the FAQ section below</li>
				</ol>
			</section>

			<section id="faq" class="doc-section">
				<h1>Frequently Asked Questions</h1>

				<div class="faq-item">
					<h3>Do I need to create an account?</h3>
					<p>
						No, you can participate as a guest. However, signing in with Google provides a better
						experience and preserves your data across sessions.
					</p>
				</div>

				<div class="faq-item">
					<h3>Can I change my vote after submitting?</h3>
					<p>
						Yes! You can change your votes anytime before the voting phase ends. Simply click on a
						different topic to change your selection.
					</p>
				</div>

				<div class="faq-item">
					<h3>How are discussion groups assigned?</h3>
					<p>
						Groups are typically assigned based on your voting preferences. The system tries to
						match you with topics you voted for while balancing room capacity.
					</p>
				</div>

				<div class="faq-item">
					<h3>Can I join multiple events?</h3>
					<p>
						Yes, you can participate in multiple events. However, you can only be active in one
						event at a time.
					</p>
				</div>

				<div class="faq-item">
					<h3>Is my data private?</h3>
					<p>
						Your voting preferences are private until the organizer chooses to reveal results. Your
						name and email are only visible to event organizers.
					</p>
				</div>

				<div class="faq-item">
					<h3>Can I use this on mobile?</h3>
					<p>
						Yes! UnConf is fully optimized for mobile devices with touch-friendly interfaces and
						responsive design.
					</p>
				</div>

				<div class="faq-item">
					<h3>What browsers are supported?</h3>
					<p>
						UnConf works best on modern browsers: Chrome 80+, Firefox 80+, Safari 12+, and Edge
						80+. Mobile browsers are also supported.
					</p>
				</div>

				<div class="faq-item">
					<h3>How long is event data stored?</h3>
					<p>
						Event data is stored for 90 days after the event ends. You can request data deletion at
						any time.
					</p>
				</div>

				<div class="faq-item">
					<h3>Can I export event data?</h3>
					<p>
						Yes, organizers can export participant lists, voting results, and analytics data in
						various formats (CSV, JSON).
					</p>
				</div>

				<div class="faq-item">
					<h3>Is there a participant limit?</h3>
					<p>
						Organizers can set custom capacity limits. The platform can handle hundreds of
						concurrent participants per event.
					</p>
				</div>
			</section>
		</article>
	</main>
</div>

<style>
	.docs-container {
		display: flex;
		min-height: calc(100vh - 200px);
		max-width: 1400px;
		margin: 0 auto;
	}

	.docs-sidebar {
		width: 250px;
		padding: 2rem 1rem;
		border-right: 1px solid #e5e7eb;
		position: sticky;
		top: 80px;
		height: fit-content;
	}

	.docs-sidebar h3 {
		margin: 0 0 1rem 0;
		font-size: 1.25rem;
		font-weight: 700;
		color: #111827;
	}

	.docs-sidebar ul {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.docs-sidebar li {
		margin-bottom: 0.5rem;
	}

	.nav-link {
		display: block;
		padding: 0.5rem 0.75rem;
		color: #6b7280;
		text-decoration: none;
		border-radius: 6px;
		font-size: 0.9375rem;
		transition: all 0.2s ease;
	}

	.nav-link:hover {
		background: #f3f4f6;
		color: #111827;
	}

	.nav-link.active {
		background: #eff6ff;
		color: #2563eb;
		font-weight: 500;
	}

	.docs-content {
		flex: 1;
		padding: 2rem;
		max-width: 900px;
	}

	.doc-section {
		margin-bottom: 4rem;
		padding-top: 2rem;
		border-top: 1px solid #f3f4f6;
	}

	.doc-section:first-child {
		border-top: none;
		padding-top: 0;
	}

	.doc-section h1 {
		font-size: 2.5rem;
		font-weight: 700;
		margin: 0 0 1rem 0;
		color: #111827;
	}

	.doc-section h2 {
		font-size: 1.75rem;
		font-weight: 600;
		margin: 2rem 0 1rem 0;
		color: #111827;
	}

	.doc-section h3 {
		font-size: 1.25rem;
		font-weight: 600;
		margin: 1.5rem 0 0.75rem 0;
		color: #374151;
	}

	.lead {
		font-size: 1.125rem;
		color: #6b7280;
		line-height: 1.75;
		margin-bottom: 2rem;
	}

	p {
		line-height: 1.7;
		color: #4b5563;
		margin: 0 0 1rem 0;
	}

	ul,
	ol {
		line-height: 1.7;
		color: #4b5563;
		margin: 0 0 1rem 0;
		padding-left: 1.75rem;
	}

	li {
		margin: 0.5rem 0;
	}

	.steps {
		display: grid;
		gap: 1.5rem;
		margin: 2rem 0;
	}

	.step {
		display: flex;
		gap: 1rem;
		padding: 1.5rem;
		background: #f9fafb;
		border-radius: 12px;
		border: 1px solid #e5e7eb;
	}

	.step-number {
		width: 40px;
		height: 40px;
		border-radius: 50%;
		background: #3b82f6;
		color: white;
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 700;
		font-size: 1.25rem;
		flex-shrink: 0;
	}

	.step-content h3 {
		margin: 0 0 0.5rem 0;
		font-size: 1.125rem;
		color: #111827;
	}

	.step-content p {
		margin: 0;
		color: #6b7280;
	}

	.info-box {
		padding: 1rem 1.25rem;
		background: #eff6ff;
		border-left: 4px solid #3b82f6;
		border-radius: 6px;
		margin: 1.5rem 0;
		font-size: 0.9375rem;
	}

	.info-box strong {
		color: #1e40af;
	}

	.faq-item {
		margin-bottom: 2rem;
		padding-bottom: 2rem;
		border-bottom: 1px solid #f3f4f6;
	}

	.faq-item:last-child {
		border-bottom: none;
	}

	.faq-item h3 {
		margin: 0 0 0.75rem 0;
		color: #111827;
		font-size: 1.125rem;
	}

	.faq-item p {
		margin: 0;
		color: #6b7280;
	}

	kbd {
		padding: 0.125rem 0.375rem;
		background: #f3f4f6;
		border: 1px solid #d1d5db;
		border-radius: 4px;
		font-family: monospace;
		font-size: 0.875rem;
		color: #374151;
	}

	@media (max-width: 1024px) {
		.docs-sidebar {
			display: none;
		}

		.docs-content {
			padding: 1.5rem 1rem;
		}
	}

	@media (max-width: 768px) {
		.doc-section h1 {
			font-size: 2rem;
		}

		.doc-section h2 {
			font-size: 1.5rem;
		}

		.step {
			flex-direction: column;
		}

		.step-number {
			width: 32px;
			height: 32px;
			font-size: 1rem;
		}
	}
</style>
