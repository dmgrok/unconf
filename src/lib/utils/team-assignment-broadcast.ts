/**
 * Team Assignment Broadcast and Confirmation Tracking
 * Manages broadcasting team assignments and tracking participant confirmations
 */

import type { Team, Participant } from './team-distribution';

export interface TeamAssignment {
	id: string;
	eventId: string;
	participantId: string;
	teamId: string;
	assignedAt: Date;
	confirmedAt?: Date;
	declinedAt?: Date;
	status: 'pending' | 'confirmed' | 'declined' | 'expired';
	notificationSent: boolean;
	notificationMethod?: 'email' | 'sms' | 'push' | 'in-app';
	expiresAt?: Date;
}

export interface BroadcastOptions {
	method: 'email' | 'sms' | 'push' | 'in-app' | 'all';
	includeTeamDetails?: boolean;
	requireConfirmation?: boolean;
	confirmationDeadline?: Date;
	customMessage?: string;
}

export interface BroadcastResult {
	totalAssignments: number;
	successfulBroadcasts: number;
	failedBroadcasts: number;
	assignments: TeamAssignment[];
	errors: Array<{ participantId: string; error: string }>;
}

export interface ConfirmationStatus {
	total: number;
	confirmed: number;
	pending: number;
	declined: number;
	expired: number;
	confirmationRate: number;
}

/**
 * Broadcast team assignments to participants
 */
export async function broadcastTeamAssignments(
	teams: Team[],
	eventId: string,
	options: BroadcastOptions
): Promise<BroadcastResult> {
	const assignments: TeamAssignment[] = [];
	const errors: BroadcastResult['errors'] = [];
	let successfulBroadcasts = 0;

	const expiresAt = options.confirmationDeadline || (
		options.requireConfirmation
			? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
			: undefined
	);

	for (const team of teams) {
		for (const participant of team.members) {
			const assignment: TeamAssignment = {
				id: `assignment-${eventId}-${participant.id}-${Date.now()}`,
				eventId,
				participantId: participant.id,
				teamId: team.id,
				assignedAt: new Date(),
				status: options.requireConfirmation ? 'pending' : 'confirmed',
				notificationSent: false,
				expiresAt
			};

			try {
				// Send notification
				const sent = await sendNotification(
					participant,
					team,
					assignment,
					options
				);

				if (sent) {
					assignment.notificationSent = true;
					successfulBroadcasts++;
				} else {
					errors.push({
						participantId: participant.id,
						error: 'Failed to send notification'
					});
				}
			} catch (error) {
				errors.push({
					participantId: participant.id,
					error: error instanceof Error ? error.message : 'Unknown error'
				});
			}

			assignments.push(assignment);
		}
	}

	return {
		totalAssignments: assignments.length,
		successfulBroadcasts,
		failedBroadcasts: errors.length,
		assignments,
		errors
	};
}

/**
 * Send notification to participant about team assignment
 */
async function sendNotification(
	participant: Participant,
	team: Team,
	assignment: TeamAssignment,
	options: BroadcastOptions
): Promise<boolean> {
	const methods = options.method === 'all'
		? ['email', 'push', 'in-app']
		: [options.method];

	let sent = false;

	for (const method of methods) {
		try {
			switch (method) {
				case 'email':
					if (participant.email) {
						await sendEmailNotification(participant, team, assignment, options);
						assignment.notificationMethod = 'email';
						sent = true;
					}
					break;

				case 'push':
					await sendPushNotification(participant, team, assignment, options);
					assignment.notificationMethod = 'push';
					sent = true;
					break;

				case 'in-app':
					await sendInAppNotification(participant, team, assignment, options);
					assignment.notificationMethod = 'in-app';
					sent = true;
					break;
			}

			if (sent) break; // Stop after first successful send
		} catch (error) {
			console.error(`Failed to send ${method} notification:`, error);
		}
	}

	return sent;
}

/**
 * Send email notification
 */
