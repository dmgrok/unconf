import { json } from '@sveltejs/kit';
import { initializeStorage, type StorageConfig } from '$lib/storage';
import { VoteWeight } from '../../../types/enums';
import path from 'path';
import os from 'os';

const storageConfig: StorageConfig = {
	dataDir: path.join(os.tmpdir(), 'unconf-test-data'),
	enableBackups: true,
	backupRetention: 3,
	enableIntegrityChecks: true,
	enableMigrations: true
};

export async function GET() {
	try {
		// Initialize storage
		const storage = await initializeStorage(storageConfig);

		// Perform health check
		const healthCheck = await storage.healthCheck();

		// Test creating some sample data
		const testEvent = await storage.events.create({
			title: 'Test Event',
			description: 'A test event for storage validation',
			slug: 'test-event-' + Date.now(),
			organizerId: 'test-organizer',
			accessCode: await storage.events.generateUniqueAccessCode(),
			status: 'draft',
			settings: {
				allowGuestAccess: true,
				requireRegistration: false,
				enableVoting: true,
				enableGroupIntelligence: false,
				enableDiscussionGroups: false,
				enableTeamDistribution: false,
				maxVotesPerTopic: 3,
				autoAdvanceActivities: false
			}
		});

		if (!testEvent.success) {
			throw new Error(`Failed to create test event: ${testEvent.error?.message}`);
		}

		const testUser = await storage.users.createGuestUser('Test User', testEvent.data!.id);

		if (!testUser.success) {
			throw new Error(`Failed to create test user: ${testUser.error?.message}`);
		}

		const testTopic = await storage.topics.create({
			title: 'Test Topic',
			description: 'A test topic for storage validation',
			eventId: testEvent.data!.id,
			submittedBy: testUser.data!.id,
			status: 'active',
			voteCount: 0,
			totalVoteWeight: 0,
			averageWeight: 0
		});

		if (!testTopic.success) {
			throw new Error(`Failed to create test topic: ${testTopic.error?.message}`);
		}

		// Test vote casting
		const testVote = await storage.votes.castVote(
			testUser.data!.id,
			testTopic.data!.id,
			testEvent.data!.id,
			VoteWeight.FIRST
		);

		if (!testVote.success) {
			throw new Error(`Failed to cast test vote: ${testVote.error?.message}`);
		}

		// Update topic vote stats
		await storage.topics.incrementVoteStats(testTopic.data!.id, 3);

		// Get updated topic
		const updatedTopic = await storage.topics.findById(testTopic.data!.id);

		// Check data integrity
		const integrityReport = await storage.checkIntegrity();

		// Get all created data for verification
		const allEvents = await storage.events.findAll();
		const allUsers = await storage.users.findAll();
		const allTopics = await storage.topics.findAll();
		const allVotes = await storage.votes.findAll();

		return json({
			success: true,
			message: 'Storage system test completed successfully',
			results: {
				healthCheck,
				integrityReport,
				testData: {
					event: testEvent.data,
					user: testUser.data,
					topic: updatedTopic.data,
					vote: testVote.data
				},
				counts: {
					events: allEvents.data?.length || 0,
					users: allUsers.data?.length || 0,
					topics: allTopics.data?.length || 0,
					votes: allVotes.data?.length || 0
				}
			},
			timestamp: new Date().toISOString()
		});

	} catch (error) {
		return json({
			success: false,
			error: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error',
			timestamp: new Date().toISOString()
		}, { status: 500 });
	}
}

export async function POST() {
	try {
		// Initialize storage for cleanup test
		const storage = await initializeStorage(storageConfig);

		// Export data before cleanup
		const exportPath = path.join(storageConfig.dataDir, 'export-test.json');
		const exportData = await storage.exportForDatabase(exportPath);

		// Generate database schema
		const schema = await storage.generateDatabaseSchema();

		return json({
			success: true,
			message: 'Storage export and schema generation completed',
			results: {
				exportData,
				schemaLength: schema.length,
				exportPath
			},
			timestamp: new Date().toISOString()
		});

	} catch (error) {
		return json({
			success: false,
			error: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error',
			timestamp: new Date().toISOString()
		}, { status: 500 });
	}
}