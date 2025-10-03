import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getStorage } from '../../../../lib/storage/index.js';
import { TemplateCategory } from '../../../../types/enums.js';
import type { EventTemplate } from '../../../../types/entities.js';

interface SearchFilters {
	query?: string;
	categories?: TemplateCategory[];
	creator?: string;
	tags?: string[];
	minUsageCount?: number;
	maxUsageCount?: number;
	isPublic?: boolean;
	includeSharedWith?: boolean;
	createdAfter?: Date;
	createdBefore?: Date;
	lastUsedAfter?: Date;
	lastUsedBefore?: Date;
}

interface SortOptions {
	sortBy?: 'name' | 'createdAt' | 'lastUsedAt' | 'usageCount' | 'relevance';
	sortOrder?: 'asc' | 'desc';
}

interface PaginationOptions {
	limit?: number;
	offset?: number;
}

export const GET: RequestHandler = async ({ url }) => {
	try {
		const storage = getStorage();
		const searchParams = url.searchParams;

		const userId = searchParams.get('userId');
		if (!userId) {
			return json({ success: false, error: 'User ID required' }, { status: 400 });
		}

		// Parse search filters
		const filters: SearchFilters = {
			query: searchParams.get('q') || undefined,
			categories: searchParams.get('categories')?.split(',').filter(Boolean) as TemplateCategory[] || undefined,
			creator: searchParams.get('creator') || undefined,
			tags: searchParams.get('tags')?.split(',').filter(Boolean) || undefined,
			minUsageCount: searchParams.get('minUsage') ? parseInt(searchParams.get('minUsage')!) : undefined,
			maxUsageCount: searchParams.get('maxUsage') ? parseInt(searchParams.get('maxUsage')!) : undefined,
			isPublic: searchParams.get('isPublic') ? searchParams.get('isPublic') === 'true' : undefined,
			includeSharedWith: searchParams.get('includeShared') !== 'false', // default true
			createdAfter: searchParams.get('createdAfter') ? new Date(searchParams.get('createdAfter')!) : undefined,
			createdBefore: searchParams.get('createdBefore') ? new Date(searchParams.get('createdBefore')!) : undefined,
			lastUsedAfter: searchParams.get('lastUsedAfter') ? new Date(searchParams.get('lastUsedAfter')!) : undefined,
			lastUsedBefore: searchParams.get('lastUsedBefore') ? new Date(searchParams.get('lastUsedBefore')!) : undefined
		};

		// Parse sort options
		const sortOptions: SortOptions = {
			sortBy: (searchParams.get('sortBy') as SortOptions['sortBy']) || 'relevance',
			sortOrder: (searchParams.get('sortOrder') as SortOptions['sortOrder']) || 'desc'
		};

		// Parse pagination
		const pagination: PaginationOptions = {
			limit: Math.min(parseInt(searchParams.get('limit') || '20'), 100), // Max 100
			offset: parseInt(searchParams.get('offset') || '0')
		};

		// Get all templates accessible to user
		const data = await storage.eventTemplates.readData();
		if (!data) {
			return json({ success: false, error: 'Failed to read templates' }, { status: 500 });
		}

		// Apply access control filter
		let filteredTemplates = data.filter(template => {
			return template.isPublic ||
				   template.createdBy === userId ||
				   (filters.includeSharedWith && template.sharedWith.includes(userId));
		});

		// Apply search filters
		filteredTemplates = applySearchFilters(filteredTemplates, filters);

		// Calculate relevance scores if needed
		if (sortOptions.sortBy === 'relevance' && filters.query) {
			filteredTemplates = filteredTemplates.map(template => ({
				...template,
				_relevanceScore: calculateRelevanceScore(template, filters.query!)
			}));
		}

		// Apply sorting
		filteredTemplates = applySorting(filteredTemplates, sortOptions, filters.query);

		// Get total count before pagination
		const totalCount = filteredTemplates.length;

		// Apply pagination
		const paginatedTemplates = filteredTemplates.slice(
			pagination.offset || 0,
			(pagination.offset || 0) + (pagination.limit || 20)
		);

		// Remove relevance score from response
		const cleanTemplates = paginatedTemplates.map(template => {
			const { _relevanceScore, ...cleanTemplate } = template as any;
			return cleanTemplate;
		});

		// Get category statistics
		const categoryStats = getCategoryStatistics(data, userId, filters.includeSharedWith);

		// Get popular tags
		const popularTags = getPopularTags(data, userId, filters.includeSharedWith);

		return json({
			success: true,
			templates: cleanTemplates,
			pagination: {
				total: totalCount,
				limit: pagination.limit || 20,
				offset: pagination.offset || 0,
				hasMore: (pagination.offset || 0) + (pagination.limit || 20) < totalCount
			},
			filters: filters,
			sort: sortOptions,
			metadata: {
				categoryStats,
				popularTags,
				totalAccessible: data.filter(t =>
					t.isPublic || t.createdBy === userId ||
					(filters.includeSharedWith && t.sharedWith.includes(userId))
				).length
			}
		});

	} catch (error) {
		console.error('Error searching templates:', error);
		return json(
			{ success: false, error: 'Failed to search templates' },
			{ status: 500 }
		);
	}
};

