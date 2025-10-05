<script lang="ts">
	interface Step {
		label: string;
		icon?: string;
	}

	let { steps, currentStep = 0 }: { steps: Step[]; currentStep?: number } = $props();
</script>

<div class="progress-steps">
	{#each steps as step, index}
		<div class="step" class:active={index === currentStep} class:completed={index < currentStep}>
			<div class="step-indicator">
				{#if index < currentStep}
					<svg
						width="20"
						height="20"
						viewBox="0 0 20 20"
						fill="none"
						xmlns="http://www.w3.org/2000/svg"
					>
						<path
							d="M16.6667 5L7.50004 14.1667L3.33337 10"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						/>
					</svg>
				{:else if step.icon}
					<span class="step-icon">{step.icon}</span>
				{:else}
					<span class="step-number">{index + 1}</span>
				{/if}
			</div>
			<div class="step-label">{step.label}</div>
			{#if index < steps.length - 1}
				<div class="step-connector" class:completed={index < currentStep}></div>
			{/if}
		</div>
	{/each}
</div>

<style>
	.progress-steps {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		position: relative;
		padding: var(--spacing-6) 0;
	}

	.step {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--spacing-2);
		position: relative;
		flex: 1;
	}

	.step-indicator {
		width: 40px;
		height: 40px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-surface-secondary);
		border: 2px solid var(--color-border);
		color: var(--color-text-tertiary);
		font-weight: var(--font-weight-semibold);
		transition: all var(--transition-base);
		position: relative;
		z-index: 1;
	}

	.step.active .step-indicator {
		background: var(--color-primary);
		border-color: var(--color-primary);
		color: white;
		box-shadow: 0 0 0 4px var(--color-focus-outline);
	}

	.step.completed .step-indicator {
		background: var(--color-success);
		border-color: var(--color-success);
		color: white;
	}

	.step-number,
	.step-icon {
		font-size: var(--font-size-base);
	}

	.step-label {
		font-size: var(--font-size-sm);
		font-weight: var(--font-weight-medium);
		color: var(--color-text-tertiary);
		text-align: center;
		max-width: 120px;
		transition: color var(--transition-fast);
	}

	.step.active .step-label {
		color: var(--color-primary);
		font-weight: var(--font-weight-semibold);
	}

	.step.completed .step-label {
		color: var(--color-text-secondary);
	}

	.step-connector {
		position: absolute;
		top: 20px;
		left: 50%;
		width: 100%;
		height: 2px;
		background: var(--color-border);
		transform: translateY(-50%);
		transition: background-color var(--transition-base);
	}

	.step-connector.completed {
		background: var(--color-success);
	}

	@media (max-width: 768px) {
		.progress-steps {
			padding: var(--spacing-4) 0;
		}

		.step-indicator {
			width: 32px;
			height: 32px;
		}

		.step-label {
			font-size: var(--font-size-xs);
			max-width: 80px;
		}

		.step-connector {
			top: 16px;
		}
	}
</style>
