<script lang="ts">
  import type { Team } from '$lib/types/tools';
  
  interface Props {
    teams: Team[];
    onCopy?: () => void;
    copied?: boolean;
    showMemberCount?: boolean;
  }
  
  let { 
    teams,
    onCopy,
    copied = false,
    showMemberCount = true
  }: Props = $props();
</script>

{#if teams.length > 0}
  <div class="teams-grid">
    {#each teams as team, i}
      <div class="team-card">
        <h3>{team.name}</h3>
        <ul>
          {#each team.members as member}
            <li>{member}</li>
          {/each}
        </ul>
        {#if showMemberCount}
          <span class="member-count">{team.members.length} members</span>
        {/if}
      </div>
    {/each}
  </div>
  
  {#if onCopy}
    <div class="teams-actions">
      <button class="copy-btn" onclick={onCopy}>
        {copied ? '✓ Copied!' : '📋 Copy Teams'}
      </button>
    </div>
  {/if}
{/if}

<style>
  .teams-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 1rem;
  }
  
  .team-card {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    padding: 1rem;
  }
  
  .team-card h3 {
    font-size: 1rem;
    font-weight: 600;
    margin: 0 0 0.75rem;
    color: #a5b4fc;
  }
  
  .team-card ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }
  
  .team-card li {
    padding: 0.25rem 0;
    font-size: 0.875rem;
    color: #e4e4e7;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }
  
  .team-card li:last-child {
    border-bottom: none;
  }
  
  .member-count {
    display: block;
    margin-top: 0.75rem;
    font-size: 0.75rem;
    color: #71717a;
  }
  
  .teams-actions {
    margin-top: 1rem;
    display: flex;
    justify-content: center;
    gap: 0.75rem;
  }
  
  .copy-btn {
    padding: 0.625rem 1.25rem;
    background: rgba(255, 255, 255, 0.05);
    color: #d4d4d8;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .copy-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #f4f4f5;
  }
</style>
