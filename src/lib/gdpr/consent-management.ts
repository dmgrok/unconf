/**
 * GDPR Consent Management Service
 * Handles user consent tracking and privacy notices (GDPR Article 7)
 */

export enum ConsentType {
	ESSENTIAL = 'essential', // Required for service
	ANALYTICS = 'analytics', // Usage tracking
	MARKETING = 'marketing', // Marketing communications
	PERSONALIZATION = 'personalization', // Personalized content
	THIRD_PARTY = 'third_party' // Third-party integrations
}

export interface ConsentRecord {
	userId: string;
	consentType: ConsentType;
	granted: boolean;
	timestamp: Date;
	ipAddress?: string;
	userAgent?: string;
	version: string; // Privacy policy version
	method: 'explicit' | 'implicit'; // How consent was obtained
}

export interface PrivacyNotice {
	version: string;
	effectiveDate: Date;
	content: string;
	changes?: string[]; // Summary of changes from previous version
}

export class ConsentManagementService {
	private consents: Map<string, ConsentRecord[]> = new Map();
	private currentPolicyVersion = '1.0.0';

	/**
	 * Record user consent
	 */
	async recordConsent(
		userId: string,
		consentType: ConsentType,
		granted: boolean,
		metadata?: {
			ipAddress?: string;
			userAgent?: string;
			method?: 'explicit' | 'implicit';
		}
	): Promise<ConsentRecord> {
		const record: ConsentRecord = {
			userId,
			consentType,
			granted,
			timestamp: new Date(),
			ipAddress: metadata?.ipAddress,
			userAgent: metadata?.userAgent,
			version: this.currentPolicyVersion,
			method: metadata?.method || 'explicit'
		};

		// Store in database
		const userConsents = this.consents.get(userId) || [];
		userConsents.push(record);
		this.consents.set(userId, userConsents);

		return record;
	}

	/**
	 * Get user's current consents
	 */
	getUserConsents(userId: string): Map<ConsentType, boolean> {
		const userConsents = this.consents.get(userId) || [];
		const currentConsents = new Map<ConsentType, boolean>();

		// Get most recent consent for each type
		for (const consentType of Object.values(ConsentType)) {
			const relevantConsents = userConsents
				.filter((c) => c.consentType === consentType)
				.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

			if (relevantConsents.length > 0) {
				currentConsents.set(consentType, relevantConsents[0].granted);
			}
		}

		return currentConsents;
	}

	/**
	 * Check if user has granted specific consent
	 */
	hasConsent(userId: string, consentType: ConsentType): boolean {
		const consents = this.getUserConsents(userId);
		return consents.get(consentType) || false;
	}

	/**
	 * Get consent history for audit
	 */
	getConsentHistory(userId: string): ConsentRecord[] {
		return this.consents.get(userId) || [];
	}

	/**
	 * Withdraw consent
	 */
	async withdrawConsent(userId: string, consentType: ConsentType): Promise<ConsentRecord> {
		return await this.recordConsent(userId, consentType, false, { method: 'explicit' });
	}

	/**
	 * Bulk update consents
	 */
	async updateConsents(
		userId: string,
		consents: Record<ConsentType, boolean>
	): Promise<ConsentRecord[]> {
		const records: ConsentRecord[] = [];

		for (const [type, granted] of Object.entries(consents)) {
			const record = await this.recordConsent(userId, type as ConsentType, granted);
			records.push(record);
		}

		return records;
	}

	/**
	 * Get privacy notice
	 */
	getPrivacyNotice(version?: string): PrivacyNotice {
		// In real implementation, fetch from database
		return {
			version: version || this.currentPolicyVersion,
			effectiveDate: new Date('2024-01-01'),
			content: this.getPrivacyPolicyContent(),
			changes: version
				? ['Updated data retention policy', 'Added information about analytics']
				: undefined
		};
	}

	/**
	 * Check if user needs to re-consent (policy updated)
	 */
	needsReConsent(userId: string): boolean {
		const userConsents = this.consents.get(userId) || [];
		if (userConsents.length === 0) return true;

		// Check if user has consented to current version
		const latestConsent = userConsents.sort(
			(a, b) => b.timestamp.getTime() - a.timestamp.getTime()
		)[0];

		return latestConsent.version !== this.currentPolicyVersion;
	}

	/**
	 * Get consent statistics (for compliance reporting)
	 */
	getConsentStatistics(): {
		totalUsers: number;
		consentsByType: Record<ConsentType, { granted: number; denied: number }>;
	} {
		const stats = {
			totalUsers: this.consents.size,
			consentsByType: {} as Record<ConsentType, { granted: number; denied: number }>
		};

		for (const consentType of Object.values(ConsentType)) {
			stats.consentsByType[consentType] = { granted: 0, denied: 0 };
		}

		for (const [userId, _] of this.consents) {
			const userConsents = this.getUserConsents(userId);
			for (const [type, granted] of userConsents) {
				if (granted) {
					stats.consentsByType[type].granted++;
				} else {
					stats.consentsByType[type].denied++;
				}
			}
		}

		return stats;
	}

	/**
	 * Export consent records for user
	 */
	exportConsentRecords(userId: string): ConsentRecord[] {
		return this.getConsentHistory(userId);
	}

	/**
	 * Privacy policy content
	 */
	private getPrivacyPolicyContent(): string {
		return `
# Privacy Policy

## 1. Data We Collect
- Account information (name, email)
- Event participation data
- Voting preferences
- Activity engagement

## 2. How We Use Your Data
- Provide event services
- Improve user experience
- Analytics (with consent)

## 3. Data Retention
- Active accounts: Retained while active
- Inactive accounts: Deleted after 90 days
- Legal requirements: Up to 6 years

## 4. Your Rights (GDPR)
- Right to access your data
- Right to rectification
- Right to erasure
- Right to data portability
- Right to object
- Right to restrict processing

## 5. Contact
privacy@unconf.example.com
		`.trim();
	}
}

export const consentManagementService = new ConsentManagementService();
