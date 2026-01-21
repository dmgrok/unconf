<script lang="ts">
  interface Props {
    /** Current team size value */
    teamSize: number;
    /** Minimum team size */
    min?: number;
    /** Maximum team size */
    max: number;
    /** Total number of participants */
    totalPeople: number;
    /** Callback when team size changes */
    onChange: (size: number) => void;
  }
  
  let { 
    teamSize,
    min = 2,
    max,
    totalPeople,
    onChange
  }: Props = $props();
  
  let teamCount = $derived(Math.ceil(totalPeople / teamSize));
  
  function decrease() {
    if (teamSize > min) {
      onChange(teamSize - 1);
    }
  }
  
  function increase() {
    if (teamSize < max) {
      onChange(teamSize + 1);
    }
  }
</script>

<div class="team-size-control">
  <label>
    <span>Team size</span>
    <div class="size-input">
      <button 
        class="size-btn" 
        onclick={decrease}
        disabled={teamSize <= min}
        aria-label="Decrease team size"
      >−</button>
      <span class="size-value">{teamSize}</span>
      <button 
        class="size-btn" 
        onclick={increase}
        disabled={teamSize >= max}
        aria-label="Increase team size"
      >+</button>
    </div>
  </label>
  <span class="team-count">
    → {teamCount} team{teamCount !== 1 ? 's' : ''}
  </span>
</div>

<style>
  .team-size-control {
    display: flex;
    align-items: center;
    gap: 1rem;
  }
  
  .team-size-control label {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  
  .team-size-control label span {
    font-weight: 500;
    color: #d4d4d8;
  }
  
  .size-input {
    display: flex;
    align-items: center;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    overflow: hidden;
  }
  
  .size-btn {
    width: 36px;
    height: 36px;
    border: none;
    background: none;
    font-size: 1.25rem;
    cursor: pointer;
    color: #e4e4e7;
    transition: background 0.2s;
  }
  
  .size-btn:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.1);
  }
  
  .size-btn:disabled {
    color: #52525b;
    cursor: not-allowed;
  }
  
  .size-value {
    width: 40px;
    text-align: center;
    font-weight: 600;
    font-size: 1.125rem;
    color: #f4f4f5;
  }
  
  .team-count {
    color: #a1a1aa;
    font-size: 0.875rem;
  }
</style>