async function sendEmailNotification(
	participant: Participant,
	team: Team,
	assignment: TeamAssignment,
	options: BroadcastOptions
): Promise<void> {
	// Prepare email content
	const subject = `Team Assignment: ${team.name}`;

	let body = `
		<h2>Hello ${participant.name}!</h2>
		<p>You have been assigned to <strong>${team.name}</strong></p>
	`;

	if (team.topic) {
		body += `<p>Topic: ${team.topic}</p>`;
	}

	if (options.includeTeamDetails && team.members.length > 1) {
		body += `<h3>Team Members:</h3><ul>`;
		team.members.forEach((member) => {
			if (member.id !== participant.id) {
				body += `<li>${member.name}${member.category ? ` (${member.category})` : ''}</li>`;
			}
		});
		body += `</ul>`;
	}

	if (options.customMessage) {
		body += `<p>${options.customMessage}</p>`;
	}

	if (options.requireConfirmation) {
		const confirmUrl = `${getBaseUrl()}/events/${assignment.eventId}/confirm/${assignment.id}`;
		const declineUrl = `${getBaseUrl()}/events/${assignment.eventId}/decline/${assignment.id}`;

		body += `
			<h3>Please Confirm Your Participation</h3>
			<p>
				<a href="${confirmUrl}" style="display: inline-block; padding: 12px 24px; background: #6366f1; color: white; text-decoration: none; border-radius: 8px; margin-right: 10px;">Confirm</a>
				<a href="${declineUrl}" style="display: inline-block; padding: 12px 24px; background: #ef4444; color: white; text-decoration: none; border-radius: 8px;">Decline</a>
			</p>
		`;

		if (assignment.expiresAt) {
			body += `<p><em>Please respond by ${assignment.expiresAt.toLocaleDateString()}</em></p>`;
		}
	}

	// Send email (integrate with email service)
	await fetch('/api/notifications/email', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			to: participant.email,
			subject,
			html: body
		})
	});
}

/**
 * Send push notification
 */
async function sendPushNotification(
	participant: Participant,
	team: Team,
	assignment: TeamAssignment,
	options: BroadcastOptions
): Promise<void> {
	const message = options.requireConfirmation
		? `You've been assigned to ${team.name}. Please confirm your participation.`
		: `You've been assigned to ${team.name}${team.topic ? ` for ${team.topic}` : ''}`;

	await fetch('/api/notifications/push', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			userId: participant.id,
			title: 'Team Assignment',
			body: message,
			data: {
				type: 'team-assignment',
				assignmentId: assignment.id,
				eventId: assignment.eventId,
				teamId: team.id
			}
		})
	});
}

/**
 * Send in-app notification
 */
async function sendInAppNotification(
	participant: Participant,
	team: Team,
	assignment: TeamAssignment,
	options: BroadcastOptions
): Promise<void> {
	await fetch('/api/notifications/in-app', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			userId: participant.id,
			type: 'team-assignment',
			title: 'Team Assignment',
			message: `You've been assigned to ${team.name}`,
			data: {
				assignmentId: assignment.id,
				eventId: assignment.eventId,
				teamId: team.id,
				teamName: team.name,
				teamTopic: team.topic,
				requiresConfirmation: options.requireConfirmation
			}
		})
	});
}

/**
 * Confirm team assignment
 */
export async function confirmAssignment(
	assignmentId: string
): Promise<{ success: boolean; assignment?: TeamAssignment; error?: string }> {
	try {
		const response = await fetch(`/api/assignments/${assignmentId}/confirm`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' }
		});

		if (!response.ok) {
			throw new Error('Failed to confirm assignment');
		}

		const assignment = await response.json();
		return { success: true, assignment };
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error'
		};
	}
}

/**
 * Decline team assignment
 */
