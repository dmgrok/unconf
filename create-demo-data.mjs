#!/usr/bin/env node

/**
 * Simple Demo Data Creator
 * Creates sample event data by writing directly to JSON files
 */

import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Ensure data directory exists
const dataDir = join(__dirname, 'data');
const backupsDir = join(dataDir, 'backups');

async function ensureDirectoryExists(dir) {
    try {
        await fs.access(dir);
    } catch {
        await fs.mkdir(dir, { recursive: true });
    }
}

// Generate IDs
function generateId() {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

async function createDemoData() {
    try {
        console.log('🚀 Creating demo data...\n');

        // Ensure directories exist
        await ensureDirectoryExists(dataDir);
        await ensureDirectoryExists(backupsDir);

        const now = new Date();
        const startTime = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now
        const endTime = new Date(startTime.getTime() + 8 * 60 * 60 * 1000); // 8 hours duration

        // Create demo users
        const users = [
            {
                id: generateId(),
                name: 'Sarah Chen',
                email: 'sarah.chen@demo.com',
                role: 'organizer',
                isGuest: false,
                lastActiveAt: now.toISOString(),
                preferences: {
                    language: 'en',
                    notifications: true,
                    theme: 'light',
                    soundEnabled: true
                },
                metadata: { isDemo: true },
                createdAt: now.toISOString(),
                updatedAt: now.toISOString()
            },
            {
                id: generateId(),
                name: 'Alex Rodriguez',
                email: 'alex.rodriguez@demo.com',
                role: 'participant',
                isGuest: false,
                lastActiveAt: now.toISOString(),
                preferences: {
                    language: 'en',
                    notifications: true,
                    theme: 'dark',
                    soundEnabled: false
                },
                metadata: { isDemo: true },
                createdAt: now.toISOString(),
                updatedAt: now.toISOString()
            },
            {
                id: generateId(),
                name: 'Demo Guest',
                role: 'guest',
                isGuest: true,
                lastActiveAt: now.toISOString(),
                metadata: { isDemo: true },
                createdAt: now.toISOString(),
                updatedAt: now.toISOString()
            }
        ];

        // Create demo event
        const event = {
            id: generateId(),
            title: 'Tech Innovation Unconference 2024',
            description: 'A collaborative space for technologists, entrepreneurs, and innovators to share ideas, discuss emerging trends, and build connections. Join us for an engaging day of learning and networking!',
            status: 'active',
            organizerId: users[0].id,
            maxParticipants: 100,
            accessCode: 'DEMO2024',
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString(),
            currentActivity: 'voting',
            settings: {
                allowGuestAccess: true,
                requireRegistration: false,
                enableVoting: true,
                enableGroupIntelligence: true,
                enableDiscussionGroups: true,
                enableTeamDistribution: true,
                votingTimeLimit: 300,
                maxVotesPerTopic: 1,
                maxTopicsPerUser: 5,
                autoAdvanceActivities: false
            },
            metadata: {
                isDemo: true,
                participantCount: users.length
            },
            createdAt: now.toISOString(),
            updatedAt: now.toISOString()
        };

        // Create demo topics
        const topics = [
            {
                id: generateId(),
                title: 'AI Ethics and Responsible Development',
                description: 'Discussing the ethical implications of AI development and how we can build responsible AI systems that benefit society. What frameworks and practices should we adopt?',
                eventId: event.id,
                submittedBy: users[0].id,
                status: 'active',
                tags: ['ai', 'ethics', 'responsibility'],
                voteCount: 2,
                totalVoteWeight: 5,
                averageWeight: 2.5,
                lastVotedAt: now.toISOString(),
                createdAt: now.toISOString(),
                updatedAt: now.toISOString()
            },
            {
                id: generateId(),
                title: 'Sustainable Tech: Green Computing Practices',
                description: 'Exploring ways to reduce the environmental impact of technology through green computing, efficient algorithms, and sustainable hardware practices.',
                eventId: event.id,
                submittedBy: users[1].id,
                status: 'active',
                tags: ['sustainability', 'environment', 'green-tech'],
                voteCount: 1,
                totalVoteWeight: 2,
                averageWeight: 2.0,
                lastVotedAt: now.toISOString(),
                createdAt: now.toISOString(),
                updatedAt: now.toISOString()
            },
            {
                id: generateId(),
                title: 'Remote Work: Tools and Culture Evolution',
                description: 'Best practices for remote work collaboration, tools that enhance productivity, and building strong team culture in distributed organizations.',
                eventId: event.id,
                submittedBy: users[2].id,
                status: 'active',
                tags: ['remote-work', 'collaboration', 'culture'],
                voteCount: 1,
                totalVoteWeight: 1,
                averageWeight: 1.0,
                lastVotedAt: now.toISOString(),
                createdAt: now.toISOString(),
                updatedAt: now.toISOString()
            },
            {
                id: generateId(),
                title: 'Blockchain Beyond Cryptocurrency',
                description: 'Real-world applications of blockchain technology beyond financial systems - supply chain, identity verification, smart contracts, and decentralized governance.',
                eventId: event.id,
                submittedBy: users[0].id,
                status: 'active',
                tags: ['blockchain', 'innovation', 'decentralization'],
                voteCount: 0,
                totalVoteWeight: 0,
                averageWeight: 0,
                createdAt: now.toISOString(),
                updatedAt: now.toISOString()
            },
            {
                id: generateId(),
                title: 'Mental Health in Tech Workplaces',
                description: 'Addressing burnout, stress management, and creating supportive environments for mental health in technology companies and startups.',
                eventId: event.id,
                submittedBy: users[1].id,
                status: 'active',
                tags: ['mental-health', 'workplace', 'wellbeing'],
                voteCount: 0,
                totalVoteWeight: 0,
                averageWeight: 0,
                createdAt: now.toISOString(),
                updatedAt: now.toISOString()
            }
        ];

        // Create demo votes
        const votes = [
            {
                id: generateId(),
                userId: users[0].id,
                topicId: topics[0].id,
                eventId: event.id,
                weight: 'first',
                timestamp: now.toISOString(),
                isActive: true,
                createdAt: now.toISOString(),
                updatedAt: now.toISOString()
            },
            {
                id: generateId(),
                userId: users[1].id,
                topicId: topics[0].id,
                eventId: event.id,
                weight: 'second',
                timestamp: now.toISOString(),
                isActive: true,
                createdAt: now.toISOString(),
                updatedAt: now.toISOString()
            },
            {
                id: generateId(),
                userId: users[1].id,
                topicId: topics[1].id,
                eventId: event.id,
                weight: 'second',
                timestamp: now.toISOString(),
                isActive: true,
                createdAt: now.toISOString(),
                updatedAt: now.toISOString()
            },
            {
                id: generateId(),
                userId: users[2].id,
                topicId: topics[2].id,
                eventId: event.id,
                weight: 'third',
                timestamp: now.toISOString(),
                isActive: true,
                createdAt: now.toISOString(),
                updatedAt: now.toISOString()
            }
        ];

        // Write data files
        await fs.writeFile(
            join(dataDir, 'events.json'),
            JSON.stringify([event], null, 2)
        );
        console.log('✅ Created events.json with demo event');

        await fs.writeFile(
            join(dataDir, 'users.json'),
            JSON.stringify(users, null, 2)
        );
        console.log('✅ Created users.json with demo users');

        await fs.writeFile(
            join(dataDir, 'topics.json'),
            JSON.stringify(topics, null, 2)
        );
        console.log('✅ Created topics.json with demo topics');

        await fs.writeFile(
            join(dataDir, 'votes.json'),
            JSON.stringify(votes, null, 2)
        );
        console.log('✅ Created votes.json with demo votes');

        console.log('');
        console.log('🎉 Demo data creation complete!');
        console.log('');
        console.log('📋 Demo Event Details:');
        console.log(`   📝 Event: ${event.title}`);
        console.log(`   🔑 Access Code: ${event.accessCode}`);
        console.log(`   👥 Organizer: ${users[0].name} (${users[0].email})`);
        console.log(`   📊 Topics: ${topics.length} sample discussion topics`);
        console.log(`   🗳️  Votes: ${votes.length} sample votes`);
        console.log('');
        console.log('🚀 You can now start the development server and use the access code "DEMO2024" to join the demo event!');
        console.log('');
        console.log('🗳️ Weighted Voting System:');
        console.log('   • 1st Choice: 🥇 3 points');
        console.log('   • 2nd Choice: 🥈 2 points');
        console.log('   • 3rd Choice: 🥉 1 point');

    } catch (error) {
        console.error('❌ Failed to create demo data:', error);
        process.exit(1);
    }
}

createDemoData();