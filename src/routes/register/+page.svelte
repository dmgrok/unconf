<script lang="ts">
	import { goto } from '$app/navigation';
	import { toast } from '$lib/stores/toast';
	import { Eye, EyeOff, CheckCircle, XCircle } from 'lucide-svelte';

	let name = $state('');
	let email = $state('');
	let password = $state('');
	let confirmPassword = $state('');
	let acceptTerms = $state(false);
	let loading = $state(false);
	let showPassword = $state(false);
	let showConfirmPassword = $state(false);

	// Password strength indicators
	let passwordStrength = $derived(() => {
		if (!password) return { score: 0, label: '', color: '' };

		let score = 0;
		if (password.length >= 8) score++;
		if (password.length >= 12) score++;
		if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
		if (/[0-9]/.test(password)) score++;
		if (/[^A-Za-z0-9]/.test(password)) score++;

		if (score <= 2) return { score, label: 'Weak', color: '#ef4444' };
		if (score === 3) return { score, label: 'Fair', color: '#f59e0b' };
		if (score === 4) return { score, label: 'Good', color: '#10b981' };
		return { score, label: 'Strong', color: '#10b981' };
	});

	let validations = $derived({
		nameValid: name.trim().length >= 2,
		emailValid: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
		passwordLength: password.length >= 8,
		passwordMatch: password === confirmPassword && password.length > 0,
		termsAccepted: acceptTerms
	});

	let formValid = $derived(
		validations.nameValid &&
		validations.emailValid &&
		validations.passwordLength &&
		validations.passwordMatch &&
		validations.termsAccepted
	);

	async function handleSubmit(e: Event) {
		e.preventDefault();

		if (!formValid) {
			toast.warning('Please fix the form errors before submitting');
			return;
		}

		loading = true;

		try {
			const response = await fetch('/api/auth/register', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name, email, password })
			});

			const result = await response.json();

			if (result.success) {
				toast.success('Account created successfully! Redirecting...');
				// Redirect to signin page
				setTimeout(() => goto('/signin?registered=true'), 1000);
			} else {
				toast.error(result.error || 'Registration failed. Please try again.');
				loading = false;
			}
		} catch (error) {
			console.error('Registration error:', error);
			toast.error('An error occurred. Please try again.');
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>Create Account - UnConf</title>
	<meta name="description" content="Create your UnConf organizer account" />
</svelte:head>

<div class="register-container">
	<div class="register-card">
		<h1>Create Your Account</h1>
		<p class="subtitle">Start organizing unconferences today</p>

		<form onsubmit={handleSubmit} class="register-form">
			<!-- Name Field -->
			<div class="form-group">
				<label for="name">Full Name</label>
				<input
					id="name"
					type="text"
					bind:value={name}
					placeholder="Enter your full name"
					class="form-input"
					class:valid={name && validations.nameValid}
					class:invalid={name && !validations.nameValid}
					disabled={loading}
					required
				/>
				{#if name && !validations.nameValid}
					<p class="field-error">Name must be at least 2 characters</p>
				{/if}
			</div>

			<!-- Email Field -->
			<div class="form-group">
				<label for="email">Email Address</label>
				<input
					id="email"
					type="email"
					bind:value={email}
					placeholder="your@email.com"
					class="form-input"
					class:valid={email && validations.emailValid}
					class:invalid={email && !validations.emailValid}
					disabled={loading}
					required
				/>
				{#if email && !validations.emailValid}
					<p class="field-error">Please enter a valid email address</p>
				{/if}
			</div>

			<!-- Password Field -->
			<div class="form-group">
				<label for="password">Password</label>
				<div class="password-input-wrapper">
					<input
						id="password"
						type={showPassword ? 'text' : 'password'}
						bind:value={password}
						placeholder="Create a strong password"
						class="form-input"
						class:valid={password && validations.passwordLength}
						class:invalid={password && !validations.passwordLength}
						disabled={loading}
						required
					/>
					<button
						type="button"
						class="password-toggle"
						onclick={() => (showPassword = !showPassword)}
						aria-label={showPassword ? 'Hide password' : 'Show password'}
					>
						{#if showPassword}
							<EyeOff size={20} />
						{:else}
							<Eye size={20} />
						{/if}
					</button>
				</div>
				{#if password}
					<div class="password-strength">
						<div class="strength-bar">
							<div
								class="strength-fill"
								style="width: {(passwordStrength().score / 5) * 100}%; background-color: {passwordStrength().color}"
							></div>
						</div>
						<span class="strength-label" style="color: {passwordStrength().color}">
							{passwordStrength().label}
						</span>
					</div>
					<ul class="password-requirements">
						<li class:met={validations.passwordLength}>
							{#if validations.passwordLength}
								<CheckCircle size={14} />
							{:else}
								<XCircle size={14} />
							{/if}
							At least 8 characters
						</li>
					</ul>
				{/if}
			</div>

			<!-- Confirm Password Field -->
			<div class="form-group">
				<label for="confirm-password">Confirm Password</label>
				<div class="password-input-wrapper">
					<input
						id="confirm-password"
						type={showConfirmPassword ? 'text' : 'password'}
						bind:value={confirmPassword}
						placeholder="Re-enter your password"
						class="form-input"
						class:valid={confirmPassword && validations.passwordMatch}
						class:invalid={confirmPassword && !validations.passwordMatch}
						disabled={loading}
						required
					/>
					<button
						type="button"
						class="password-toggle"
						onclick={() => (showConfirmPassword = !showConfirmPassword)}
						aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
					>
						{#if showConfirmPassword}
							<EyeOff size={20} />
						{:else}
							<Eye size={20} />
						{/if}
					</button>
				</div>
				{#if confirmPassword && !validations.passwordMatch}
					<p class="field-error">Passwords do not match</p>
				{/if}
			</div>

			<!-- Terms Acceptance -->
			<div class="form-group checkbox-group">
				<label class="checkbox-label">
					<input
						type="checkbox"
						bind:checked={acceptTerms}
						disabled={loading}
						required
					/>
					<span>
						I agree to the <a href="/terms" target="_blank">Terms of Service</a> and
						<a href="/privacy" target="_blank">Privacy Policy</a>
					</span>
				</label>
			</div>

			<!-- Submit Button -->
			<button
				type="submit"
				class="submit-button"
				disabled={!formValid || loading}
			>
				{loading ? 'Creating Account...' : 'Create Account'}
			</button>
		</form>

		<!-- Sign In Link -->
		<div class="signin-link">
			Already have an account?
			<a href="/signin">Sign in</a>
		</div>
	</div>
</div>

<style>
	.register-container {
		display: flex;
		justify-content: center;
		align-items: center;
		min-height: 80vh;
		padding: 2rem 1rem;
	}

	.register-card {
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 12px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
		padding: 2.5rem;
		width: 100%;
		max-width: 480px;
	}

	h1 {
		margin: 0 0 0.5rem 0;
		font-size: 2rem;
		color: #f4f4f5;
		text-align: center;
	}

	.subtitle {
		color: #a1a1aa;
		margin: 0 0 2rem 0;
		text-align: center;
		font-size: 0.95rem;
	}

	.register-form {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	label {
		font-size: 0.875rem;
		font-weight: 500;
		color: #d4d4d8;
	}

	.form-input {
		width: 100%;
		padding: 0.75rem;
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 8px;
		font-size: 1rem;
		transition: all 0.2s;
		box-sizing: border-box;
		background: rgba(255, 255, 255, 0.05);
		color: #e4e4e7;
	}

	.form-input:focus {
		outline: none;
		border-color: #6366f1;
		background: rgba(255, 255, 255, 0.08);
	}

	.form-input::placeholder {
		color: #71717a;
	}

	.form-input.valid {
		border-color: #22c55e;
	}

	.form-input.invalid {
		border-color: #ef4444;
	}

	.password-input-wrapper {
		position: relative;
	}

	.password-toggle {
		position: absolute;
		right: 0.75rem;
		top: 50%;
		transform: translateY(-50%);
		background: none;
		border: none;
		color: #a1a1aa;
		cursor: pointer;
		padding: 0.25rem;
		display: flex;
		align-items: center;
		transition: color 0.2s;
	}

	.password-toggle:hover {
		color: #e4e4e7;
	}

	.password-strength {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.strength-bar {
		flex: 1;
		height: 4px;
		background: rgba(255, 255, 255, 0.1);
		border-radius: 2px;
		overflow: hidden;
	}

	.strength-fill {
		height: 100%;
		transition: all 0.3s;
	}

	.strength-label {
		font-size: 0.75rem;
		font-weight: 500;
	}

	.password-requirements {
		list-style: none;
		padding: 0;
		margin: 0;
		font-size: 0.75rem;
	}

	.password-requirements li {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		color: #a1a1aa;
		padding: 0.25rem 0;
	}

	.password-requirements li.met {
		color: #4ade80;
	}

	.field-error {
		color: #f87171;
		font-size: 0.75rem;
		margin: 0;
	}

	.checkbox-group {
		margin-top: 0.5rem;
	}

	.checkbox-label {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
		font-size: 0.875rem;
		color: #a1a1aa;
		cursor: pointer;
	}

	.checkbox-label input[type='checkbox'] {
		margin-top: 0.25rem;
		width: 18px;
		height: 18px;
		cursor: pointer;
	}

	.checkbox-label a {
		color: #818cf8;
		text-decoration: none;
	}

	.checkbox-label a:hover {
		text-decoration: underline;
	}

	.submit-button {
		width: 100%;
		padding: 0.875rem;
		background: #6366f1;
		color: white;
		border: none;
		border-radius: 8px;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
		margin-top: 0.5rem;
	}

	.submit-button:hover:not(:disabled) {
		background: #4f46e5;
	}

	.submit-button:disabled {
		background: #52525b;
		cursor: not-allowed;
	}

	.signin-link {
		text-align: center;
		margin-top: 1.5rem;
		font-size: 0.9rem;
		color: #a1a1aa;
	}

	.signin-link a {
		color: #818cf8;
		text-decoration: none;
		font-weight: 500;
	}

	.signin-link a:hover {
		text-decoration: underline;
	}

	@media (max-width: 640px) {
		.register-card {
			padding: 1.5rem;
		}

		h1 {
			font-size: 1.5rem;
		}
	}
</style>