export async function declineAssignment(
	assignmentId: string,
	reason?: string
): Promise<{ success: boolean; assignment?: TeamAssignment; error?: string }> {
	try {
		const response = await fetch(`/api/assignments/${assignmentId}/decline`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ reason })
		});

		if (!response.ok) {
			throw new Error('Failed to decline assignment');
		}

		const assignment = await response.json();
		return { success: true, assignment };
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error'
		};
	}
}

/**
 * Get confirmation status for all assignments
 */
export function getConfirmationStatus(assignments: TeamAssignment[]): ConfirmationStatus {
	const total = assignments.length;
	const confirmed = assignments.filter((a) => a.status === 'confirmed').length;
	const pending = assignments.filter((a) => a.status === 'pending').length;
	const declined = assignments.filter((a) => a.status === 'declined').length;
	const expired = assignments.filter((a) => a.status === 'expired').length;

	const confirmationRate = total > 0 ? (confirmed / total) * 100 : 0;

	return {
		total,
		confirmed,
		pending,
		declined,
		expired,
		confirmationRate: Math.round(confirmationRate * 10) / 10
	};
}

/**
 * Update expired assignments
 */
export function updateExpiredAssignments(assignments: TeamAssignment[]): TeamAssignment[] {
	const now = new Date();

	return assignments.map((assignment) => {
		if (
			assignment.status === 'pending' &&
			assignment.expiresAt &&
			assignment.expiresAt < now
		) {
			return {
				...assignment,
				status: 'expired'
			};
		}
		return assignment;
	});
}

/**
 * Send reminder to participants who haven't confirmed
 */
export async function sendConfirmationReminders(
	assignments: TeamAssignment[],
	teams: Team[]
): Promise<{ sent: number; failed: number }> {
	const pending = assignments.filter((a) => a.status === 'pending');
	let sent = 0;
	let failed = 0;

	for (const assignment of pending) {
		const team = teams.find((t) => t.id === assignment.teamId);
		if (!team) continue;

		const participant = team.members.find((p) => p.id === assignment.participantId);
		if (!participant) continue;

		try {
			await sendNotification(
				participant,
				team,
				assignment,
				{
					method: assignment.notificationMethod || 'email',
					requireConfirmation: true,
					customMessage: 'This is a reminder to confirm your team assignment.'
				}
			);
			sent++;
		} catch (error) {
			console.error('Failed to send reminder:', error);
			failed++;
		}
	}

	return { sent, failed };
}

/**
 * Get participants by confirmation status
 */
export function getParticipantsByStatus(
	assignments: TeamAssignment[],
	teams: Team[],
	status: TeamAssignment['status']
): Participant[] {
	const participantIds = assignments
		.filter((a) => a.status === status)
		.map((a) => a.participantId);

	const participants: Participant[] = [];

	for (const team of teams) {
		for (const member of team.members) {
			if (participantIds.includes(member.id)) {
				participants.push(member);
			}
		}
	}

	return participants;
}

/**
 * Helper to get base URL
 */
function getBaseUrl(): string {
	if (typeof window !== 'undefined') {
		return window.location.origin;
	}
	return process.env.PUBLIC_BASE_URL || 'http://localhost:5173';
}

/**
 * Export team assignments to CSV
 */
export function exportAssignmentsToCSV(
	assignments: TeamAssignment[],
	teams: Team[]
): string {
	const headers = [
		'Participant Name',
		'Email',
		'Team',
		'Team Topic',
		'Status',
		'Assigned At',
		'Confirmed At',
		'Notification Sent'
	];

	const rows: string[][] = [headers];

	for (const assignment of assignments) {
		const team = teams.find((t) => t.id === assignment.teamId);
		if (!team) continue;

		const participant = team.members.find((p) => p.id === assignment.participantId);
		if (!participant) continue;

		rows.push([
			participant.name,
			participant.email || '',
			team.name,
			team.topic || '',
			assignment.status,
			assignment.assignedAt.toISOString(),
			assignment.confirmedAt?.toISOString() || '',
			assignment.notificationSent ? 'Yes' : 'No'
		]);
	}

	return rows.map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');
}
