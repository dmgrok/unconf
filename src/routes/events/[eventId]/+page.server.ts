import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { EventRepository, TopicRepository } from '$lib/storage';

const repoConfig = {
	dataDir: './data',
	enableBackups: true,
	backupRetention: 10
};

const eventRepository = new EventRepository(repoConfig);
const topicRepository = new TopicRepository(repoConfig);

export const load: PageServerLoad = async ({ params }) => {
	const { eventId } = params;

	if (!eventId) {
		throw error(400, 'Missing event identifier');
	}

	const eventResult = await eventRepository.findById(eventId);

	let event = eventResult.success && eventResult.data ? eventResult.data : null;

	if (!event) {
		const slugResult = await eventRepository.findBySlug(eventId);

		if (!slugResult.success || !slugResult.data) {
			throw error(404, 'Event not found');
		}

		event = slugResult.data;
	}

	const topicsResult = await topicRepository.findByEvent(event.id);
	const topics = topicsResult.success && topicsResult.data ? topicsResult.data : [];

	const topicStats = {
		total: topics.length,
		active: topics.filter((topic) => topic.status === 'active').length,
		draft: topics.filter((topic) => topic.status === 'draft').length,
		frozen: topics.filter((topic) => topic.status === 'frozen').length,
		archived: topics.filter((topic) => topic.status === 'archived').length,
		totalVotes: topics.reduce((sum, topic) => {
			const voteWeight = typeof topic.totalVoteWeight === 'number' ? topic.totalVoteWeight : 0;
			return sum + voteWeight;
		}, 0)
	};

	const featuredTopics = topics
		.sort((a, b) => {
			if (b.totalVoteWeight !== a.totalVoteWeight) {
				return (b.totalVoteWeight ?? 0) - (a.totalVoteWeight ?? 0);
			}

			return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
		})
		.slice(0, 3)
		.map((topic) => ({
			id: topic.id,
			title: topic.title,
			description: topic.description,
			voteCount: topic.voteCount,
			totalVoteWeight: topic.totalVoteWeight,
			status: topic.status,
			createdAt: topic.createdAt
		}));

	return {
		event,
		topicStats,
		featuredTopics
	};
};
