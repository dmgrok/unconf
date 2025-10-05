<script lang="ts">
	import { FileText, Gamepad2, MessageSquare, Users } from 'lucide-svelte';
	import DocsLayout from '$lib/components/docs/DocsLayout.svelte';
	import CodeBlock from '$lib/components/docs/CodeBlock.svelte';
	import Callout from '$lib/components/docs/Callout.svelte';

	const sections = [
		{
			title: 'Getting Started',
			items: [
				{ title: 'Introduction', href: '/docs' },
				{ title: 'Quick Start', href: '/docs#quick-start' },
				{ title: 'Installation', href: '/docs#installation' }
			]
		},
		{
			title: 'For Participants',
			items: [
				{ title: 'Joining Events', href: '/docs#joining-events' },
				{ title: 'Submitting Topics', href: '/docs#submitting-topics' },
				{ title: 'Voting', href: '/docs#voting' },
				{ title: 'Activities', href: '/docs#activities' }
			]
		},
		{
			title: 'For Organizers',
			items: [
				{ title: 'Creating Events', href: '/docs#creating-events' },
				{ title: 'Managing Activities', href: '/docs#managing-activities' },
				{ title: 'Participant Management', href: '/docs#participant-management' }
			]
		},
		{
			title: 'Resources',
			items: [
				{ title: 'FAQ', href: '/docs/faq' },
				{ title: 'Troubleshooting', href: '/docs/troubleshooting' },
				{ title: 'API Reference', href: '/docs/api' }
			]
		}
	];
</script>

<svelte:head>
	<title>Documentation - UnConf Platform</title>
	<meta
		name="description"
		content="Complete documentation for the UnConf unconference management platform"
	/>
</svelte:head>

<DocsLayout
	title="UnConf Documentation"
	description="Everything you need to know about running successful unconferences with UnConf"
	{sections}
