<script lang="ts">
	import { Plug, Vote, Zap, Lock, Smartphone, UserCircle } from 'lucide-svelte';
	import DocsLayout from '$lib/components/docs/DocsLayout.svelte';
	import Callout from '$lib/components/docs/Callout.svelte';
	import CodeBlock from '$lib/components/docs/CodeBlock.svelte';

	const sections = [
		{
			title: 'Getting Started',
			items: [
				{ title: 'Introduction', href: '/docs' },
				{ title: 'Quick Start', href: '/docs#quick-start' }
			]
		},
		{
			title: 'For Participants',
			items: [
				{ title: 'Joining Events', href: '/docs#joining-events' },
				{ title: 'Voting', href: '/docs#voting' }
			]
		},
		{
			title: 'For Organizers',
			items: [
				{ title: 'Creating Events', href: '/docs#creating-events' },
				{ title: 'Managing Activities', href: '/docs#managing-activities' }
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

	let expandedSections = $state<Set<string>>(new Set());

	function toggleSection(id: string) {
		if (expandedSections.has(id)) {
			expandedSections.delete(id);
		} else {
			expandedSections.add(id);
		}
		expandedSections = new Set(expandedSections);
	}
</script>

<svelte:head>
	<title>Troubleshooting Guide - UnConf Documentation</title>
	<meta
		name="description"
		content="Troubleshooting guide for common issues with the UnConf platform"
	/>
</svelte:head>

<DocsLayout
	title="Troubleshooting Guide"
	description="Step-by-step solutions for common issues with UnConf"
	{sections}
	showTableOfContents={true}
>
	<!-- Quick Diagnostics -->
	<section id="quick-diagnostics">
		<h2>Quick Diagnostics</h2>
		<p>Start here to identify your issue quickly:</p>

		<div class="diagnostic-grid">
			<a href="#connection-issues" class="diagnostic-card">
				<div class="diagnostic-icon">
					<Plug size={32} />
				</div>
				<h4>Connection Issues</h4>
				<p>Not seeing updates, disconnected, or offline</p>
			</a>

			<a href="#voting-issues" class="diagnostic-card">
				<div class="diagnostic-icon">
					<Vote size={32} />
				</div>
				<h4>Voting Problems</h4>
				<p>Can't vote, votes not counting, or missing results</p>
			</a>

			<a href="#performance-issues" class="diagnostic-card">
				<div class="diagnostic-icon">
					<Zap size={32} />
				</div>
				<h4>Performance Issues</h4>
				<p>Slow loading, lag, or freezing</p>
			</a>

			<a href="#authentication-issues" class="diagnostic-card">
				<div class="diagnostic-icon">
					<Lock size={32} />
				</div>
				<h4>Authentication</h4>
				<p>Can't sign in or access restricted features</p>
			</a>

			<a href="#mobile-issues" class="diagnostic-card">
				<div class="diagnostic-icon">
					<Smartphone size={32} />
				</div>
				<h4>Mobile Issues</h4>
				<p>Touch problems, display issues, or mobile-specific bugs</p>
			</a>

			<a href="#organizer-issues" class="diagnostic-card">
				<div class="diagnostic-icon">
					<UserCircle size={32} />
				</div>
				<h4>Organizer Tools</h4>
				<p>Dashboard, activity switching, or participant management</p>
			</a>
		</div>
	</section>

	<!-- Connection Issues -->
	<section id="connection-issues">
		<h2>Connection Issues</h2>

		<div class="issue-block">
			<h3>Not Seeing Real-Time Updates</h3>

			<Callout type="info" title="Symptoms">
				<ul>
					<li>Other participants' actions don't appear</li>
					<li>Vote counts don't update</li>
					<li>New topics don't show up</li>
					<li>Connection indicator shows yellow or red</li>
				</ul>
			</Callout>

			<h4>Step-by-Step Solution</h4>
			<ol class="solution-steps">
				<li>
					<strong>Check Connection Indicator</strong>
					<p>Look for the connection status in the top-right corner:</p>
					<ul>
						<li>🟢 Green = Connected and receiving updates</li>
						<li>🟡 Yellow = Reconnecting automatically</li>
						<li>🔴 Red = Disconnected, manual action needed</li>
					</ul>
				</li>

				<li>
					<strong>Verify Internet Connection</strong>
					<p>Open a new tab and visit any website to confirm internet access</p>
				</li>

				<li>
					<strong>Hard Refresh the Page</strong>
					<p>Clear cache and reload:</p>
					<ul>
						<li>Windows/Linux: <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>R</kbd></li>
						<li>Mac: <kbd>Cmd</kbd> + <kbd>Shift</kbd> + <kbd>R</kbd></li>
					</ul>
				</li>

				<li>
					<strong>Check Browser Console</strong>
					<p>Open developer tools to check for errors:</p>
					<ul>
						<li>Windows/Linux: <kbd>F12</kbd> or <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>I</kbd></li>
						<li>Mac: <kbd>Cmd</kbd> + <kbd>Option</kbd> + <kbd>I</kbd></li>
						<li>Look for red error messages in the Console tab</li>
					</ul>
				</li>

				<li>
					<strong>Try a Different Browser</strong>
					<p>Test with Chrome, Firefox, or Edge to rule out browser-specific issues</p>
				</li>

				<li>
					<strong>Disable Browser Extensions</strong>
					<p>Ad blockers or privacy extensions may interfere with WebSocket connections</p>
					<ul>
						<li>Try incognito/private mode</li>
						<li>Disable extensions one by one to identify the culprit</li>
					</ul>
				</li>
			</ol>

			<Callout type="tip" title="Prevention">
				<p>
					Keep your browser updated and avoid using multiple tabs with the same event open,
					as this can cause connection conflicts.
				</p>
			</Callout>
		</div>

		<div class="issue-block">
			<h3>Frequent Disconnections</h3>

			<h4>Common Causes and Solutions</h4>
			<table class="troubleshooting-table">
				<thead>
					<tr>
						<th>Cause</th>
						<th>Solution</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td>Unstable Wi-Fi</td>
						<td>Move closer to router or switch to cellular data</td>
					</tr>
					<tr>
						<td>Corporate firewall</td>
						<td>Ask IT to allow WebSocket connections (wss://)</td>
					</tr>
					<tr>
						<td>VPN interference</td>
						<td>Temporarily disable VPN or whitelist domain</td>
					</tr>
					<tr>
						<td>Browser sleeping tabs</td>
						<td>Keep UnConf tab active or pin the tab</td>
					</tr>
					<tr>
						<td>Power saving mode</td>
						<td>Disable battery saver on mobile devices</td>
					</tr>
				</tbody>
			</table>
		</div>
	</section>

	<!-- Voting Issues -->
	<section id="voting-issues">
		<h2>Voting Issues</h2>

		<div class="issue-block">
			<h3>Can't Submit Vote</h3>

			<h4>Troubleshooting Checklist</h4>
			<div class="checklist">
				<label class="checklist-item">
					<input type="checkbox" />
					<span>Voting phase is currently active (check with organizer)</span>
				</label>
				<label class="checklist-item">
					<input type="checkbox" />
					<span>You haven't exceeded vote limit (3 votes: 1st, 2nd, 3rd choice)</span>
				</label>
				<label class="checklist-item">
					<input type="checkbox" />
					<span>You're properly signed in or joined as guest</span>
				</label>
				<label class="checklist-item">
					<input type="checkbox" />
					<span>Connection indicator shows green</span>
				</label>
				<label class="checklist-item">
					<input type="checkbox" />
					<span>Page has been refreshed recently</span>
				</label>
			</div>

			<Callout type="warning">
				<p>
					If the vote button is grayed out, the voting phase may have ended. Contact your
					event organizer to reopen voting if needed.
				</p>
			</Callout>
		</div>

		<div class="issue-block">
			<h3>Votes Not Appearing or Disappearing</h3>

			<h4>Step-by-Step Fix</h4>
			<ol class="solution-steps">
				<li>
					<strong>Check if Results Are Hidden</strong>
					<p>Organizers can hide vote counts until voting closes. This is intentional to prevent bias.</p>
				</li>

				<li>
					<strong>Verify Vote Registration</strong>
					<p>After voting, you should see a confirmation message or visual indicator on your selections.</p>
				</li>

				<li>
					<strong>Clear Browser Cache</strong>
					<CodeBlock
						language="text"
						code={`1. Open browser settings
2. Navigate to Privacy & Security
3. Clear browsing data
4. Select "Cached images and files"
5. Clear data and refresh page`}
					/>
				</li>

				<li>
					<strong>Check for Vote Changes</strong>
					<p>If you changed votes multiple times, only the latest should count. Refresh to see current state.</p>
				</li>
			</ol>
		</div>
	</section>

	<!-- Performance Issues -->
	<section id="performance-issues">
		<h2>Performance Issues</h2>

		<div class="issue-block">
			<h3>Slow Loading or Lag</h3>

			<h4>Quick Fixes</h4>
			<ol class="solution-steps">
				<li>
					<strong>Close Unnecessary Tabs</strong>
					<p>Each open tab consumes memory. Close unused tabs and windows.</p>
				</li>

				<li>
					<strong>Disable Heavy Extensions</strong>
					<p>Extensions like Grammarly, video downloaders, or ad blockers can slow performance.</p>
				</li>

				<li>
					<strong>Clear Browser Cache</strong>
					<p>Accumulated cache can slow down the browser over time.</p>
				</li>

				<li>
					<strong>Check System Resources</strong>
					<ul>
						<li>Windows: <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>Esc</kbd> to open Task Manager</li>
						<li>Mac: <kbd>Cmd</kbd> + <kbd>Space</kbd>, type "Activity Monitor"</li>
						<li>Close resource-heavy applications</li>
					</ul>
				</li>

				<li>
					<strong>Try Incognito/Private Mode</strong>
					<p>This disables extensions and uses a clean cache.</p>
				</li>

				<li>
					<strong>Update Your Browser</strong>
					<p>Older browser versions may have performance issues.</p>
				</li>
			</ol>

			<Callout type="info" title="Minimum Requirements">
				<ul>
					<li>Chrome 80+, Firefox 80+, Safari 12+, or Edge 80+</li>
					<li>4GB RAM minimum (8GB recommended)</li>
					<li>Stable internet connection (5+ Mbps)</li>
				</ul>
			</Callout>
		</div>

		<div class="issue-block">
			<h3>Page Freezing or Crashing</h3>

			<h4>Emergency Steps</h4>
			<ol class="solution-steps">
				<li>
					<strong>Force Close and Reopen</strong>
					<ul>
						<li>Chrome/Edge: Type chrome://restart in address bar</li>
						<li>Firefox: Close and restart browser</li>
						<li>Safari: Force quit and reopen</li>
					</ul>
				</li>

				<li>
					<strong>Clear All Browser Data</strong>
					<p>Nuclear option - clears everything:</p>
					<CodeBlock
						language="text"
						code={`Settings → Privacy → Clear browsing data
Select: All time
Check: Cookies, Cache, Site data
Click: Clear data`}
					/>
				</li>

				<li>
					<strong>Restart Your Device</strong>
					<p>Simple but effective for memory leaks and system issues.</p>
				</li>

				<li>
					<strong>Try a Different Device</strong>
					<p>Use your phone or another computer as backup.</p>
				</li>
			</ol>
		</div>
	</section>

	<!-- Authentication Issues -->
	<section id="authentication-issues">
		<h2>Authentication Issues</h2>

		<div class="issue-block">
			<h3>Can't Sign In with Google</h3>

			<h4>Solution Steps</h4>
			<ol class="solution-steps">
				<li>
					<strong>Check Popup Blockers</strong>
					<p>Google sign-in uses popups. Look for a blocked popup icon in your address bar.</p>
				</li>

				<li>
					<strong>Enable Third-Party Cookies</strong>
					<p>Google authentication requires cookies:</p>
					<ul>
						<li>Chrome: Settings → Privacy → Cookies → "Allow all cookies" (temporarily)</li>
						<li>Firefox: Settings → Privacy → Standard protection</li>
						<li>Safari: Preferences → Privacy → Uncheck "Prevent cross-site tracking"</li>
					</ul>
				</li>

				<li>
					<strong>Try Incognito Mode</strong>
					<p>Rules out extension interference and cookie issues.</p>
				</li>

				<li>
					<strong>Use Guest Access</strong>
					<p>If you can't sign in, continue as a guest. You'll have most functionality except:</p>
					<ul>
						<li>Accessing organizer dashboard</li>
						<li>Saving preferences across sessions</li>
						<li>Creating events</li>
					</ul>
				</li>
			</ol>

			<Callout type="tip">
				<p>
					If your organization blocks Google sign-in, ask your IT department to whitelist
					accounts.google.com for authentication.
				</p>
			</Callout>
		</div>
	</section>

	<!-- Mobile Issues -->
	<section id="mobile-issues">
		<h2>Mobile Issues</h2>

		<div class="issue-block">
			<h3>Touch Interactions Not Working</h3>

			<h4>Fixes for Touch Issues</h4>
			<ol class="solution-steps">
				<li>
					<strong>Remove Screen Protector</strong>
					<p>Thick or damaged screen protectors can interfere with touch.</p>
				</li>

				<li>
					<strong>Clean Your Screen</strong>
					<p>Dirt and oils can cause misfires.</p>
				</li>

				<li>
					<strong>Ensure Direct Touch</strong>
					<p>Tap directly on buttons, not near them. Use your fingertip, not fingernail.</p>
				</li>

				<li>
					<strong>Disable Zoom</strong>
					<p>If accidentally zoomed, double-tap or pinch to reset zoom level.</p>
				</li>

				<li>
					<strong>Try Landscape Mode</strong>
					<p>Larger touch targets in landscape orientation.</p>
				</li>

				<li>
					<strong>Restart Mobile Browser</strong>
					<p>Close all tabs and reopen browser app.</p>
				</li>
			</ol>
		</div>

		<div class="issue-block">
			<h3>Text Too Small on Mobile</h3>

			<h4>Solutions</h4>
			<ul>
				<li><strong>Rotate to Landscape:</strong> Wider view often improves readability</li>
				<li><strong>Zoom In:</strong> Pinch to zoom or double-tap to zoom specific sections</li>
				<li><strong>Adjust Device Settings:</strong> Settings → Display → Font size</li>
				<li><strong>Use Reader Mode:</strong> Some browsers offer reader mode for better text display</li>
			</ul>
		</div>

		<div class="issue-block">
			<h3>Mobile Performance Issues</h3>

			<h4>Optimization Tips</h4>
			<ol class="solution-steps">
				<li>
					<strong>Close Background Apps</strong>
					<p>Free up RAM by closing other apps.</p>
				</li>

				<li>
					<strong>Disable Battery Saver</strong>
					<p>Battery saver mode throttles performance and connections.</p>
				</li>

				<li>
					<strong>Connect to Wi-Fi</strong>
					<p>More stable than cellular data for real-time features.</p>
				</li>

				<li>
					<strong>Clear Browser Cache</strong>
					<p>Mobile browsers accumulate cache quickly.</p>
				</li>

				<li>
					<strong>Update Browser App</strong>
					<p>Check App Store/Play Store for updates.</p>
				</li>
			</ol>
		</div>
	</section>

	<!-- Organizer Issues -->
	<section id="organizer-issues">
		<h2>Organizer Tools Issues</h2>

		<div class="issue-block">
			<h3>Can't Access Organizer Dashboard</h3>

			<h4>Verification Steps</h4>
			<ol class="solution-steps">
				<li>
					<strong>Confirm Organizer Role</strong>
					<p>Only event creators and assigned co-organizers have dashboard access.</p>
				</li>

				<li>
					<strong>Verify Sign-In</strong>
					<p>Guest accounts cannot access organizer features. Must be signed in with Google.</p>
				</li>

				<li>
					<strong>Check Event Ownership</strong>
					<p>Navigate to the correct event. You can only manage events you created.</p>
				</li>

				<li>
					<strong>Clear Session</strong>
					<p>Sign out completely and sign back in.</p>
				</li>
			</ol>
		</div>

		<div class="issue-block">
			<h3>Activity Switch Not Working</h3>

			<h4>Troubleshooting</h4>
			<ol class="solution-steps">
				<li>
					<strong>Check Current Activity</strong>
					<p>Verify you're not already on the selected activity.</p>
				</li>

				<li>
					<strong>Wait for Processing</strong>
					<p>Activity switches take 1-2 seconds. Don't click multiple times.</p>
				</li>

				<li>
					<strong>Verify Participant View</strong>
					<p>Open event in incognito mode as participant to confirm changes.</p>
				</li>

				<li>
					<strong>Check for Errors</strong>
					<p>Open browser console (<kbd>F12</kbd>) to see any error messages.</p>
				</li>

				<li>
					<strong>Refresh Dashboard</strong>
					<p>Hard refresh the organizer dashboard.</p>
				</li>
			</ol>
		</div>

		<div class="issue-block">
			<h3>Participants Not Receiving Updates</h3>

			<h4>Diagnosis Steps</h4>
			<ol class="solution-steps">
				<li>
					<strong>Check Connection Count</strong>
					<p>Dashboard shows number of connected participants. If count is low, participants may be disconnected.</p>
				</li>

				<li>
					<strong>Verify Network Status</strong>
					<p>Use monitoring dashboard to see which participants are online/offline.</p>
				</li>

				<li>
					<strong>Announce Refresh</strong>
					<p>Ask participants to refresh their pages if they're not seeing updates.</p>
				</li>

				<li>
					<strong>Check Server Status</strong>
					<p>Rare, but server issues can affect all participants. Check status page or contact support.</p>
				</li>
			</ol>
		</div>
	</section>

	<!-- Getting Help -->
	<section id="getting-help">
		<h2>Still Need Help?</h2>

		<div class="help-grid">
			<div class="help-card">
				<h4>Check the FAQ</h4>
				<p>Common questions and answers about UnConf features</p>
				<a href="/docs/faq" class="help-link">Visit FAQ →</a>
			</div>

			<div class="help-card">
				<h4>Read the Docs</h4>
				<p>Comprehensive documentation and guides</p>
				<a href="/docs" class="help-link">View Documentation →</a>
			</div>

			<div class="help-card">
				<h4>Report a Bug</h4>
				<p>Found a problem? Let us know</p>
				<a href="https://github.com/yourusername/unconf/issues" class="help-link">Report Issue →</a>
			</div>

			<div class="help-card">
				<h4>Contact Support</h4>
				<p>Email us for personalized assistance</p>
				<a href="mailto:support@unconf.example.com" class="help-link">Send Email →</a>
			</div>
		</div>

		<Callout type="info" title="Before Contacting Support">
			<p>Please provide:</p>
			<ul>
				<li>Browser and version (e.g., "Chrome 120")</li>
				<li>Operating system (e.g., "Windows 11", "iOS 17")</li>
				<li>Steps to reproduce the issue</li>
				<li>Screenshots if applicable</li>
				<li>Error messages from browser console</li>
			</ul>
		</Callout>
	</section>
</DocsLayout>

<style>
	/* Diagnostic Grid */
	.diagnostic-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: 1rem;
		margin: 2rem 0;
	}

	.diagnostic-card {
		padding: 1.5rem;
		background: white;
		border: 2px solid #e5e7eb;
		border-radius: 12px;
		text-align: center;
		transition: all 0.2s ease;
		text-decoration: none;
	}

	.diagnostic-card:hover {
		border-color: #3b82f6;
		box-shadow: 0 8px 24px rgba(59, 130, 246, 0.15);
		transform: translateY(-2px);
		text-decoration: none;
	}

	.diagnostic-icon {
		font-size: 2.5rem;
		margin-bottom: 0.75rem;
	}

	.diagnostic-card h4 {
		margin: 0 0 0.5rem 0;
		font-size: 1.0625rem;
		color: #111827;
	}

	.diagnostic-card p {
		margin: 0;
		font-size: 0.875rem;
		color: #6b7280;
	}

	/* Issue Blocks */
	.issue-block {
		margin: 3rem 0;
		padding-bottom: 2rem;
		border-bottom: 1px solid #e5e7eb;
	}

	.issue-block:last-child {
		border-bottom: none;
	}

	.issue-block h3 {
		color: #111827;
		margin-bottom: 1.5rem;
		padding-bottom: 0.5rem;
		border-bottom: 2px solid #3b82f6;
		display: inline-block;
	}

	.issue-block h4 {
		margin: 1.5rem 0 1rem 0;
		color: #374151;
		font-size: 1.0625rem;
	}

	/* Solution Steps */
	.solution-steps {
		counter-reset: step;
		list-style: none;
		padding: 0;
		margin: 1.5rem 0;
	}

	.solution-steps > li {
		position: relative;
		padding-left: 3rem;
		margin-bottom: 2rem;
	}

	.solution-steps > li::before {
		content: counter(step);
		counter-increment: step;
		position: absolute;
		left: 0;
		top: 0;
		width: 32px;
		height: 32px;
		background: #3b82f6;
		color: white;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 700;
		font-size: 0.875rem;
	}

	.solution-steps strong {
		display: block;
		color: #111827;
		font-size: 1rem;
		margin-bottom: 0.5rem;
	}

	.solution-steps p {
		margin: 0.5rem 0;
		color: #4b5563;
		font-size: 0.9375rem;
	}

	.solution-steps ul {
		margin: 0.75rem 0;
		padding-left: 1.5rem;
	}

	.solution-steps li ul li {
		margin: 0.25rem 0;
	}

	/* Troubleshooting Table */
	.troubleshooting-table {
		width: 100%;
		border-collapse: collapse;
		margin: 1.5rem 0;
		background: white;
		border-radius: 12px;
		overflow: hidden;
		border: 1px solid #e5e7eb;
	}

	.troubleshooting-table th,
	.troubleshooting-table td {
		padding: 1rem;
		text-align: left;
	}

	.troubleshooting-table thead {
		background: #f9fafb;
	}

	.troubleshooting-table th {
		font-size: 0.875rem;
		font-weight: 600;
		color: #374151;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.troubleshooting-table td {
		font-size: 0.9375rem;
		color: #4b5563;
		border-top: 1px solid #e5e7eb;
	}

	.troubleshooting-table tbody tr:hover {
		background: #f9fafb;
	}

	/* Checklist */
	.checklist {
		background: #f9fafb;
		padding: 1.5rem;
		border-radius: 12px;
		margin: 1.5rem 0;
	}

	.checklist-item {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
		padding: 0.75rem 0;
		cursor: pointer;
		transition: background 0.2s ease;
	}

	.checklist-item:hover {
		background: rgba(59, 130, 246, 0.05);
	}

	.checklist-item input[type='checkbox'] {
		margin-top: 0.25rem;
		width: 18px;
		height: 18px;
		cursor: pointer;
	}

	.checklist-item span {
		flex: 1;
		color: #374151;
		font-size: 0.9375rem;
	}

	/* Keyboard Keys */
	kbd {
		padding: 0.125rem 0.5rem;
		background: #f3f4f6;
		border: 1px solid #d1d5db;
		border-radius: 4px;
		font-family: var(--font-family-mono);
		font-size: 0.875rem;
		color: #374151;
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
	}

	/* Help Grid */
	.help-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: 1.5rem;
		margin: 2rem 0;
	}

	.help-card {
		padding: 1.5rem;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		border-radius: 12px;
		color: white;
	}

	.help-card h4 {
		margin: 0 0 0.5rem 0;
		color: white;
		font-size: 1.125rem;
	}

	.help-card p {
		margin: 0 0 1rem 0;
		color: rgba(255, 255, 255, 0.9);
		font-size: 0.9375rem;
	}

	.help-link {
		display: inline-flex;
		align-items: center;
		color: white;
		font-weight: 600;
		font-size: 0.9375rem;
		text-decoration: none;
		border-bottom: 2px solid rgba(255, 255, 255, 0.3);
		transition: border-color 0.2s ease;
	}

	.help-link:hover {
		border-bottom-color: white;
	}

	@media (max-width: 768px) {
		.solution-steps > li {
			padding-left: 2.5rem;
		}

		.solution-steps > li::before {
			width: 28px;
			height: 28px;
			font-size: 0.8125rem;
		}

		.troubleshooting-table th,
		.troubleshooting-table td {
			padding: 0.75rem;
			font-size: 0.875rem;
		}
	}
</style>
