/**
 * GDPR Data Export Service
 * Handles user data export in compliance with GDPR Article 20 (Right to data portability)
 */

export interface UserDataExport {
	user: {
		id: string;
		name: string | null;
		email: string | null;
		image: string | null;
		createdAt: Date;
		lastLoginAt: Date;
	};
	events: Array<{
		id: string;
		name: string;
		role: string;
		joinedAt: Date;
	}>;
	topics: Array<{
		id: string;
		title: string;
		description: string;
		eventId: string;
		createdAt: Date;
		votes: number;
	}>;
	votes: Array<{
		topicId: string;
		eventId: string;
		rank: number;
		votedAt: Date;
	}>;
	discussions: Array<{
		id: string;
		eventId: string;
		joinedAt: Date;
	}>;
	teams: Array<{
		id: string;
		eventId: string;
		assignedAt: Date;
	}>;
	gameParticipation: Array<{
		gameType: string;
		eventId: string;
		participatedAt: Date;
	}>;
	achievements: Array<{
		achievementId: string;
		unlockedAt: Date;
		points: number;
	}>;
	consents: Array<{
		type: string;
		granted: boolean;
		timestamp: Date;
	}>;
	exportMetadata: {
		exportedAt: Date;
		exportedBy: string;
		format: 'json' | 'csv';
	};
}

export class DataExportService {
	/**
	 * Export all user data in JSON format
	 */
	async exportUserDataJSON(userId: string): Promise<UserDataExport> {
		// In a real implementation, this would query the database
		// For now, we'll return the structure

		const exportData: UserDataExport = {
			user: {
				id: userId,
				name: null,
				email: null,
				image: null,
				createdAt: new Date(),
				lastLoginAt: new Date()
			},
			events: [],
			topics: [],
			votes: [],
			discussions: [],
			teams: [],
			gameParticipation: [],
			achievements: [],
			consents: [],
			exportMetadata: {
				exportedAt: new Date(),
				exportedBy: userId,
				format: 'json'
			}
		};

		// TODO: Query database for actual data
		// - User profile data
		// - Event participations
		// - Topics created
		// - Votes cast
		// - Discussion participation
		// - Team assignments
		// - Game participation
		// - Achievements unlocked
		// - Consent records

		return exportData;
	}

	/**
	 * Export user data as CSV
	 */
	async exportUserDataCSV(userId: string): Promise<{
		users: string;
		events: string;
		topics: string;
		votes: string;
		achievements: string;
	}> {
		const jsonData = await this.exportUserDataJSON(userId);

		return {
			users: this.convertToCSV([jsonData.user]),
			events: this.convertToCSV(jsonData.events),
			topics: this.convertToCSV(jsonData.topics),
			votes: this.convertToCSV(jsonData.votes),
			achievements: this.convertToCSV(jsonData.achievements)
		};
	}

	/**
	 * Convert array to CSV format
	 */
	private convertToCSV(data: any[]): string {
		if (data.length === 0) return '';

		const headers = Object.keys(data[0]);
		const csvRows = [headers.join(',')];

		for (const row of data) {
			const values = headers.map((header) => {
				const value = row[header];
				// Escape quotes and wrap in quotes if contains comma
				const escaped = String(value).replace(/"/g, '""');
				return `"${escaped}"`;
			});
			csvRows.push(values.join(','));
		}

		return csvRows.join('\n');
	}

	/**
	 * Generate downloadable file
	 */
	generateDownloadableFile(data: any, format: 'json' | 'csv', filename: string): Blob {
		let content: string;
		let mimeType: string;

		if (format === 'json') {
			content = JSON.stringify(data, null, 2);
			mimeType = 'application/json';
		} else {
			content = typeof data === 'string' ? data : JSON.stringify(data);
			mimeType = 'text/csv';
		}

		return new Blob([content], { type: mimeType });
	}

	/**
	 * Trigger browser download
	 */
	downloadFile(blob: Blob, filename: string): void {
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = filename;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}
}

export const dataExportService = new DataExportService();
