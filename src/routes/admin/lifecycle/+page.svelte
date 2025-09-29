<script lang="ts">
  import LifecycleDashboard from '$lib/components/LifecycleDashboard.svelte';
  import { page } from '$app/stores';
  
  // Check if user has organizer permissions (simplified for demo)
  // In a real app, this would check authentication/authorization
  let hasAccess = true;
</script>

<svelte:head>
  <title>Event Lifecycle Management - Unconf</title>
  <meta name="description" content="Monitor and manage event lifecycles, automated transitions, and system health" />
</svelte:head>

{#if hasAccess}
  <div class="lifecycle-page">
    <div class="page-header">
      <h1>System Administration</h1>
      <p class="page-description">
        Monitor event lifecycle management, automated transitions, and system health metrics.
      </p>
    </div>
    
    <LifecycleDashboard />
  </div>
{:else}
  <div class="access-denied">
    <h1>Access Denied</h1>
    <p>You don't have permission to access the lifecycle management dashboard.</p>
    <a href="/" class="btn btn-primary">Return to Home</a>
  </div>
{/if}

<style>
  .lifecycle-page {
    min-height: 100vh;
    background: var(--background-color, #f9fafb);
  }

  .page-header {
    background: var(--surface-color, #ffffff);
    border-bottom: 1px solid var(--border-color, #e0e0e0);
    padding: 2rem 0;
    margin-bottom: 2rem;
  }

  .page-header h1 {
    max-width: 1200px;
    margin: 0 auto 0.5rem auto;
    padding: 0 2rem;
    color: var(--text-primary, #1f2937);
    font-size: 2.25rem;
    font-weight: 700;
  }

  .page-description {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 2rem;
    color: var(--text-secondary, #6b7280);
    font-size: 1.125rem;
  }

  .access-denied {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 60vh;
    text-align: center;
    padding: 2rem;
  }

  .access-denied h1 {
    margin-bottom: 1rem;
    color: var(--text-primary, #1f2937);
    font-size: 2rem;
  }

  .access-denied p {
    margin-bottom: 2rem;
    color: var(--text-secondary, #6b7280);
    font-size: 1.125rem;
  }

  .btn {
    display: inline-block;
    padding: 0.75rem 1.5rem;
    background: var(--primary-color, #3b82f6);
    color: white;
    text-decoration: none;
    border-radius: 6px;
    font-weight: 500;
    transition: background-color 0.2s;
  }

  .btn:hover {
    background: var(--primary-hover, #2563eb);
  }
</style>