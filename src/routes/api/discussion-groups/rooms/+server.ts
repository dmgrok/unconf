import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { DiscussionRoomRepository } from '../../../../lib/storage/DiscussionRoomRepository';
import { DiscussionRoomStatus } from '../../../../types/enums';
import type { DiscussionRoom } from '../../../../types/entities';

const roomRepo = new DiscussionRoomRepository({
	storageDir: './data/storage'
});

export const GET: RequestHandler = async ({ url }) => {
	try {
		const eventId = url.searchParams.get('eventId');
		const topicId = url.searchParams.get('topicId');
		const stats = url.searchParams.get('stats') === 'true';

		if (!eventId) {
			return json({
				success: false,
				error: 'Event ID is required'
			}, { status: 400 });
		}

		if (stats) {
			// Return room statistics
			const statsResult = await roomRepo.getRoomStats(eventId);

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

		// Get rooms by event and optionally by topic
		let roomsResult;
		if (topicId) {
			roomsResult = await roomRepo.findByEventAndTopic(eventId, topicId);
		} else {
			roomsResult = await roomRepo.findByEvent(eventId);
		}

		if (!roomsResult.success) {
			return json({
				success: false,
				error: roomsResult.error?.message
			}, { status: 500 });
		}

		return json({
			success: true,
			data: roomsResult.data || []
		});
	} catch (error) {
		console.error('Error fetching rooms:', error);
		return json({
			success: false,
			error: 'Failed to fetch rooms'
		}, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ request }) => {
	try {
		const roomData = await request.json();

		// Validate required fields
		if (!roomData.eventId || !roomData.topicId || !roomData.name || !roomData.capacity) {
			return json({
				success: false,
				error: 'Event ID, topic ID, name, and capacity are required'
			}, { status: 400 });
		}

		// Set defaults
		const room: Partial<DiscussionRoom> = {
			...roomData,
			currentOccupancy: roomData.currentOccupancy || 0,
			status: roomData.status || DiscussionRoomStatus.ACTIVE,
			assignedParticipants: roomData.assignedParticipants || []
		};

		const result = await roomRepo.create(room);

		if (!result.success) {
			return json({
				success: false,
				error: result.error?.message
			}, { status: 500 });
		}

		return json({
			success: true,
			data: result.data
		}, { status: 201 });
	} catch (error) {
		console.error('Error creating room:', error);
		return json({
			success: false,
			error: 'Failed to create room'
		}, { status: 500 });
	}
};

export const PUT: RequestHandler = async ({ request }) => {
	try {
		const { roomId, ...updates } = await request.json();

		if (!roomId) {
			return json({
				success: false,
				error: 'Room ID is required'
			}, { status: 400 });
		}

		const result = await roomRepo.update(roomId, updates);

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
	} catch (error) {
		console.error('Error updating room:', error);
		return json({
			success: false,
			error: 'Failed to update room'
		}, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ request }) => {
	try {
		const { roomId } = await request.json();

		if (!roomId) {
			return json({
				success: false,
				error: 'Room ID is required'
			}, { status: 400 });
		}

		const result = await roomRepo.delete(roomId);

		if (!result.success) {
			return json({
				success: false,
				error: result.error?.message
			}, { status: 500 });
		}

		return json({
			success: true,
			data: { deleted: true }
		});
	} catch (error) {
		console.error('Error deleting room:', error);
		return json({
			success: false,
			error: 'Failed to delete room'
		}, { status: 500 });
	}
};