>
	<!-- Introduction -->
	<section id="introduction">
		<h2>What is UnConf?</h2>
		<p>
			UnConf is a modern, real-time platform designed specifically for managing unconference
			events. It provides an engaging, collaborative experience for participants while giving
			organizers powerful tools to facilitate dynamic, participant-driven events.
		</p>

		<h3>Key Features</h3>
		<ul>
			<li>Real-time collaboration and synchronization across all participants</li>
			<li>Weighted voting system for prioritizing discussion topics</li>
			<li>Interactive group intelligence games for icebreaking</li>
			<li>Automated discussion group assignments</li>
			<li>Team distribution and management tools</li>
			<li>Mobile-responsive design for seamless participation</li>
			<li>Multi-language support</li>
		</ul>

		<Callout type="tip" title="Perfect for">
			<p>
				Tech conferences, community meetups, corporate retreats, academic workshops, and any
				event where participants drive the agenda.
			</p>
		</Callout>
	</section>

	<!-- Quick Start -->
	<section id="quick-start">
		<h2>Quick Start</h2>
		<p>Get up and running with UnConf in just a few minutes.</p>

		<h3>For Participants</h3>
		<div class="steps-grid">
			<div class="step-card">
				<div class="step-number">1</div>
				<h4>Join Event</h4>
				<p>Use your access code or scan the QR code provided by the organizer</p>
			</div>

			<div class="step-card">
				<div class="step-number">2</div>
				<h4>Create Profile</h4>
				<p>Sign in with Google or continue as a guest</p>
			</div>

			<div class="step-card">
				<div class="step-number">3</div>
				<h4>Participate</h4>
				<p>Submit topics, vote, and join discussions</p>
			</div>
		</div>

		<h3>For Organizers</h3>
		<div class="steps-grid">
			<div class="step-card">
				<div class="step-number">1</div>
				<h4>Create Event</h4>
				<p>Sign in and create your unconference event</p>
			</div>

			<div class="step-card">
				<div class="step-number">2</div>
				<h4>Configure</h4>
				<p>Set up activities, timers, and participant limits</p>
			</div>

			<div class="step-card">
				<div class="step-number">3</div>
				<h4>Share</h4>
				<p>Distribute access code or QR code to participants</p>
			</div>
		</div>
	</section>

	<!-- Installation -->
	<section id="installation">
		<h2>Installation</h2>
		<p>UnConf is a web-based platform - no installation required for participants!</p>

		<Callout type="info">
			<p>
				Simply visit the event URL or scan the QR code to participate. The platform works on
				all modern browsers including Chrome, Firefox, Safari, and Edge.
			</p>
		</Callout>

		<h3>Self-Hosting (Advanced)</h3>
		<p>
			Want to run your own instance of UnConf? Clone the repository and follow the setup
			instructions:
		</p>

		<CodeBlock
			language="bash"
			code={`# Clone the repository
git clone https://github.com/yourusername/unconf.git
cd unconf

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env

# Run development server
npm run dev`}
		/>

		<Callout type="warning" title="Prerequisites">
			<p>Self-hosting requires Node.js 18+ and a PostgreSQL database.</p>
		</Callout>
	</section>

	<!-- Joining Events -->
	<section id="joining-events">
		<h2>Joining Events</h2>
		<p>There are two ways to join an UnConf event:</p>

		<h3>Using an Access Code</h3>
		<ol>
			<li>Navigate to the UnConf homepage</li>
			<li>Click the "Join Event" button</li>
			<li>Enter the 6-digit access code provided by your organizer</li>
			<li>Click "Join" to enter the event</li>
		</ol>

		<h3>Using a QR Code</h3>
		<ol>
			<li>Open your phone's camera or QR code scanner</li>
			<li>Scan the QR code displayed by the organizer</li>
			<li>Tap the notification/link to open UnConf</li>
			<li>You'll be automatically joined to the event</li>
		</ol>

		<Callout type="tip" title="Pro Tip">
			<p>
				QR codes are faster for in-person events, while access codes are better for remote
				participants or sharing via email/chat.
			</p>
		</Callout>
	</section>

	<!-- Submitting Topics -->
	<section id="submitting-topics">
		<h2>Submitting Topics</h2>
		<p>
			During the topic submission phase, participants can propose discussion topics for the
			unconference.
		</p>

		<h3>How to Submit a Topic</h3>
		<ol>
			<li>Click the "Propose Topic" button</li>
			<li>Enter a clear, descriptive title (max 100 characters)</li>
			<li>Add details about what you'd like to discuss</li>
			<li>Optionally add tags for categorization</li>
			<li>Click "Submit"</li>
		</ol>

		<h3>Writing Great Topics</h3>
		<p>Good topics are:</p>
		<ul>
			<li><strong>Specific</strong> - Focus on a clear subject rather than broad themes</li>
			<li><strong>Actionable</strong> - Frame as questions or discussion points</li>
			<li><strong>Interesting</strong> - Relevant to your audience</li>
			<li><strong>Concise</strong> - Get to the point quickly</li>
		</ul>

		<div class="example-box">
			<div class="example-good">
				<h4>Good Examples</h4>
				<ul>
					<li>"How can we implement authentication in SvelteKit apps?"</li>
					<li>"What are the best practices for API rate limiting?"</li>
					<li>"Strategies for mentoring junior developers remotely"</li>
				</ul>
			</div>
			<div class="example-bad">
				<h4>Could Be Better</h4>
				<ul>
					<li>"Web development" (too broad)</li>
					<li>"My new project" (not clear)</li>
					<li>"Anyone interested in AI?" (not specific enough)</li>
				</ul>
			</div>
		</div>
	</section>

	<!-- Voting -->
	<section id="voting">
		<h2>Voting on Topics</h2>
		<p>
			UnConf uses a weighted voting system that allows you to express the strength of your
			preferences.
		</p>

		<h3>How Weighted Voting Works</h3>
		<p>You have three weighted votes to allocate:</p>

		<div class="vote-explanation">
			<div class="vote-tier">
				<div class="vote-badge first">3 Points</div>
				<h4>First Choice</h4>
				<p>Your absolute top priority - the topic you most want to discuss</p>
			</div>

			<div class="vote-tier">
				<div class="vote-badge second">2 Points</div>
				<h4>Second Choice</h4>
				<p>Very interested - would definitely attend this discussion</p>
			</div>

			<div class="vote-tier">
				<div class="vote-badge third">1 Point</div>
				<h4>Third Choice</h4>
				<p>Moderately interested - would join if available</p>
			</div>
		</div>

		<h3>Voting Tips</h3>
		<Callout type="tip">
			<ul>
				<li>You can change your votes anytime before voting closes</li>
				<li>Think strategically - your votes help determine which topics get discussed</li>
				<li>Consider topics where you can contribute, not just ones you want to learn about</li>
			</ul>
		</Callout>

		<h3>How Topics Are Ranked</h3>
		<p>
			Topics are ranked by total points received. For example, a topic with 5 first-choice
			votes (15 points) ranks higher than one with 10 third-choice votes (10 points).
		</p>
	</section>

	<!-- Activities -->
	<section id="activities">
		<h2>Participating in Activities</h2>
		<p>UnConf events include various activity types that the organizer can switch between:</p>

		<div class="activity-grid">
			<div class="activity-card">
				<div class="activity-icon">
					<FileText size={32} />
				</div>
				<h4>Topic Voting</h4>
				<p>Submit and vote on discussion topics using the weighted voting system</p>
			</div>

			<div class="activity-card">
				<div class="activity-icon">
					<Gamepad2 size={32} />
				</div>
				<h4>Group Intelligence Games</h4>
				<p>Collaborative activities like Word Chain to build connections and break the ice</p>
			</div>

			<div class="activity-card">
				<div class="activity-icon">
					<MessageSquare size={32} />
				</div>
				<h4>Discussion Groups</h4>
				<p>Join breakout discussions on selected topics with automatic room assignments</p>
			</div>

			<div class="activity-card">
				<div class="activity-icon">
					<Users size={32} />
				</div>
				<h4>Team Distribution</h4>
				<p>Form balanced teams for collaborative work or group projects</p>
			</div>
		</div>

		<Callout type="info" title="Real-time Updates">
			<p>
				When the organizer switches activities, you'll see the change immediately - no need
				to refresh!
			</p>
		</Callout>
	</section>

	<!-- Creating Events -->
	<section id="creating-events">
		<h2>Creating Events (Organizers)</h2>
		<p>As an organizer, you have full control over your unconference event.</p>

		<h3>Event Creation Steps</h3>
		<ol>
			<li>Sign in to your account (Google authentication required)</li>
			<li>Click "Create Event" from the dashboard</li>
			<li>Fill in basic information:
				<ul>
					<li>Event name</li>
					<li>Description</li>
					<li>Date and time</li>
					<li>Maximum participants (optional)</li>
				</ul>
			</li>
			<li>Configure features and activities</li>
			<li>Click "Create Event"</li>
		</ol>

		<h3>Event Configuration Options</h3>

		<table class="config-table">
			<thead>
				<tr>
					<th>Setting</th>
					<th>Description</th>
					<th>Default</th>
				</tr>
			</thead>
			<tbody>
				<tr>
					<td>Max Participants</td>
					<td>Limit total number of participants</td>
					<td>Unlimited</td>
				</tr>
				<tr>
					<td>Guest Access</td>
					<td>Allow non-authenticated users to join</td>
					<td>Enabled</td>
				</tr>
				<tr>
					<td>Topic Voting</td>
					<td>Enable/disable topic submission and voting</td>
					<td>Enabled</td>
				</tr>
				<tr>
					<td>Group Games</td>
					<td>Enable/disable group intelligence games</td>
					<td>Enabled</td>
				</tr>
				<tr>
					<td>Discussion Groups</td>
					<td>Enable/disable discussion group assignments</td>
					<td>Enabled</td>
				</tr>
			</tbody>
		</table>

		<Callout type="success" title="After Creation">
			<p>
				You'll receive a unique access code and QR code to share with participants. These can
				be displayed on screen or sent via email/chat.
			</p>
		</Callout>
	</section>

	<!-- Managing Activities -->
	<section id="managing-activities">
		<h2>Managing Activities (Organizers)</h2>
		<p>Control the flow of your event by switching between activities and managing timers.</p>

		<h3>Switching Activities</h3>
		<ol>
			<li>Open the Organizer Dashboard</li>
			<li>In the Activity Control panel, select the desired activity</li>
			<li>Click "Switch to [Activity]"</li>
			<li>All participants see the new activity instantly</li>
		</ol>

		<h3>Using Timers</h3>
		<p>Keep activities on track with visible countdown timers:</p>

		<CodeBlock
			language="text"
			code={`1. Select an activity
2. Click "Set Timer"
3. Enter duration (e.g., "15" for 15 minutes)
4. Click "Start Timer"
5. Timer is visible to all participants`}
		/>

		<Callout type="tip" title="Best Practices">
			<ul>
				<li>Start with a group intelligence game to break the ice (5-10 min)</li>
				<li>Allow 10-15 minutes for topic submission</li>
				<li>Give 5-10 minutes for voting</li>
				<li>Discussion groups typically run 20-45 minutes</li>
			</ul>
		</Callout>
	</section>

	<!-- Participant Management -->
	<section id="participant-management">
		<h2>Participant Management (Organizers)</h2>
		<p>Monitor and manage your event participants from the organizer dashboard.</p>

		<h3>Viewing Participants</h3>
		<p>The participant list shows:</p>
		<ul>
			<li>Name and email (for authenticated users)</li>
			<li>Guest vs. authenticated status</li>
			<li>Connection status (online/offline)</li>
			<li>Last active timestamp</li>
			<li>Current activity participation</li>
		</ul>

		<h3>Participant Actions</h3>
		<ul>
			<li><strong>Promote to Co-organizer:</strong> Grant organizer privileges to helpers</li>
			<li><strong>Remove from Event:</strong> Remove disruptive participants</li>
			<li><strong>Reset Votes:</strong> Clear a participant's votes if needed</li>
			<li><strong>Reassign Group:</strong> Manually change discussion group assignments</li>
		</ul>

		<Callout type="warning" title="Privacy Note">
			<p>
				Participant voting preferences are private by default. You can choose to reveal
				results publicly after voting closes.
			</p>
		</Callout>
	</section>
