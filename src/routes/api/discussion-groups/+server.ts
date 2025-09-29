import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { DiscussionRoomRepository } from '../../../lib/storage/DiscussionRoomRepository';
import { RoomAssignmentRepository } from '../../../lib/storage/RoomAssignmentRepository';
import { VoteRepository } from '../../../lib/storage/VoteRepository';
import { UserRepository } from '../../../lib/storage/UserRepository';
import { TopicRepository } from '../../../lib/storage/TopicRepository';
import { discussionGroupAssignmentService } from '../../../lib/services/discussionGroupAssignment';
import { AssignmentMethod, DiscussionRoomStatus } from '../../../types/enums';
import type { AssignmentSettings } from '../../../types/entities';

// Initialize repositories
const roomRepo = new DiscussionRoomRepository({
	storageDir: './data/storage'
});
const assignmentRepo = new RoomAssignmentRepository({
	storageDir: './data/storage'
});
const voteRepo = new VoteRepository({
	storageDir: './data/storage'
});
const userRepo = new UserRepository({
	storageDir: './data/storage'
});
const topicRepo = new TopicRepository({
	storageDir: './data/storage'
});

export const GET: RequestHandler = async ({ url }) => {
	try {
		const eventId = url.searchParams.get('eventId');

		if (!eventId) {
			return json({
				success: false,
				error: 'Event ID is required'
			}, { status: 400 });
		}

		// Get rooms and assignments for the event
		const [roomsResult, assignmentsResult] = await Promise.all([
			roomRepo.findByEvent(eventId),
			assignmentRepo.findActiveAssignments(eventId)
		]);

		if (!roomsResult.success || !assignmentsResult.success) {
			return json({
				success: false,
				error: roomsResult.error?.message || assignmentsResult.error?.message
			}, { status: 500 });
		}

		return json({
			success: true,
			data: {
				rooms: roomsResult.data || [],
				assignments: assignmentsResult.data || []
			}
		});
	} catch (error) {
		console.error('Error fetching discussion groups:', error);
		return json({
			success: false,
			error: 'Failed to fetch discussion groups'
		}, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { eventId, action, ...data } = await request.json();

		if (!eventId) {
			return json({
				success: false,
				error: 'Event ID is required'
			}, { status: 400 });
		}

		switch (action) {
			case 'create_rooms':
				return await handleCreateRooms(eventId, data);

			case 'generate_assignments':
				return await handleGenerateAssignments(eventId, data);

			case 'manual_assign':
				return await handleManualAssignment(eventId, data);

			case 'move_participant':
				return await handleMoveParticipant(eventId, data);

			default:
				return json({
					success: false,
					error: 'Invalid action'
				}, { status: 400 });
		}
	} catch (error) {
		console.error('Error handling discussion group action:', error);
		return json({
			success: false,
			error: 'Failed to process request'
		}, { status: 500 });
	}
};

async function handleCreateRooms(eventId: string, data: any) {
	const { topicIds, defaultCapacity = 10 } = data;

	if (!topicIds || !Array.isArray(topicIds)) {
		return json({
			success: false,
			error: 'Topic IDs array is required'
		}, { status: 400 });
	}

	const result = await roomRepo.createRoomsForTopics(eventId, topicIds, defaultCapacity);

	if (!result.success) {
		return json({
			success: false,
			error: result.error?.message
		}, { status: 500 });
	}

	return json({
		success: true,
		data: result.data
	});
}

async function handleGenerateAssignments(eventId: string, data: any) {
	const { settings } = data;

	// Default assignment settings
	const assignmentSettings: AssignmentSettings = {
		maxRoomCapacity: 10,
		minRoomSize: 3,
		allowOverflow: true,
		preferenceWeights: {
			first: 3,
			second: 2,
			third: 1
		},
		fairnessEnabled: true,
		manualOverrideEnabled: true,
		...settings
	};

	try {
		// Fetch required data
		const [participantsResult, votesResult, topicsResult, roomsResult] = await Promise.all([
			userRepo.findBy({ currentEventId: eventId }),
			voteRepo.findByEvent(eventId),
			topicRepo.findBy({ eventId }),
			roomRepo.findByEvent(eventId)
		]);

		if (!participantsResult.success || !votesResult.success ||
			!topicsResult.success || !roomsResult.success) {
			return json({
				success: false,
				error: 'Failed to fetch required data for assignment generation'
			}, { status: 500 });
		}

		const participants = participantsResult.data || [];
		const votes = votesResult.data || [];
		const topics = topicsResult.data || [];
		const rooms = roomsResult.data || [];

		// Generate assignments
		const assignmentResult = await discussionGroupAssignmentService.generateAssignments(
			participants,
			votes,
			topics,
			rooms,
			assignmentSettings
		);

		// Store assignments in repository
		const assignments = assignmentResult.assignments.map(assignment => ({
			...assignment,
			eventId
		}));

		const bulkAssignResult = await assignmentRepo.bulkAssign(assignments);

		if (!bulkAssignResult.success) {
			return json({
				success: false,
				error: bulkAssignResult.error?.message
			}, { status: 500 });
		}

		// Update room occupancy
		for (const assignment of assignments) {
			await roomRepo.addParticipant(assignment.roomId, assignment.userId);
		}

		return json({
			success: true,
			data: {
				assignments: bulkAssignResult.data,
				results: assignmentResult.results,
				unassigned: assignmentResult.unassigned
			}
		});
	} catch (error) {
		console.error('Error generating assignments:', error);
		return json({
			success: false,
			error: 'Failed to generate assignments'
		}, { status: 500 });
	}
}

async function handleManualAssignment(eventId: string, data: any) {
	const { userId, roomId, topicId } = data;

	if (!userId || !roomId || !topicId) {
		return json({
			success: false,
			error: 'User ID, room ID, and topic ID are required'
		}, { status: 400 });
	}

	// Check if room has capacity
	const roomResult = await roomRepo.findById(roomId);
	if (!roomResult.success || !roomResult.data) {
		return json({
			success: false,
			error: 'Room not found'
		}, { status: 404 });
	}

	const room = roomResult.data;
	if (room.currentOccupancy >= room.capacity) {
		return json({
			success: false,
			error: 'Room is at full capacity'
		}, { status: 400 });
	}

	// Create assignment
	const assignmentResult = await assignmentRepo.assignUserToRoom(
		userId,
		roomId,
		topicId,
		eventId,
		1, // Round number
		AssignmentMethod.MANUAL
	);

	if (!assignmentResult.success) {
		return json({
			success: false,
			error: assignmentResult.error?.message
		}, { status: 500 });
	}

	// Update room occupancy
	await roomRepo.addParticipant(roomId, userId);

	return json({
		success: true,
		data: assignmentResult.data
	});
}

async function handleMoveParticipant(eventId: string, data: any) {
	const { userId, newRoomId, newTopicId } = data;

	if (!userId || !newRoomId || !newTopicId) {
		return json({
			success: false,
			error: 'User ID, new room ID, and new topic ID are required'
		}, { status: 400 });
	}

	// Get current assignment
	const currentAssignmentResult = await assignmentRepo.findUserCurrentAssignment(userId, eventId);
	if (!currentAssignmentResult.success || !currentAssignmentResult.data) {
		return json({
			success: false,
			error: 'No current assignment found'
		}, { status: 404 });
	}

	const currentAssignment = currentAssignmentResult.data;

	// Check new room capacity
	const newRoomResult = await roomRepo.findById(newRoomId);
	if (!newRoomResult.success || !newRoomResult.data) {
		return json({
			success: false,
			error: 'New room not found'
		}, { status: 404 });
	}

	const newRoom = newRoomResult.data;
	if (newRoom.currentOccupancy >= newRoom.capacity) {
		return json({
			success: false,
			error: 'New room is at full capacity'
		}, { status: 400 });
	}

	// Move user
	const moveResult = await assignmentRepo.moveUserToRoom(
		userId,
		newRoomId,
		newTopicId,
		eventId,
		AssignmentMethod.MANUAL
	);

	if (!moveResult.success) {
		return json({
			success: false,
			error: moveResult.error?.message
		}, { status: 500 });
	}

	// Update room occupancy
	await Promise.all([
		roomRepo.removeParticipant(currentAssignment.roomId, userId),
		roomRepo.addParticipant(newRoomId, userId)
	]);

	return json({
		success: true,
		data: moveResult.data
	});
}