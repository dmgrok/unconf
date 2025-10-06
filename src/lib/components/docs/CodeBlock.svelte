<script lang="ts">
	import { onMount } from 'svelte';

	let {
		code = '',
		language = 'text',
		filename = '',
		showLineNumbers = false,
		highlightLines = [] as number[]
	}: {
		code?: string;
		language?: string;
		filename?: string;
		showLineNumbers?: boolean;
		highlightLines?: number[];
	} = $props();

	let copied = $state(false);
	let codeEl: HTMLElement;

	async function copyToClipboard() {
		try {
			await navigator.clipboard.writeText(code);
			copied = true;
			setTimeout(() => {
				copied = false;
			}, 2000);
		} catch (err) {
			console.error('Failed to copy:', err);
		}
	}

	// Simple syntax highlighting for common languages
	const highlightedCode = $derived.by(() => {
		const lines = code.split('\n');

		return lines.map((line, index) => {
			const lineNumber = index + 1;
			const isHighlighted = highlightLines.includes(lineNumber);
			const escapedLine = escapeHtml(line);

			// Apply basic syntax highlighting based on language
			const highlighted = applySyntaxHighlighting(escapedLine, language);

			return {
				number: lineNumber,
				content: highlighted,
				highlighted: isHighlighted
			};
		});
	});

	function escapeHtml(text: string): string {
		const div = document.createElement('div');
		div.textContent = text;
		return div.innerHTML;
	}

	function applySyntaxHighlighting(line: string, lang: string): string {
		if (lang === 'javascript' || lang === 'typescript' || lang === 'js' || lang === 'ts') {
			return line
				.replace(/\b(const|let|var|function|if|else|return|import|export|from|async|await|class|extends|new|this|super|static|typeof|instanceof)\b/g, '<span class="keyword">$1</span>')
				.replace(/\b(true|false|null|undefined)\b/g, '<span class="boolean">$1</span>')
				.replace(/\b(\d+)\b/g, '<span class="number">$1</span>')
				.replace(/(\/\/.*$)/g, '<span class="comment">$1</span>')
				.replace(/(['""`])(.*?)\1/g, '<span class="string">$1$2$1</span>');
		} else if (lang === 'html' || lang === 'svelte') {
			return line
				.replace(/(&lt;\/?[\w-]+)/g, '<span class="tag">$1</span>')
				.replace(/(\w+)=/g, '<span class="attribute">$1</span>=')
				.replace(/(['""`])(.*?)\1/g, '<span class="string">$1$2$1</span>');
		} else if (lang === 'css') {
			return line
				.replace(/(\.[a-zA-Z][\w-]*|\#[a-zA-Z][\w-]*)/g, '<span class="selector">$1</span>')
				.replace(/([a-z-]+):/g, '<span class="property">$1</span>:')
				.replace(/(['""`])(.*?)\1/g, '<span class="string">$1$2$1</span>');
		} else if (lang === 'bash' || lang === 'shell' || lang === 'sh') {
			return line
				.replace(/^(\$|#)\s/g, '<span class="prompt">$1</span> ')
				.replace(/\b(npm|git|cd|ls|mkdir|rm|mv|cp|echo|cat|grep|sed|awk)\b/g, '<span class="command">$1</span>')
				.replace(/--?[\w-]+/g, '<span class="flag">$&</span>');
		}

		return line;
	}
</script>

<div class="code-block">
	{#if filename}
		<div class="code-header">
			<div class="filename">
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
				</svg>
				{filename}
			</div>
			<button class="copy-btn" onclick={copyToClipboard} aria-label="Copy code">
				{#if copied}
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
					</svg>
					Copied!
				{:else}
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
					</svg>
					Copy
				{/if}
			</button>
		</div>
	{:else}
		<button class="copy-btn floating" onclick={copyToClipboard} aria-label="Copy code">
			{#if copied}
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
				</svg>
			{:else}
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
				</svg>
			{/if}
		</button>
	{/if}

	<pre class="code-content" class:with-line-numbers={showLineNumbers}><code bind:this={codeEl}>{#each highlightedCode as line}<span class="code-line" class:highlighted={line.highlighted}>{#if showLineNumbers}<span class="line-number">{line.number}</span>{/if}<span class="line-content">{@html line.content}</span>
</span>{/each}</code></pre>
</div>

<style>
	.code-block {
		position: relative;
		background: #1e293b;
		border-radius: 12px;
		margin: 1.5rem 0;
		overflow: hidden;
		border: 1px solid #334155;
	}

	.code-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.75rem 1rem;
		background: #0f172a;
		border-bottom: 1px solid #334155;
	}

	.filename {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: #94a3b8;
		font-family: var(--font-family-mono);
	}

	.filename svg {
		color: #64748b;
	}

	.copy-btn {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.375rem 0.75rem;
		background: transparent;
		border: 1px solid #334155;
		border-radius: 6px;
		color: #94a3b8;
		font-size: 0.8125rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.copy-btn:hover {
		background: #334155;
		color: #e2e8f0;
	}

	.copy-btn.floating {
		position: absolute;
		top: 0.75rem;
		right: 0.75rem;
		z-index: 10;
		background: #0f172a;
	}

	.code-content {
		margin: 0;
		padding: 1.25rem;
		overflow-x: auto;
		font-family: var(--font-family-mono);
		font-size: 0.875rem;
		line-height: 1.7;
		color: #e2e8f0;
	}

	.code-content code {
		display: block;
	}

	.code-line {
		display: flex;
	}

	.code-line.highlighted {
		background: rgba(59, 130, 246, 0.1);
		border-left: 3px solid #3b82f6;
		margin-left: -1.25rem;
		padding-left: calc(1.25rem - 3px);
	}

	.with-line-numbers .code-line {
		padding-left: 0.5rem;
	}

	.line-number {
		display: inline-block;
		width: 3em;
		margin-right: 1rem;
		color: #64748b;
		text-align: right;
		user-select: none;
		flex-shrink: 0;
	}

	.line-content {
		flex: 1;
	}

	/* Syntax highlighting */
	:global(.code-content .keyword) {
		color: #c792ea;
	}

	:global(.code-content .boolean) {
		color: #f78c6c;
	}

	:global(.code-content .number) {
		color: #f78c6c;
	}

	:global(.code-content .string) {
		color: #c3e88d;
	}

	:global(.code-content .comment) {
		color: #697098;
		font-style: italic;
	}

	:global(.code-content .tag) {
		color: #f07178;
	}

	:global(.code-content .attribute) {
		color: #c792ea;
	}

	:global(.code-content .selector) {
		color: #82aaff;
	}

	:global(.code-content .property) {
		color: #82aaff;
	}

	:global(.code-content .command) {
		color: #89ddff;
	}

	:global(.code-content .prompt) {
		color: #64748b;
	}

	:global(.code-content .flag) {
		color: #c792ea;
	}

	/* Scrollbar styling */
	.code-content::-webkit-scrollbar {
		height: 8px;
	}

	.code-content::-webkit-scrollbar-track {
		background: #0f172a;
	}

	.code-content::-webkit-scrollbar-thumb {
		background: #334155;
		border-radius: 4px;
	}

	.code-content::-webkit-scrollbar-thumb:hover {
		background: #475569;
	}

	@media (max-width: 640px) {
		.code-content {
			font-size: 0.8125rem;
			padding: 1rem;
		}
	}
</style>
