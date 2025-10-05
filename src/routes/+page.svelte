<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { AlertTriangle, Vote, Users, BarChart3, Gamepad2, ShieldCheck } from 'lucide-svelte';
	import { authStore } from '$lib/stores/auth';
	import Hero from '$lib/components/Hero.svelte';
	import LoadingScreen from '$lib/components/ui/LoadingScreen.svelte';

	type DemoEvent = { id: string; title: string };

	// Dynamic imports for heavy components
	let TopicSubmissionForm = $state<any>(null);
	let TopicListWithVoting = $state<any>(null);
	let WebSocketTest = $state<any>(null);

	let isLoading = $state(true);
	let loadingError = $state<string | null>(null);
	let demoMode = $state(false);
	let showDemoEvent = $state(false);

	// Demo event configuration  
	const demoEventId = 'demo-event-voting-system';
	const demoUserId = 'demo-user-001';
	const demoUserName = 'Demo User';
	const demoUserRole = 'participant';

	// Legacy variables for compatibility
	let userId = demoUserId;
	let userName = demoUserName;
  let testEvent = $state<DemoEvent | null>(null);

	onMount(async () => {
		try {
			// Check authentication status
			await authStore.initialize();

			// Load components dynamically with timeout
			const componentLoadPromise = Promise.all([
				import('../components').then(m => ({ default: m.TopicSubmissionForm })),
				import('../components').then(m => ({ default: m.TopicListWithVoting })),
				import('$lib/components/WebSocketTest.svelte')
			]);

			// Add 10 second timeout for component loading
			const timeoutPromise = new Promise((_, reject) =>
				setTimeout(() => reject(new Error('Component loading timeout')), 10000)
			);

			const [topicSubmissionModule, topicListModule, webSocketModule] = await Promise.race([
				componentLoadPromise,
				timeoutPromise
			]) as any;

			TopicSubmissionForm = topicSubmissionModule.default;
			TopicListWithVoting = topicListModule.default;
			WebSocketTest = webSocketModule.default;

			// Initialize demo event data (non-blocking)
			initializeDemoEvent().catch(error => {
				console.warn('Demo event initialization failed:', error);
				// Set fallback test event
				testEvent = {
					id: demoEventId,
					title: 'Weighted Voting System Demo'
				};
			});

			isLoading = false;
		} catch (error) {
			console.error('Failed to load page:', error);
			loadingError = error instanceof Error ? error.message : 'Failed to load page components';
			isLoading = false;
		}
	});

	async function initializeDemoEvent() {
		try {
			// Create demo event if it doesn't exist
			const eventResponse = await fetch('/api/events', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					title: 'Weighted Voting System Demo',
					description: 'Test the new weighted voting system with 1st, 2nd, and 3rd choice voting',
					organizerId: demoUserId,
					organizerName: demoUserName,
					capacity: 50,
					duration: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
					settings: {
						allowGuestAccess: true,
						votingRounds: 1,
						maxTopicsPerUser: 5,
						votingTimeLimit: 300,
						requireRegistration: false
					}
				})
			});

			// Get the created event ID from response
			let createdEventId = demoEventId;
			if (eventResponse.ok) {
				const eventData = await eventResponse.json();
				if (eventData.success && eventData.event) {
					createdEventId = eventData.event.id;
				}
			}

			// Set test event for legacy compatibility
			testEvent = {
				id: createdEventId,
				title: 'Weighted Voting System Demo'
			};

			// Create some sample topics for testing
			const sampleTopics = [
				{
					title: 'AI Ethics in Product Development',
					description: 'Discuss ethical considerations when building AI-powered features',
					tags: ['ai', 'ethics', 'product']
				},
				{
					title: 'Remote Team Collaboration Best Practices', 
					description: 'Share strategies for effective remote team collaboration',
					tags: ['remote', 'collaboration', 'team']
				},
				{
					title: 'Sustainable Software Development',
					description: 'How to build software with environmental sustainability in mind',
					tags: ['sustainability', 'development', 'environment']
				},
				{
					title: 'Developer Mental Health & Burnout',
					description: 'Addressing mental health challenges in software development', 
					tags: ['mental-health', 'burnout', 'wellbeing']
				}
			];

			// Create sample topics
			for (const topic of sampleTopics) {
				await fetch('/api/topics', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						...topic,
						eventId: createdEventId,
						submittedBy: demoUserId
					})
				});
			}
		} catch (error) {
			console.log('Demo event already exists or error creating:', error);
			// Set test event even if creation failed
			testEvent = {
				id: demoEventId,
				title: 'Weighted Voting System Demo'
			};
		}
	}

	function startDemo() {
		demoMode = true;
		showDemoEvent = true;
	}

	function joinEvent() {
		// Navigate to event join page
		goto('/join');
	}

	function createEvent() {
		// Navigate to event creation
		goto('/create');
	}

	function handleTopicSubmitted() {
		console.log('Topic submitted to demo event');
	}

  function handleVoteAction(event: CustomEvent<Record<string, unknown>>) {
		console.log('Vote action:', event.detail);
	}

  function handleError(event: CustomEvent<{ message: string }>) {
		alert('Error: ' + event.detail.message);
	}
