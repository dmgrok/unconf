import { json } from '@sveltejs/kit';
import { handleCSPViolation, type CSPViolationReport } from '$lib/security/csp';
import { securityLogger } from '$lib/security/monitoring';
import type { RequestHandler } from './$types';

/**
 * CSP Violation Reporting Endpoint
 *
 * Receives and processes Content Security Policy violation reports
 * from browsers when CSP violations occur.
 */
export const POST: RequestHandler = async ({ request }) => {
  try {
    const contentType = request.headers.get('content-type') || '';

    let violationReport: { 'csp-report': CSPViolationReport };

    if (contentType.includes('application/csp-report')) {
      // Standard CSP report format
      violationReport = await request.json();
    } else if (contentType.includes('application/json')) {
      // Some browsers might send as regular JSON
      violationReport = await request.json();
    } else {
      return json({ error: 'Invalid content type' }, { status: 400 });
    }

    // Validate the report structure
    if (!violationReport['csp-report']) {
      return json({ error: 'Invalid CSP report format' }, { status: 400 });
    }

    // Process the violation report
    handleCSPViolation(violationReport['csp-report']);

    // Log to security monitoring system
    securityLogger.logCSPViolation(violationReport['csp-report']);

    return json({ received: true }, { status: 200 });
  } catch (error) {
    console.error('Error processing CSP violation report:', error);
    return json({ error: 'Failed to process report' }, { status: 500 });
  }
};