</DocsLayout>

<style>
	/* Steps Grid */
	.steps-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: 1.5rem;
		margin: 2rem 0;
	}

	.step-card {
		padding: 1.5rem;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		border-radius: 12px;
		color: white;
		text-align: center;
	}

	.step-number {
		width: 48px;
		height: 48px;
		margin: 0 auto 1rem;
		background: rgba(255, 255, 255, 0.2);
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1.5rem;
		font-weight: 700;
	}

	.step-card h4 {
		margin: 0 0 0.5rem 0;
		font-size: 1.125rem;
		color: white;
	}

	.step-card p {
		margin: 0;
		color: rgba(255, 255, 255, 0.9);
		font-size: 0.9375rem;
	}

	/* Example Boxes */
	.example-box {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1.5rem;
		margin: 1.5rem 0;
	}

	.example-good,
	.example-bad {
		padding: 1.25rem;
		border-radius: 12px;
	}

	.example-good {
		background: #f0fdf4;
		border: 2px solid #10b981;
	}

	.example-good h4 {
		color: #047857;
		margin: 0 0 1rem 0;
	}

	.example-bad {
		background: #fef2f2;
		border: 2px solid #ef4444;
	}

	.example-bad h4 {
		color: #b91c1c;
		margin: 0 0 1rem 0;
	}

	.example-box ul {
		margin: 0;
		padding-left: 1.5rem;
	}

	.example-box li {
		margin: 0.5rem 0;
	}

	/* Vote Explanation */
	.vote-explanation {
		display: grid;
		gap: 1rem;
		margin: 2rem 0;
	}

	.vote-tier {
		padding: 1.25rem;
		background: #f9fafb;
		border-radius: 12px;
		border-left: 4px solid;
	}

	.vote-tier:nth-child(1) {
		border-color: #3b82f6;
	}

	.vote-tier:nth-child(2) {
		border-color: #8b5cf6;
	}

	.vote-tier:nth-child(3) {
		border-color: #ec4899;
	}

	.vote-badge {
		display: inline-block;
		padding: 0.25rem 0.75rem;
		border-radius: 6px;
		font-size: 0.875rem;
		font-weight: 700;
		color: white;
		margin-bottom: 0.75rem;
	}

	.vote-badge.first {
		background: #3b82f6;
	}

	.vote-badge.second {
		background: #8b5cf6;
	}

	.vote-badge.third {
		background: #ec4899;
	}

	.vote-tier h4 {
		margin: 0 0 0.5rem 0;
		color: #111827;
	}

	.vote-tier p {
		margin: 0;
		color: #6b7280;
		font-size: 0.9375rem;
	}

	/* Activity Grid */
	.activity-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
		gap: 1.5rem;
		margin: 2rem 0;
	}

	.activity-card {
		padding: 1.5rem;
		background: white;
		border: 2px solid #e5e7eb;
		border-radius: 12px;
		text-align: center;
		transition: all 0.2s ease;
	}

	.activity-card:hover {
		border-color: #3b82f6;
		box-shadow: 0 8px 24px rgba(59, 130, 246, 0.1);
	}

	.activity-icon {
		font-size: 2.5rem;
		margin-bottom: 1rem;
	}

	.activity-card h4 {
		margin: 0 0 0.5rem 0;
		color: #111827;
	}

	.activity-card p {
		margin: 0;
		color: #6b7280;
		font-size: 0.9375rem;
	}

	/* Config Table */
	.config-table {
		width: 100%;
		border-collapse: collapse;
		margin: 1.5rem 0;
		background: white;
		border-radius: 12px;
		overflow: hidden;
		border: 1px solid #e5e7eb;
	}

	.config-table th,
	.config-table td {
		padding: 0.875rem 1rem;
		text-align: left;
	}

	.config-table thead {
		background: #f9fafb;
	}

	.config-table th {
		font-size: 0.875rem;
		font-weight: 600;
		color: #374151;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.config-table td {
		font-size: 0.9375rem;
		color: #4b5563;
		border-top: 1px solid #e5e7eb;
	}

	.config-table tbody tr:hover {
		background: #f9fafb;
	}

	@media (max-width: 768px) {
		.example-box {
			grid-template-columns: 1fr;
		}

		.config-table {
			font-size: 0.875rem;
		}

		.config-table th,
		.config-table td {
			padding: 0.75rem;
		}
	}
</style>
