<script lang="ts">
  import MonitoringDashboard from '$lib/components/MonitoringDashboard.svelte';
  import { onMount } from 'svelte';

  let isAuthorized = false;
  let loading = true;

  onMount(async () => {
    // Simple authorization check (in a real app, this would check user roles)
    // For demo purposes, we'll allow access
    isAuthorized = true;
    loading = false;
  });
</script>

<svelte:head>
  <title>System Monitoring Dashboard - UnConf Admin</title>
  <meta name="description" content="Real-time system monitoring and performance metrics dashboard" />
</svelte:head>

{#if loading}
  <div class="min-h-screen flex items-center justify-center">
    <div class="text-xl">Loading...</div>
  </div>
{:else if !isAuthorized}
  <div class="min-h-screen flex items-center justify-center">
    <div class="bg-red-100 border border-red-400 text-red-700 px-6 py-4 rounded-lg">
      <h2 class="text-xl font-bold mb-2">Access Denied</h2>
      <p>You don't have permission to access the monitoring dashboard.</p>
    </div>
  </div>
{:else}
  <div class="min-h-screen bg-gray-50">
    <MonitoringDashboard />
  </div>
{/if}