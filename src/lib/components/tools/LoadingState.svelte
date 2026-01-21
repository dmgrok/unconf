<script lang="ts">
  interface Props {
    /** Loading message */
    message?: string;
  }
  
  let { message = 'Loading...' }: Props = $props();
</script>

<div class="loading-state">
  <div class="spinner"></div>
  <p>{message}</p>
</div>

<style>
  .loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 50vh;
    color: #a1a1aa;
  }
  
  .spinner {
    width: 40px;
    height: 40px;
    border: 3px solid #27272a;
    border-top-color: #6366f1;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  
  .loading-state p {
    margin-top: 1rem;
    font-size: 0.875rem;
  }
</style>
