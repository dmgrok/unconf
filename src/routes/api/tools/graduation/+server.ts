/**
 * GET /api/tools/graduation
 * 
 * Get graduation status for preview tools.
 * Shows which tools are eligible to graduate to standard.
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { 
	getAllToolMetrics, 
	evaluateGraduation,
	type GraduationResult 
} from '$lib/feature-flags/server';

export interface ToolGraduationStatus {
	toolId: string;
	result: GraduationResult;
}

export const GET: RequestHandler = async ({ locals }) => {
	const user = locals.user;
	
	// Only organizers can view graduation status
	if (user?.role !== 'organizer') {
		return json({ error: 'Unauthorized' }, { status: 403 });
	}
	
	const allMetrics = getAllToolMetrics();
	
	const graduationStatuses: ToolGraduationStatus[] = allMetrics.map(metrics => ({
		toolId: metrics.toolId,
		result: evaluateGraduation(metrics),
	}));
	
	// Separate by recommendation
	const readyToGraduate = graduationStatuses.filter(s => s.result.recommendation === 'graduate');
	const continuePreview = graduationStatuses.filter(s => s.result.recommendation === 'continue_preview');
	const shouldDeprecate = graduationStatuses.filter(s => s.result.recommendation === 'deprecate');
	
	return json({
		summary: {
			total: graduationStatuses.length,
			readyToGraduate: readyToGraduate.length,
			continuePreview: continuePreview.length,
			shouldDeprecate: shouldDeprecate.length,
		},
		tools: {
			readyToGraduate,
			continuePreview,
			shouldDeprecate,
		},
		allStatuses: graduationStatuses,
	});
};
