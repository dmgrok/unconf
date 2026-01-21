<script lang="ts">
  import { page } from '$app/stores';
  import TimerCore from '$lib/components/tools/TimerCore.svelte';
  
  let displayMode = $derived($page.url.searchParams.get('display') === 'true');
</script>

<svelte:head>
  <title>Session Timer - unconf tools Lab</title>
  <meta name="description" content="Simple countdown timer for sessions. Fullscreen display mode available." />
</svelte:head>

<TimerCore 
  showBack={true}
  backUrl="/"
  backText="← unconf tools Lab"
  showUseCases={true}
  {displayMode}
/>
