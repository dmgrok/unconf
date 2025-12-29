import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import bcrypt from 'bcryptjs';
import { UserRepository } from '$lib/storage/UserRepository';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { name, email, password } = await request.json();

		// Validate input
		if (!name || !email || !password) {
			return json(
				{
					success: false,
					error: 'Name, email, and password are required'
				},
				{ status: 400 }
			);
		}

		// Validate name length
		if (name.trim().length < 2) {
			return json(
				{
					success: false,
					error: 'Name must be at least 2 characters'
				},
				{ status: 400 }
			);
		}

		// Validate email format
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(email)) {
			return json(
				{
					success: false,
					error: 'Invalid email address'
				},
				{ status: 400 }
			);
		}

		// Validate password length
		if (password.length < 8) {
			return json(
				{
					success: false,
					error: 'Password must be at least 8 characters'
				},
				{ status: 400 }
			);
		}

		// Initialize user repository
		const userRepo = new UserRepository({
			dataDir: './data'
		});

		// Check if user already exists
		const existingUser = await userRepo.findByEmail(email);
		if (existingUser.success) {
			return json(
				{
					success: false,
					error: 'An account with this email already exists'
				},
				{ status: 409 }
			);
		}

		// Hash password
		const hashedPassword = await bcrypt.hash(password, 10);

		// Create user with password
		const newUser = {
			name: name.trim(),
			email: email.toLowerCase().trim(),
			password: hashedPassword,
			role: 'organizer' as const, // New registrations are organizers
			isGuest: false,
			lastActiveAt: new Date(),
			preferences: {
				language: 'en',
				notifications: true,
				theme: 'auto' as const,
				soundEnabled: true
			}
		};

		const result = await userRepo.create(newUser);

		if (!result.success) {
			console.error('Failed to create user:', result.error);
			return json(
				{
					success: false,
					error: 'Failed to create account. Please try again.'
				},
				{ status: 500 }
			);
		}

		// Return success (without password)
		const { password: _, ...userWithoutPassword } = result.data;

		return json({
			success: true,
			message: 'Account created successfully',
			user: userWithoutPassword
		});
	} catch (error) {
		console.error('Registration error:', error);
		return json(
			{
				success: false,
				error: 'An error occurred during registration. Please try again.'
			},
			{ status: 500 }
		);
	}
};
