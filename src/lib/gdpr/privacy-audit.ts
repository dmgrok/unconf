/**
 * Privacy Audit Trail Service
 * Comprehensive logging of all privacy-related actions for GDPR compliance
 */

export enum PrivacyActionType {
	DATA_EXPORT = 'data_export',
	DATA_DELETION = 'data_deletion',
	CONSENT_GRANTED = 'consent_granted',
	CONSENT_WITHDRAWN = 'consent_withdrawn',
	ACCESS_REQUEST = 'access_request',
	RECTIFICATION = 'rectification',
	ANONYMIZATION = 'anonymization',
	DATA_BREACH = 'data_breach',
	POLICY_UPDATE = 'policy_update'
}

export interface AuditEntry {
	id: string;
	userId: string;
	actionType: PrivacyActionType;
	timestamp: Date;
	ipAddress?: string;
	userAgent?: string;
	details: Record<string, any>;
	performedBy?: string; // Admin user if applicable
}

export class PrivacyAuditService {
	private auditLog: AuditEntry[] = [];

	/**
	 * Log privacy action
	 */
	async logAction(
		userId: string,
		actionType: PrivacyActionType,
		details: Record<string, any>,
		metadata?: {
			ipAddress?: string;
			userAgent?: string;
			performedBy?: string;
		}
	): Promise<AuditEntry> {
		const entry: AuditEntry = {
			id: this.generateId(),
			userId,
			actionType,
			timestamp: new Date(),
			ipAddress: metadata?.ipAddress,
			userAgent: metadata?.userAgent,
			details,
			performedBy: metadata?.performedBy
		};

		this.auditLog.push(entry);

		// In real implementation: persist to database
		// Store in append-only table for immutability
		// Encrypt sensitive fields

		return entry;
	}

	/**
	 * Get audit trail for user
	 */
	getUserAuditTrail(userId: string): AuditEntry[] {
		return this.auditLog
			.filter((entry) => entry.userId === userId)
			.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
	}

	/**
	 * Get audit trail by action type
	 */
	getAuditByType(actionType: PrivacyActionType): AuditEntry[] {
		return this.auditLog.filter((entry) => entry.actionType === actionType);
	}

	/**
	 * Get audit trail within date range
	 */
	getAuditByDateRange(startDate: Date, endDate: Date): AuditEntry[] {
		return this.auditLog.filter(
			(entry) => entry.timestamp >= startDate && entry.timestamp <= endDate
		);
	}

	/**
	 * Search audit trail
	 */
	searchAudit(query: {
		userId?: string;
		actionType?: PrivacyActionType;
		startDate?: Date;
		endDate?: Date;
		performedBy?: string;
	}): AuditEntry[] {
		let results = this.auditLog;

		if (query.userId) {
			results = results.filter((e) => e.userId === query.userId);
		}

		if (query.actionType) {
			results = results.filter((e) => e.actionType === query.actionType);
		}

		if (query.startDate) {
			results = results.filter((e) => e.timestamp >= query.startDate!);
		}

		if (query.endDate) {
			results = results.filter((e) => e.timestamp <= query.endDate!);
		}

		if (query.performedBy) {
			results = results.filter((e) => e.performedBy === query.performedBy);
		}

		return results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
	}

	/**
	 * Generate compliance report
	 */
	generateComplianceReport(
		startDate: Date,
		endDate: Date
	): {
		period: { start: Date; end: Date };
		statistics: {
			totalActions: number;
			byType: Record<PrivacyActionType, number>;
			uniqueUsers: number;
		};
		entries: AuditEntry[];
	} {
		const entries = this.getAuditByDateRange(startDate, endDate);

		const byType: Record<PrivacyActionType, number> = {} as any;
		for (const type of Object.values(PrivacyActionType)) {
			byType[type] = entries.filter((e) => e.actionType === type).length;
		}

		const uniqueUsers = new Set(entries.map((e) => e.userId)).size;

		return {
			period: { start: startDate, end: endDate },
			statistics: {
				totalActions: entries.length,
				byType,
				uniqueUsers
			},
			entries
		};
	}

	/**
	 * Export audit trail for user (GDPR compliance)
	 */
	exportUserAudit(userId: string): string {
		const entries = this.getUserAuditTrail(userId);

		return `
Privacy Audit Trail Export
User ID: ${userId}
Export Date: ${new Date().toISOString()}

Total Actions: ${entries.length}

Detailed Log:
${entries
	.map(
		(entry) => `
[${entry.timestamp.toISOString()}] ${entry.actionType}
  - Entry ID: ${entry.id}
  - Details: ${JSON.stringify(entry.details, null, 2)}
  ${entry.performedBy ? `- Performed by: ${entry.performedBy}` : ''}
`
	)
	.join('\n')}
		`.trim();
	}

	/**
	 * Verify audit trail integrity
	 */
	verifyIntegrity(): {
		valid: boolean;
		totalEntries: number;
		issues: string[];
	} {
		const issues: string[] = [];

		// Check for duplicate IDs
		const ids = this.auditLog.map((e) => e.id);
		const uniqueIds = new Set(ids);
		if (ids.length !== uniqueIds.size) {
			issues.push('Duplicate entry IDs found');
		}

		// Check for chronological order issues
		for (let i = 1; i < this.auditLog.length; i++) {
			if (this.auditLog[i].timestamp < this.auditLog[i - 1].timestamp) {
				issues.push(`Chronological order violation at index ${i}`);
			}
		}

		// Check for required fields
		for (const entry of this.auditLog) {
			if (!entry.id || !entry.userId || !entry.actionType || !entry.timestamp) {
				issues.push(`Missing required fields in entry ${entry.id}`);
			}
		}

		return {
			valid: issues.length === 0,
			totalEntries: this.auditLog.length,
			issues
		};
	}

	/**
	 * Generate unique ID
	 */
	private generateId(): string {
		return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
	}

	/**
	 * Helper: Log data export
	 */
	async logDataExport(userId: string, format: string): Promise<AuditEntry> {
		return this.logAction(userId, PrivacyActionType.DATA_EXPORT, { format });
	}

	/**
	 * Helper: Log data deletion
	 */
	async logDataDeletion(userId: string, recordsAffected: any): Promise<AuditEntry> {
		return this.logAction(userId, PrivacyActionType.DATA_DELETION, { recordsAffected });
	}

	/**
	 * Helper: Log consent change
	 */
	async logConsentChange(
		userId: string,
		consentType: string,
		granted: boolean
	): Promise<AuditEntry> {
		return this.logAction(
			userId,
			granted ? PrivacyActionType.CONSENT_GRANTED : PrivacyActionType.CONSENT_WITHDRAWN,
			{ consentType }
		);
	}

	/**
	 * Helper: Log data breach
	 */
	async logDataBreach(details: {
		affectedUsers: string[];
		dataTypes: string[];
		severity: string;
		mitigationSteps: string[];
	}): Promise<AuditEntry[]> {
		const entries: AuditEntry[] = [];

		for (const userId of details.affectedUsers) {
			const entry = await this.logAction(userId, PrivacyActionType.DATA_BREACH, {
				dataTypes: details.dataTypes,
				severity: details.severity,
				mitigationSteps: details.mitigationSteps
			});
			entries.push(entry);
		}

		return entries;
	}
}

export const privacyAuditService = new PrivacyAuditService();
