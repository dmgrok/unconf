import bcrypt from 'bcryptjs';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function createTestOrganizer() {
	try {
		// Hash the password
		const password = 'test1234';
		const hashedPassword = await bcrypt.hash(password, 10);

		// Read existing users
		const usersPath = path.join(__dirname, '../data/users.json');
		const usersData = await fs.readFile(usersPath, 'utf-8');
		const users = JSON.parse(usersData);

		// Create test organizer
		const testOrganizer = {
			id: `test-organizer-${Date.now()}`,
			name: 'Test Organizer',
			email: 'organizer@test.com',
			password: hashedPassword,
			role: 'organizer',
			isGuest: false,
			lastActiveAt: new Date().toISOString(),
			preferences: {
				language: 'en',
				notifications: true,
				theme: 'auto',
				soundEnabled: true
			},
			metadata: {
				isTest: true
			},
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString()
		};

		// Add to users array
		users.push(testOrganizer);

		// Write back to file
		await fs.writeFile(usersPath, JSON.stringify(users, null, 2));

		console.log('✅ Test organizer created successfully!');
		console.log('\nLogin credentials:');
		console.log('Email: organizer@test.com');
		console.log('Password: test1234');
		console.log('\nUser ID:', testOrganizer.id);
	} catch (error) {
		console.error('❌ Error creating test organizer:', error);
		process.exit(1);
	}
}

createTestOrganizer();
