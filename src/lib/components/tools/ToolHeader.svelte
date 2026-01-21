<script lang="ts">
  interface Props {
    /** Event ID for back link */
    eventId?: string;
    /** Event name for back link */
    eventName?: string;
    /** Back URL override */
    backUrl?: string;
    /** Back text override */
    backText?: string;
    /** Page title */
    title: string;
    /** Page subtitle */
    subtitle?: string;
    /** Icon/emoji for title */
    icon?: string;
  }
  
  let { 
    eventId,
    eventName,
    backUrl,
    backText,
    title,
    subtitle,
    icon
  }: Props = $props();
  
  let computedBackUrl = $derived(backUrl ?? (eventId ? `/events/${eventId}` : '/'));
  let computedBackText = $derived(backText ?? (eventName ? `← Back to ${eventName}` : '← Back'));
</script>

<header class="tool-header">
  <a href={computedBackUrl} class="back">{computedBackText}</a>
  <h1>{#if icon}<span class="icon">{icon}</span>{/if} {title}</h1>
  {#if subtitle}
    <p class="subtitle">{subtitle}</p>
  {/if}
</header>

<style>
  .tool-header {
    margin-bottom: 2rem;
  }
  
  .back {
    color: #71717a;
    text-decoration: none;
    font-size: 0.875rem;
    transition: color 0.2s;
  }
  
  .back:hover {
    color: #a1a1aa;
  }
  
  h1 {
    font-size: 1.75rem;
    margin: 1rem 0 0.25rem;
    color: #f4f4f5;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  .icon {
    font-size: 1.5rem;
  }
  
  .subtitle {
    color: #a1a1aa;
    margin: 0;
    font-size: 0.9375rem;
  }
</style>
