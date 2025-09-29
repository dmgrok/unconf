#!/usr/bin/env node

/**
 * Demo Feature Data Generator
 * Updates demo event data when features are implemented
 */

import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dataDir = join(__dirname, 'data');

// Utility functions
function generateId() {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

async function readJsonFile(filename) {
    try {
        const content = await fs.readFile(join(dataDir, filename), 'utf-8');
        return JSON.parse(content);
    } catch (error) {
        console.warn(`Could not read ${filename}:`, error.message);
        return [];
    }
}

async function writeJsonFile(filename, data) {
    await fs.writeFile(join(dataDir, filename), JSON.stringify(data, null, 2));
}

async function findDemoEvent() {
    const events = await readJsonFile('events.json');
    return events.find(e => e.accessCode === 'DEMO2024');
}

// Feature-specific demo data generators
export const featureUpdaters = {

    async votingSystem() {
        console.log('🗳️  Updating demo data for weighted voting system...');

        const topics = await readJsonFile('topics.json');
        const votes = await readJsonFile('votes.json');
        const users = await readJsonFile('users.json');
        const event = await findDemoEvent();

        if (!event) {
            console.warn('Demo event not found!');
            return;
        }

        // Add more diverse voting scenarios
        const additionalVotes = [
            {
                id: generateId(),
                userId: users[0]?.id,
                topicId: topics[1]?.id,
                eventId: event.id,
                weight: 'first',
                timestamp: new Date().toISOString(),
                isActive: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            },
            {
                id: generateId(),
                userId: users[1]?.id,
                topicId: topics[2]?.id,
                eventId: event.id,
                weight: 'first',
                timestamp: new Date().toISOString(),
                isActive: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            },
            {
                id: generateId(),
                userId: users[2]?.id,
                topicId: topics[0]?.id,
                eventId: event.id,
                weight: 'third',
                timestamp: new Date().toISOString(),
                isActive: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }
        ];

        // Update topics with realistic vote counts
        const updatedTopics = topics.map(topic => {
            const topicVotes = [...votes, ...additionalVotes].filter(v => v.topicId === topic.id);
            const totalWeight = topicVotes.reduce((sum, vote) => {
                const weight = vote.weight === 'first' ? 3 : vote.weight === 'second' ? 2 : 1;
                return sum + weight;
            }, 0);

            return {
                ...topic,
                voteCount: topicVotes.length,
                totalVoteWeight: totalWeight,
                averageWeight: topicVotes.length > 0 ? totalWeight / topicVotes.length : 0,
                lastVotedAt: topicVotes.length > 0 ? new Date().toISOString() : topic.lastVotedAt
            };
        });

        await writeJsonFile('topics.json', updatedTopics);
        await writeJsonFile('votes.json', [...votes, ...additionalVotes]);
        console.log('✅ Updated voting demo data with diverse voting scenarios');
    },

    async groupIntelligence() {
        console.log('🧠 Updating demo data for group intelligence features...');

        const event = await findDemoEvent();
        if (!event) return;

        // Add word-chain game sample data
        const gameData = {
            id: generateId(),
            eventId: event.id,
            type: 'word-chain',
            status: 'completed',
            words: [
                { word: 'technology', submittedBy: 'demo-user-1', timestamp: new Date().toISOString() },
                { word: 'youth', submittedBy: 'demo-user-2', timestamp: new Date().toISOString() },
                { word: 'harmony', submittedBy: 'demo-user-3', timestamp: new Date().toISOString() },
                { word: 'innovation', submittedBy: 'demo-user-1', timestamp: new Date().toISOString() }
            ],
            createdAt: new Date().toISOString(),
            completedAt: new Date().toISOString()
        };

        // Create or update game sessions file
        const games = await readJsonFile('game-sessions.json');
        await writeJsonFile('game-sessions.json', [...games, gameData]);
        console.log('✅ Added group intelligence demo data');
    },

    async discussionGroups() {
        console.log('💬 Updating demo data for discussion groups...');

        const event = await findDemoEvent();
        const topics = await readJsonFile('topics.json');
        const users = await readJsonFile('users.json');

        if (!event) return;

        // Create sample room assignments
        const rooms = [
            {
                id: generateId(),
                eventId: event.id,
                name: 'Innovation Lab',
                capacity: 8,
                topicId: topics[0]?.id,
                participants: [users[0]?.id, users[1]?.id],
                amenities: ['whiteboard', 'projector'],
                createdAt: new Date().toISOString()
            },
            {
                id: generateId(),
                eventId: event.id,
                name: 'Collaboration Space',
                capacity: 6,
                topicId: topics[1]?.id,
                participants: [users[2]?.id],
                amenities: ['flipchart', 'sticky_notes'],
                createdAt: new Date().toISOString()
            }
        ];

        await writeJsonFile('rooms.json', rooms);
        console.log('✅ Added discussion groups demo data');
    },

    async teamDistribution() {
        console.log('👥 Updating demo data for team distribution...');

        const event = await findDemoEvent();
        const users = await readJsonFile('users.json');

        if (!event) return;

        // Create sample teams
        const teams = [
            {
                id: generateId(),
                eventId: event.id,
                name: 'Team Alpha',
                members: [users[0]?.id, users[1]?.id],
                strategy: 'random',
                facilitator: users[0]?.id,
                createdAt: new Date().toISOString()
            },
            {
                id: generateId(),
                eventId: event.id,
                name: 'Team Beta',
                members: [users[2]?.id],
                strategy: 'collaboration',
                createdAt: new Date().toISOString()
            }
        ];

        await writeJsonFile('teams.json', teams);
        console.log('✅ Added team distribution demo data');
    },

    async realTimeUpdates() {
        console.log('⚡ Updating demo data for real-time features...');

        const event = await findDemoEvent();
        if (!event) return;

        // Add activity log for demonstrating real-time updates
        const activityLog = [
            {
                id: generateId(),
                eventId: event.id,
                type: 'activity_switch',
                fromActivity: 'voting',
                toActivity: 'discussion',
                switchedBy: 'demo-organizer',
                timestamp: new Date().toISOString(),
                latency: 120 // ms
            },
            {
                id: generateId(),
                eventId: event.id,
                type: 'vote_cast',
                userId: 'demo-participant',
                topicId: 'demo-topic-1',
                weight: 'first',
                timestamp: new Date().toISOString()
            }
        ];

        await writeJsonFile('activity-log.json', activityLog);
        console.log('✅ Added real-time activity demo data');
    },

    async analytics() {
        console.log('📊 Updating demo data for analytics...');

        const event = await findDemoEvent();
        if (!event) return;

        // Create sample analytics data
        const analytics = {
            eventId: event.id,
            participationMetrics: {
                totalParticipants: 25,
                activeParticipants: 22,
                votingParticipation: 0.88,
                discussionParticipation: 0.92
            },
            activityMetrics: {
                votingDuration: 900, // seconds
                discussionDuration: 2400,
                gamesDuration: 600
            },
            engagementMetrics: {
                averageVotesPerParticipant: 2.4,
                topicsCreated: 12,
                averageDiscussionTime: 18 // minutes
            },
            generatedAt: new Date().toISOString()
        };

        await writeJsonFile('analytics.json', [analytics]);
        console.log('✅ Added analytics demo data');
    }
};

// Main function to update demo data for specific features
export async function updateDemoDataForFeature(featureName) {
    if (featureUpdaters[featureName]) {
        await featureUpdaters[featureName]();
    } else {
        console.warn(`Unknown feature: ${featureName}`);
        console.log('Available features:', Object.keys(featureUpdaters).join(', '));
    }
}

// CLI usage
if (process.argv[1] === __filename) {
    const feature = process.argv[2];
    if (feature) {
        await updateDemoDataForFeature(feature);
    } else {
        console.log('Usage: node demo-features.mjs <feature>');
        console.log('Available features:', Object.keys(featureUpdaters).join(', '));
        console.log('\nExample: node demo-features.mjs votingSystem');
    }
}