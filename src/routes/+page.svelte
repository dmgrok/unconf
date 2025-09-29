<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
  import { authStore } from '$lib/stores/auth';
  import { TopicSubmissionForm, TopicListWithVoting } from '../components';
	import WebSocketTest from '$lib/components/WebSocketTest.svelte';

  type DemoEvent = { id: string; title: string };

	let isLoading = true;
	let demoMode = false;
	let showDemoEvent = false;

	// Demo event configuration  
	const demoEventId = 'demo-event-voting-system';
	const demoUserId = 'demo-user-001';
	const demoUserName = 'Demo User';
	const demoUserRole = 'participant';

	// Legacy variables for compatibility
	let userId = demoUserId;
	let userName = demoUserName;
  let testEvent: DemoEvent | null = null;

	onMount(async () => {
		// Check authentication status
		await authStore.initialize();
		
		// Initialize demo event data
		await initializeDemoEvent();
		
		isLoading = false;
	});

	async function initializeDemoEvent() {
		try {
			// Create demo event if it doesn't exist
			const eventResponse = await fetch('/api/events', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					id: demoEventId,
					title: 'Weighted Voting System Demo',
					description: 'Test the new weighted voting system with 1st, 2nd, and 3rd choice voting',
					organizerId: demoUserId,
					accessCode: 'VOTING-DEMO',
					maxParticipants: 50,
					votingRounds: 1
				})
			});

			// Set test event for legacy compatibility
			testEvent = {
				id: demoEventId,
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
						eventId: demoEventId,
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

<h1>UnConf - Unconference Management Platform</h1>
<p>Real-time collaboration platform for unconferences, voting, and group activities.</p>

<div class="demo-sections">
  <!-- WebSocket Testing -->
  <section class="websocket-section">
    <h2>🔄 WebSocket Infrastructure Test</h2>
    <WebSocketTest />
  </section>

  <!-- Weighted Voting Demo -->
  {#if testEvent}
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
  {#if testEvent && !showDemoEvent}
    <section class="topic-section">
      <h2>💡 Legacy Topic Management System</h2>
      <p>Basic topic management without weighted voting</p>
      
      <div class="topic-management">
        <div class="topic-submission">
          <h3>Submit New Topic</h3>
          <TopicSubmissionForm 
            eventId={testEvent.id} 
            {userId} 
            {userName} 
          />
        </div>
        
        <div class="topic-list">
          <h3>Current Topics (No Voting)</h3>
          <TopicListWithVoting 
            eventId={testEvent.id} 
            {userId} 
            userRole="participant"
            enableVoting={false}
            showActions={true}
          />
        </div>
      </div>
    </section>
  {/if}
</div>

<style>
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
</style>