</script>

<!-- Hero Section -->
<Hero />

<!-- What is an Unconference? -->
<section class="unconference-explainer">
  <div class="explainer-container">
    <h2 class="explainer-title">What's an Unconference?</h2>
    <p class="explainer-text">
      An event where <strong>participants create the agenda together</strong>. Instead of lectures, you get discussions.
      Instead of passive listening, you get active collaboration. Perfect for meetups, team offsites, academic conferences,
      and community workshops.
    </p>
  </div>
</section>

{#if loadingError}
<div class="error-container">
  <div class="error-message">
    <h2>
      <AlertTriangle size={24} style="display: inline; vertical-align: middle; margin-right: 8px;" />
      Loading Error
    </h2>
    <p>{loadingError}</p>
    <button onclick={() => window.location.reload()} class="retry-button">
      Retry
    </button>
  </div>
</div>
{:else if isLoading}
<LoadingScreen variant="page" />
{:else}
<!-- Features Section -->
<div class="features-section">
  <h2>Stop Guessing. Start Engaging.</h2>
  <div class="features-grid">
    <div class="feature-card">
      <div class="feature-icon">
        <Vote size={32} />
      </div>
      <h3>Your Agenda Builds Itself</h3>
      <p class="feature-problem">Tired of guessing what attendees want?</p>
      <p class="feature-solution">Weighted voting surfaces the topics people actually care about—not just what's loudest. Participants rank their 1st, 2nd, and 3rd choices, and the most popular topics rise to the top automatically.</p>
    </div>
    <div class="feature-card">
      <div class="feature-icon">
        <Users size={32} />
      </div>
      <h3>Fair, Balanced Groups—Instantly</h3>
      <p class="feature-problem">No more cliques or lopsided teams.</p>
      <p class="feature-solution">Our algorithm creates balanced, diverse discussion groups in seconds. End awkward group formation and ensure everyone has a voice.</p>
    </div>
    <div class="feature-card">
      <div class="feature-icon">
        <BarChart3 size={32} />
      </div>
      <h3>See What's Working—Live</h3>
      <p class="feature-problem">Don't wait until after to know if it worked.</p>
      <p class="feature-solution">Real-time dashboards show engagement levels, voting patterns, and participation metrics—so you can adjust on the fly, not after it's too late.</p>
    </div>
    <div class="feature-card">
      <div class="feature-icon">
        <Gamepad2 size={32} />
      </div>
      <h3>Break the Ice Without the Cringe</h3>
      <p class="feature-problem">Awkward icebreakers killing the vibe?</p>
      <p class="feature-solution">Built-in activities that actually energize your crowd. No trust falls, no forced fun—just proven engagement boosters that work.</p>
    </div>
    <div class="feature-card">
      <div class="feature-icon">
        <ShieldCheck size={32} />
      </div>
      <h3>Privacy-First by Design</h3>
      <p class="feature-problem">Tired of GDPR headaches and signup friction?</p>
      <p class="feature-solution">Participants join anonymously—no email, no account, no data collection hassles. Perfect for corporate events where privacy matters. You control whether events require registration or stay completely anonymous.</p>
    </div>
  </div>
</div>

<!-- Technical Demo Section (Hidden by default, shown only when enabled) -->
<div class="demo-sections" class:hidden={!demoMode}>
  <!-- WebSocket Testing -->
  {#if WebSocketTest && demoMode}
  <section class="websocket-section">
    <h2>🔄 WebSocket Infrastructure Test</h2>
    <WebSocketTest />
  </section>
  {/if}

  <!-- Weighted Voting Demo -->
  {#if testEvent && TopicSubmissionForm && TopicListWithVoting && showDemoEvent}
    <section class="voting-demo-section">
      <h2>�️ Weighted Voting System Demo</h2>
      <p>Test the new <strong>weighted voting system</strong> with 1st choice (3 points), 2nd choice (2 points), and 3rd choice (1 point) voting.</p>
      
      <div class="voting-demo-info">
        <div class="demo-badge-group">
          <span class="demo-badge">Event: {testEvent.title}</span>
          <span class="demo-badge">User: {userName}</span>
          <span class="demo-badge">Mode: Demo</span>
        </div>
      </div>
      
      <div class="voting-demo-content">
        <div class="demo-submission">
          <h3>Submit New Topic</h3>
          <p class="section-desc">Add topics to test the voting system</p>
          <TopicSubmissionForm 
            eventId={testEvent.id} 
            {userId} 
            {userName}
            on:submitted={handleTopicSubmitted}
            on:error={handleError}
          />
        </div>
        
        <div class="demo-voting-list">
          <h3>Vote on Topics</h3>
          <p class="section-desc">
            Cast your weighted votes: 🥇 1st choice (3pts), 🥈 2nd choice (2pts), 🥉 3rd choice (1pt)
          </p>
          <TopicListWithVoting 
            eventId={testEvent.id} 
            {userId} 
            userRole={demoUserRole}
            enableVoting={true}
            showActions={false}
            on:vote-cast={handleVoteAction}
            on:vote-removed={handleVoteAction}
            on:error={handleError}
          />
        </div>
      </div>
    </section>
  {/if}

  <!-- Legacy Topic Management (fallback) -->
  {#if testEvent && !showDemoEvent && TopicSubmissionForm && TopicListWithVoting}
    <section class="topic-section">
      <h2>💡 Legacy Topic Management System</h2>
      <p>Basic topic management without weighted voting</p>

      <div class="topic-management">
        <div class="topic-submission">
          <h3>Submit New Topic</h3>
          {#if TopicSubmissionForm}
            <TopicSubmissionForm
              eventId={testEvent.id}
              {userId}
              {userName}
            />
          {/if}
        </div>

        <div class="topic-list">
          <h3>Current Topics (No Voting)</h3>
          {#if TopicListWithVoting}
            <TopicListWithVoting
              eventId={testEvent.id}
              {userId}
              userRole="participant"
              enableVoting={false}
              showActions={true}
            />
          {/if}
        </div>
      </div>
    </section>
  {/if}
</div>
{/if}

<style>
  .unconference-explainer {
    background: linear-gradient(to bottom, #f8fafc, #ffffff);
    padding: 3rem 2rem;
    border-bottom: 1px solid #e2e8f0;
  }

  .explainer-container {
    max-width: 800px;
    margin: 0 auto;
    text-align: center;
  }

  .explainer-title {
    font-size: 1.75rem;
    font-weight: var(--font-weight-bold);
    color: var(--color-text-primary);
    margin: 0 0 1rem 0;
  }

  .explainer-text {
    font-size: 1.125rem;
    color: var(--color-text-secondary);
    line-height: 1.7;
    margin: 0;
  }

  .features-section {
    max-width: 1200px;
    margin: 0 auto;
    padding: 4rem 2rem;
    text-align: center;
  }

  .features-section h2 {
    font-size: 2.5rem;
    font-weight: var(--font-weight-bold);
    color: var(--color-text-primary);
    margin-bottom: 3rem;
  }

  .features-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 2rem;
    margin-top: 2rem;
  }

  .feature-card {
    background: white;
    padding: 2rem;
    border-radius: 12px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
    transition: transform 0.2s, box-shadow 0.2s;
    text-align: center;
  }

  .feature-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 12px rgba(0, 0, 0, 0.1);
  }

  .feature-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
  }

  .feature-card h3 {
    font-size: 1.25rem;
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-primary);
    margin-bottom: 0.75rem;
  }

  .feature-card p {
    font-size: 0.95rem;
    color: var(--color-text-secondary);
    line-height: 1.6;
    text-align: left;
  }

  .feature-problem {
    font-weight: var(--font-weight-semibold);
    color: #ef4444;
    font-style: italic;
    margin: 0.5rem 0;
  }

  .feature-solution {
    margin: 0.5rem 0 0 0;
  }

  .demo-sections {
    max-width: 1200px;
    margin: 0 auto;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }
  
  .websocket-section,
  .voting-demo-section,
  .topic-section {
    padding: 1.5rem;
    border: 2px solid #e2e8f0;
    border-radius: 0.5rem;
    background: #f8fafc;
  }

  .voting-demo-section {
    border-color: #3b82f6;
    background: linear-gradient(135deg, #dbeafe 0%, #f8fafc 100%);
  }
  
  .websocket-section h2,
  .voting-demo-section h2,
  .topic-section h2 {
    margin: 0 0 1rem 0;
    color: #334155;
  }

  .voting-demo-section h2 {
    color: #1e40af;
    font-size: 1.5rem;
  }

  .voting-demo-info {
    margin: 1rem 0 1.5rem 0;
  }

  .demo-badge-group {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .demo-badge {
    background: #3b82f6;
    color: white;
    padding: 0.25rem 0.75rem;
    border-radius: 1rem;
    font-size: 0.875rem;
    font-weight: 500;
  }

  .voting-demo-content {
    display: grid;
    grid-template-columns: 1fr 2fr;
    gap: 2rem;
    margin-top: 1rem;
  }

  .demo-submission,
  .demo-voting-list {
    padding: 1.5rem;
    border: 1px solid #cbd5e1;
    border-radius: 0.5rem;
    background: white;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .demo-submission h3,
  .demo-voting-list h3 {
    margin: 0 0 0.5rem 0;
    color: #1e40af;
    font-size: 1.125rem;
  }

  .section-desc {
    color: #6b7280;
    margin-bottom: 1rem;
    font-size: 0.875rem;
    line-height: 1.4;
  }
  
  .topic-management {
    display: grid;
    grid-template-columns: 1fr 2fr;
    gap: 2rem;
    margin-top: 1rem;
  }
  
  .topic-submission,
  .topic-list {
    padding: 1rem;
    border: 1px solid #cbd5e1;
    border-radius: 0.375rem;
    background: white;
  }
  
  .topic-submission h3,
  .topic-list h3 {
    margin: 0 0 1rem 0;
    color: #475569;
  }
  
  @media (max-width: 768px) {
    .voting-demo-content,
    .topic-management {
      grid-template-columns: 1fr;
    }

    .demo-badge-group {
      justify-content: center;
    }

    .voting-demo-section h2 {
      text-align: center;
      font-size: 1.25rem;
    }
  }

  @media (max-width: 640px) {
    .demo-sections {
      padding: 0.5rem;
    }

    .websocket-section,
    .voting-demo-section,
    .topic-section {
      padding: 1rem;
    }

    .demo-submission,
    .demo-voting-list {
      padding: 1rem;
    }
  }

  .error-container {
    max-width: 600px;
    margin: 2rem auto;
    padding: 1rem;
  }

  .error-message {
    background: #fee;
    border: 2px solid #fcc;
    border-radius: 8px;
    padding: 2rem;
    text-align: center;
  }

  .error-message h2 {
    color: #c33;
    margin: 0 0 1rem 0;
  }

  .error-message p {
    color: #666;
    margin: 0 0 1.5rem 0;
  }

  .retry-button {
    padding: 0.75rem 1.5rem;
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 1rem;
    cursor: pointer;
    transition: background 0.2s;
  }

  .retry-button:hover {
    background: #2563eb;
  }

  .hidden {
    display: none;
  }
</style>
