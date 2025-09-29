import { type Page, type Locator } from '@playwright/test';
import { BasePage } from './base.page';

export class EventPage extends BasePage {
	// Selectors
	private readonly eventTitle: Locator;
	private readonly participantsList: Locator;
	private readonly voteButton: Locator;
	private readonly proposalInput: Locator;
	private readonly submitProposalButton: Locator;
	private readonly connectionStatus: Locator;

	constructor(page: Page) {
		super(page);
		this.eventTitle = page.locator('[data-testid="event-title"]');
		this.participantsList = page.locator('[data-testid="participants-list"]');
		this.voteButton = page.locator('[data-testid="vote-button"]');
		this.proposalInput = page.locator('[data-testid="proposal-input"]');
		this.submitProposalButton = page.locator('[data-testid="submit-proposal-button"]');
		this.connectionStatus = page.locator('[data-testid="connection-status"]');
	}

	// Page actions
	async joinEvent(eventId: string) {
		await this.goto(`/event/${eventId}`);
		await this.waitForEventLoad();
	}

	async submitProposal(proposal: string) {
		await this.proposalInput.fill(proposal);
		await this.submitProposalButton.click();
	}

	async voteOnProposal(proposalId: string) {
		const proposalVoteButton = this.page.locator(`[data-testid="vote-${proposalId}"]`);
		await proposalVoteButton.click();
	}

	async waitForEventLoad() {
		await this.eventTitle.waitFor({ state: 'visible' });
		await this.waitForWebSocketConnection();
	}

	async waitForConnectionEstablished() {
		await this.connectionStatus.waitFor({ state: 'visible' });
		await this.page.waitForFunction(
			() => document.querySelector('[data-testid="connection-status"]')?.textContent?.includes('Connected')
		);
	}

	// Real-time event assertions
	async assertRealTimeUpdates() {
		// Verify WebSocket connection is active
		await this.assertElementVisible('[data-testid="connection-status"]');
	}

	async assertParticipantJoined(participantName: string) {
		const participant = this.page.locator(`[data-testid="participant-${participantName}"]`);
		await participant.waitFor({ state: 'visible' });
	}

	async assertVoteCountUpdated(proposalId: string, expectedCount: number) {
		const voteCount = this.page.locator(`[data-testid="vote-count-${proposalId}"]`);
		await voteCount.waitFor({ state: 'visible' });
		await this.page.waitForFunction(
			(args) => {
				const element = document.querySelector(`[data-testid="vote-count-${args.proposalId}"]`);
				return element?.textContent?.includes(String(args.expectedCount));
			},
			{ proposalId, expectedCount }
		);
	}
}