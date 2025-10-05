/**
 * Generate a URL-friendly slug from a title
 * @param title - The title to slugify
 * @returns A URL-safe slug
 */
export function slugify(title: string): string {
	return title
		.toLowerCase()
		.trim()
		// Replace spaces and underscores with hyphens
		.replace(/[\s_]+/g, '-')
		// Remove special characters except hyphens
		.replace(/[^\w-]+/g, '')
		// Remove multiple consecutive hyphens
		.replace(/--+/g, '-')
		// Remove leading/trailing hyphens
		.replace(/^-+|-+$/g, '');
}

/**
 * Generate a unique slug by appending a short random suffix
 * @param title - The title to slugify
 * @returns A unique URL-safe slug
 */
export function generateUniqueSlug(title: string): string {
	const baseSlug = slugify(title);
	const suffix = Math.random().toString(36).substring(2, 6);
	return `${baseSlug}-${suffix}`;
}

/**
 * Validate if a string is a valid slug format
 * @param slug - The slug to validate
 * @returns True if valid, false otherwise
 */
export function isValidSlug(slug: string): boolean {
	return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}