function applySearchFilters(templates: EventTemplate[], filters: SearchFilters): EventTemplate[] {
	return templates.filter(template => {
		// Text search
		if (filters.query) {
			const query = filters.query.toLowerCase();
			const searchFields = [
				template.name.toLowerCase(),
				template.description?.toLowerCase() || '',
				template.category.toLowerCase(),
				...(template.tags?.map(tag => tag.toLowerCase()) || [])
			];

			if (!searchFields.some(field => field.includes(query))) {
				return false;
			}
		}

		// Category filter
		if (filters.categories && filters.categories.length > 0) {
			if (!filters.categories.includes(template.category as TemplateCategory)) {
				return false;
			}
		}

		// Creator filter
		if (filters.creator && template.createdBy !== filters.creator) {
			return false;
		}

		// Tags filter (template must have at least one of the specified tags)
		if (filters.tags && filters.tags.length > 0) {
			const templateTags = template.tags || [];
			if (!filters.tags.some(tag => templateTags.includes(tag))) {
				return false;
			}
		}

		// Usage count filters
		if (filters.minUsageCount !== undefined && template.usageCount < filters.minUsageCount) {
			return false;
		}
		if (filters.maxUsageCount !== undefined && template.usageCount > filters.maxUsageCount) {
			return false;
		}

		// Public filter
		if (filters.isPublic !== undefined && template.isPublic !== filters.isPublic) {
			return false;
		}

		// Date filters
		if (filters.createdAfter && template.createdAt < filters.createdAfter) {
			return false;
		}
		if (filters.createdBefore && template.createdAt > filters.createdBefore) {
			return false;
		}
		if (filters.lastUsedAfter && (!template.lastUsedAt || template.lastUsedAt < filters.lastUsedAfter)) {
			return false;
		}
		if (filters.lastUsedBefore && template.lastUsedAt && template.lastUsedAt > filters.lastUsedBefore) {
			return false;
		}

		return true;
	});
}

function calculateRelevanceScore(template: EventTemplate, query: string): number {
	const queryLower = query.toLowerCase();
	let score = 0;

	// Name match (highest weight)
	if (template.name.toLowerCase().includes(queryLower)) {
		score += 10;
		// Exact match bonus
		if (template.name.toLowerCase() === queryLower) {
			score += 20;
		}
		// Starts with query bonus
		if (template.name.toLowerCase().startsWith(queryLower)) {
			score += 10;
		}
	}

	// Description match
	if (template.description && template.description.toLowerCase().includes(queryLower)) {
		score += 5;
	}

	// Category match
	if (template.category.toLowerCase().includes(queryLower)) {
		score += 7;
	}

	// Tags match
	if (template.tags) {
		template.tags.forEach(tag => {
			if (tag.toLowerCase().includes(queryLower)) {
				score += 6;
				// Exact tag match bonus
				if (tag.toLowerCase() === queryLower) {
					score += 10;
				}
			}
		});
	}

	// Usage count boost (normalize to 0-5 range)
	score += Math.min(template.usageCount / 10, 5);

	// Recent usage boost
	if (template.lastUsedAt) {
		const daysSinceUsed = (Date.now() - template.lastUsedAt.getTime()) / (1000 * 60 * 60 * 24);
		if (daysSinceUsed < 30) {
			score += Math.max(0, 3 - daysSinceUsed / 10);
		}
	}

	return score;
}

function applySorting(templates: (EventTemplate & { _relevanceScore?: number })[], sortOptions: SortOptions, query?: string): (EventTemplate & { _relevanceScore?: number })[] {
	return templates.sort((a, b) => {
		let comparison = 0;

		switch (sortOptions.sortBy) {
			case 'name':
				comparison = a.name.localeCompare(b.name);
				break;
			case 'createdAt':
				comparison = a.createdAt.getTime() - b.createdAt.getTime();
				break;
			case 'lastUsedAt':
				const aLastUsed = a.lastUsedAt?.getTime() || 0;
				const bLastUsed = b.lastUsedAt?.getTime() || 0;
				comparison = aLastUsed - bLastUsed;
				break;
			case 'usageCount':
				comparison = a.usageCount - b.usageCount;
				break;
			case 'relevance':
			default:
				if (query && a._relevanceScore !== undefined && b._relevanceScore !== undefined) {
					comparison = a._relevanceScore - b._relevanceScore;
				} else {
					// Fallback to usage count + recency
					comparison = (b.usageCount - a.usageCount) ||
								(b.createdAt.getTime() - a.createdAt.getTime());
				}
				break;
		}

		return sortOptions.sortOrder === 'desc' ? -comparison : comparison;
	});
}

function getCategoryStatistics(templates: EventTemplate[], userId: string, includeSharedWith: boolean = true): Record<string, number> {
	const accessibleTemplates = templates.filter(template =>
		template.isPublic ||
		template.createdBy === userId ||
		(includeSharedWith && template.sharedWith.includes(userId))
	);

	const categoryCount: Record<string, number> = {};

	accessibleTemplates.forEach(template => {
		categoryCount[template.category] = (categoryCount[template.category] || 0) + 1;
	});

	return categoryCount;
}

function getPopularTags(templates: EventTemplate[], userId: string, includeSharedWith: boolean = true, limit: number = 20): Array<{ tag: string; count: number }> {
	const accessibleTemplates = templates.filter(template =>
		template.isPublic ||
		template.createdBy === userId ||
		(includeSharedWith && template.sharedWith.includes(userId))
	);

	const tagCount: Record<string, number> = {};

	accessibleTemplates.forEach(template => {
		if (template.tags) {
			template.tags.forEach(tag => {
				tagCount[tag] = (tagCount[tag] || 0) + 1;
			});
		}
	});

	return Object.entries(tagCount)
		.map(([tag, count]) => ({ tag, count }))
		.sort((a, b) => b.count - a.count)
		.slice(0, limit);
}