<script lang="ts">
  interface Props {
    /** Error title */
    title?: string;
    /** Error message */
    message?: string;
    /** Back link URL */
    backUrl?: string;
    /** Back link text */
    backText?: string;
  }
  
  let { 
    title = 'Something went wrong',
    message,
    backUrl = '/',
    backText = '← Back to Home'
  }: Props = $props();
</script>

<div class="error-state">
  <h1>😕 {title}</h1>
  {#if message}
    <p>{message}</p>
  {/if}
  <a href={backUrl} class="btn">{backText}</a>
</div>

<style>
  .error-state {
    text-align: center;
    padding: 4rem 1rem;
    color: #e4e4e7;
  }
  
  .error-state h1 {
    font-size: 1.5rem;
    margin: 0 0 0.5rem;
    color: #f4f4f5;
  }
  
  .error-state p {
    margin: 0 0 1.5rem;
    color: #a1a1aa;
  }
  
  .btn {
    display: inline-block;
    padding: 0.625rem 1.25rem;
    background: #6366f1;
    color: white;
    border-radius: 8px;
    text-decoration: none;
    font-size: 0.875rem;
    font-weight: 500;
    transition: background 0.2s;
  }
  
  .btn:hover {
    background: #4f46e5;
  }
</style>
