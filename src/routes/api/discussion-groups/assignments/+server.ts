import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { RoomAssignmentRepository } from '../../../../lib/storage/RoomAssignmentRepository';
import { DiscussionRoomRepository } from '../../../../lib/storage/DiscussionRoomRepository';
import { AssignmentMethod, AssignmentStatus } from '../../../../types/enums';

const assignmentRepo = new RoomAssignmentRepository({
	storageDir: './data/storage'
});
const roomRepo = new DiscussionRoomRepository({
	storageDir: './data/storage'
});

export const GET: RequestHandler = async ({ url }) => {
	try {
		const eventId = url.searchParams.get('eventId');
		const userId = url.searchParams.get('userId');
		const roomId = url.searchParams.get('roomId');
		const stats = url.searchParams.get('stats') === 'true';

		if (!eventId) {
			return json({
				success: false,
				error: 'Event ID is required'
			}, { status: 400 });
		}

		if (stats) {
			// Return assignment statistics
			const statsResult = await assignmentRepo.getAssignmentStats(eventId);

			if (!statsResult.success) {
				return json({
					success: false,
					error: statsResult.error?.message
				}, { status: 500 });
			}

			return json({
				success: true,
				data: statsResult.data
			});
		}

		// Get assignments based on query parameters
		let assignmentsResult;

		if (userId) {
			// Get current assignment for specific user
			assignmentsResult = await assignmentRepo.findUserCurrentAssignment(userId, eventId);
			if (assignmentsResult.success) {
				return json({
					success: true,
					data: assignmentsResult.data
				});
			} else {
				return json({
					success: false,
					error: assignmentsResult.error?.message
				}, { status: 404 });
			}
		} else if (roomId) {
			// Get all assignments for specific room
			assignmentsResult = await assignmentRepo.findByRoom(roomId);
		} else {
			// Get all active assignments for event
			assignmentsResult = await assignmentRepo.findActiveAssignments(eventId);
		}

		if (!assignmentsResult.success) {
			return json({
				success: false,
				error: assignmentsResult.error?.message
			}, { status: 500 });
		}

		return json({
			success: true,
			data: assignmentsResult.data || []
		});
	} catch (error) {
		console.error('Error fetching assignments:', error);
		return json({
			success: false,
			error: 'Failed to fetch assignments'
		}, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { action, ...data } = await request.json();

		switch (action) {
			case 'assign':
				return await handleAssign(data);

			case 'move':
				return await handleMove(data);

			case 'confirm':
				return await handleConfirm(data);

			case 'cancel':
				return await handleCancel(data);

			case 'bulk_assign':
				return await handleBulkAssign(data);

			default:
				return json({
					success: false,
					error: 'Invalid action'
				}, { status: 400 });
		}
	} catch (error) {
		console.error('Error handling assignment action:', error);
		return json({
			success: false,
			error: 'Failed to process assignment request'
		}, { status: 500 });
	}
};

async function handleAssign(data: any) {
	const { userId, roomId, topicId, eventId, preferenceRank, method = AssignmentMethod.MANUAL } = data;

	if (!userId || !roomId || !topicId || !eventId) {
		return json({
			success: false,
			error: 'User ID, room ID, topic ID, and event ID are required'
		}, { status: 400 });
	}

	// Check room capacity
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
		1, // Round number - could be dynamic
		method,
		preferenceRank
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

async function handleMove(data: any) {
	const { userId, newRoomId, newTopicId, eventId } = data;

	if (!userId || !newRoomId || !newTopicId || !eventId) {
		return json({
			success: false,
			error: 'User ID, new room ID, new topic ID, and event ID are required'
		}, { status: 400 });
	}

	// Get current assignment
	const currentAssignmentResult = await assignmentRepo.findUserCurrentAssignment(userId, eventId);
	if (!currentAssignmentResult.success || !currentAssignmentResult.data) {
		return json({
			success: false,
			error: 'No current assignment found for user'
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
		eventId
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

async function handleConfirm(data: any) {
	const { assignmentId } = data;

	if (!assignmentId) {
		return json({
			success: false,
			error: 'Assignment ID is required'
		}, { status: 400 });
	}

	const result = await assignmentRepo.confirmAssignment(assignmentId);

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

async function handleCancel(data: any) {
	const { assignmentId, userId, eventId } = data;

	if (!assignmentId || !userId) {
		return json({
			success: false,
			error: 'Assignment ID and User ID are required'
		}, { status: 400 });
	}

	// Get assignment details for room update
	const assignmentResult = await assignmentRepo.findById(assignmentId);
	if (!assignmentResult.success || !assignmentResult.data) {
		return json({
			success: false,
			error: 'Assignment not found'
		}, { status: 404 });
	}

	const assignment = assignmentResult.data;

	// Cancel assignment
	const cancelResult = await assignmentRepo.cancelAssignment(assignmentId);

	if (!cancelResult.success) {
		return json({
			success: false,
			error: cancelResult.error?.message
		}, { status: 500 });
	}

	// Update room occupancy
	await roomRepo.removeParticipant(assignment.roomId, userId);

	return json({
		success: true,
		data: cancelResult.data
	});
}

async function handleBulkAssign(data: any) {
	const { assignments } = data;

	if (!assignments || !Array.isArray(assignments)) {
		return json({
			success: false,
			error: 'Assignments array is required'
		}, { status: 400 });
	}

	// Validate each assignment has required fields
	for (const assignment of assignments) {
		if (!assignment.userId || !assignment.roomId || !assignment.topicId || !assignment.eventId) {
			return json({
				success: false,
				error: 'Each assignment must have userId, roomId, topicId, and eventId'
			}, { status: 400 });
		}
	}

	// Create assignments
	const result = await assignmentRepo.bulkAssign(assignments);

	if (!result.success) {
		return json({
			success: false,
			error: result.error?.message
		}, { status: 500 });
	}

	// Update room occupancy for each assignment
	for (const assignment of result.data || []) {
		await roomRepo.addParticipant(assignment.roomId, assignment.userId);
	}

	return json({
		success: true,
		data: result.data
	});
}