import { describe, it, expect } from 'vitest';
import { slugify, generateUniqueSlug, isValidSlug } from './slug';

describe('slug utilities', () => {
	describe('slugify', () => {
		it('converts title to lowercase', () => {
			expect(slugify('Hello World')).toBe('hello-world');
		});

		it('replaces spaces with hyphens', () => {
			expect(slugify('multiple   spaces')).toBe('multiple-spaces');
		});

		it('replaces underscores with hyphens', () => {
			expect(slugify('hello_world_test')).toBe('hello-world-test');
		});

		it('removes special characters', () => {
			expect(slugify('Hello@World!#$%')).toBe('helloworld');
		});

		it('removes multiple consecutive hyphens', () => {
			expect(slugify('hello---world')).toBe('hello-world');
		});

		it('removes leading and trailing hyphens', () => {
			expect(slugify('-hello-world-')).toBe('hello-world');
		});

		it('handles empty strings', () => {
			expect(slugify('')).toBe('');
		});

		it('handles strings with only special characters', () => {
			expect(slugify('!@#$%^&*()')).toBe('');
		});

		it('trims whitespace', () => {
			expect(slugify('  hello world  ')).toBe('hello-world');
		});

		it('handles complex titles', () => {
			expect(slugify('unconf tools Lab - Team Shuffler 2024!')).toBe(
				'event-tools-lab-team-shuffler-2024'
			);
		});
	});

	describe('generateUniqueSlug', () => {
		it('generates a slug with a suffix', () => {
			const slug = generateUniqueSlug('Test Event');
			expect(slug).toMatch(/^test-event-[a-z0-9]{4}$/);
		});

		it('generates different slugs for the same title', () => {
			const slug1 = generateUniqueSlug('Test Event');
			const slug2 = generateUniqueSlug('Test Event');
			expect(slug1).not.toBe(slug2);
		});

		it('handles empty titles', () => {
			const slug = generateUniqueSlug('');
			expect(slug).toMatch(/^-[a-z0-9]{4}$/);
		});

		it('applies slugify rules before adding suffix', () => {
			const slug = generateUniqueSlug('Hello World!');
			expect(slug).toMatch(/^hello-world-[a-z0-9]{4}$/);
		});
	});

	describe('isValidSlug', () => {
		it('validates correct slugs', () => {
			expect(isValidSlug('hello-world')).toBe(true);
			expect(isValidSlug('test-event-123')).toBe(true);
			expect(isValidSlug('event')).toBe(true);
		});

		it('rejects uppercase letters', () => {
			expect(isValidSlug('Hello-World')).toBe(false);
		});

		it('rejects spaces', () => {
			expect(isValidSlug('hello world')).toBe(false);
		});

		it('rejects special characters', () => {
			expect(isValidSlug('hello@world')).toBe(false);
			expect(isValidSlug('hello_world')).toBe(false);
		});

		it('rejects leading/trailing hyphens', () => {
			expect(isValidSlug('-hello')).toBe(false);
			expect(isValidSlug('hello-')).toBe(false);
		});

		it('rejects consecutive hyphens', () => {
			expect(isValidSlug('hello--world')).toBe(false);
		});

		it('rejects empty strings', () => {
			expect(isValidSlug('')).toBe(false);
		});

		it('accepts numbers', () => {
			expect(isValidSlug('event-2024')).toBe(true);
			expect(isValidSlug('123-456')).toBe(true);
		});
	});
});
