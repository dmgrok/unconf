// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { render } from 'svelte/server';
import CodeBlock from './CodeBlock.svelte';

describe('CodeBlock server rendering', () => {
	it('renders without a DOM and escapes markup in the code', () => {
		const { body } = render(CodeBlock, {
			props: { code: '<script>alert(1)</script> & more', language: 'text' }
		});

		expect(body).toContain('&lt;script&gt;alert(1)&lt;/script&gt; &amp; more');
		expect(body).not.toContain('<script>alert(1)');
	});
});
