import { describe, it, expect } from 'vitest';
import { sanitizeHtml, sanitizeUrl } from './xss';

describe('sanitizeHtml', () => {
	it('removes script elements', () => {
		expect(sanitizeHtml('<p>hi</p><script>alert(1)</script>')).toBe('<p>hi</p>');
	});

	it('removes inline event handlers', () => {
		expect(sanitizeHtml('<b onclick="alert(1)">bold</b>')).toBe('<b>bold</b>');
	});

	it('removes javascript: links but keeps the link text', () => {
		expect(sanitizeHtml('<a href="javascript:alert(1)">x</a>')).toBe('<a>x</a>');
	});

	it('keeps safe links and allowed attributes', () => {
		const html = '<a href="https://example.com" title="Example">x</a>';
		expect(sanitizeHtml(html)).toBe(html);
	});

	it('drops elements outside the strict allow-list together with their content', () => {
		expect(sanitizeHtml('<a href="https://example.com">link</a>', 'strict')).toBe('');
	});

	it('removes iframes and image error handlers', () => {
		expect(sanitizeHtml('<iframe src="https://evil.example"></iframe><img src=x onerror=alert(1)>')).toBe('');
	});

	it('returns an empty string for empty input', () => {
		expect(sanitizeHtml('')).toBe('');
	});
});

describe('sanitizeUrl', () => {
	it.each(['javascript:alert(1)', 'JaVaScRiPt:alert(1)', 'data:text/html,<script>', 'vbscript:x'])(
		'rejects dangerous protocol %s',
		(url) => {
			expect(sanitizeUrl(url)).toBe('');
		}
	);

	it('keeps absolute http(s) and root-relative URLs', () => {
		expect(sanitizeUrl('https://example.com/a')).toBe('https://example.com/a');
		expect(sanitizeUrl('/events/1')).toBe('/events/1');
	});

	it('makes bare paths root-relative', () => {
		expect(sanitizeUrl('events/1')).toBe('/events/1');
	});
});
