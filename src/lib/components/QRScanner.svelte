<script lang="ts">
	import { onMount, onDestroy, createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher<{
		detected: { code: string };
		error: { error: string };
		close: void;
	}>();

	let videoElement: HTMLVideoElement;
	let canvasElement: HTMLCanvasElement;
	let stream: MediaStream | null = null;
	let scanning = false;
	let animationFrameId: number | null = null;
	let hasCamera = false;
	let permissionDenied = false;

	async function startScanning() {
		try {
			// Request camera access
			stream = await navigator.mediaDevices.getUserMedia({
				video: {
					facingMode: 'environment', // Use back camera on mobile
					width: { ideal: 1280 },
					height: { ideal: 720 }
				}
			});

			hasCamera = true;
			permissionDenied = false;

			if (videoElement) {
				videoElement.srcObject = stream;
				videoElement.play();
				scanning = true;
				scanFrame();
			}
		} catch (err) {
			console.error('Failed to access camera:', err);

			if (err instanceof Error) {
				if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
					permissionDenied = true;
					dispatch('error', { error: 'Camera permission denied. Please enable camera access and try again.' });
				} else if (err.name === 'NotFoundError') {
					dispatch('error', { error: 'No camera found on this device. Please enter the code manually.' });
				} else {
					dispatch('error', { error: 'Failed to access camera. Please try again or enter the code manually.' });
				}
			}

			hasCamera = false;
		}
	}

	function scanFrame() {
		if (!scanning || !videoElement || !canvasElement) return;

		const canvas = canvasElement;
		const context = canvas.getContext('2d');

		if (!context || videoElement.readyState !== videoElement.HAVE_ENOUGH_DATA) {
			animationFrameId = requestAnimationFrame(scanFrame);
			return;
		}

		// Set canvas dimensions to match video
		canvas.width = videoElement.videoWidth;
		canvas.height = videoElement.videoHeight;

		// Draw current video frame
		context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

		// Get image data
		const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

		// Try to detect QR code
		const code = detectQRCode(imageData);

		if (code) {
			handleCodeDetected(code);
		} else {
			// Continue scanning
			animationFrameId = requestAnimationFrame(scanFrame);
		}
	}

	function detectQRCode(imageData: ImageData): string | null {
		// This is a placeholder for actual QR code detection
		// In a real implementation, you would use a library like jsQR
		// For now, we'll just return null to allow manual testing

		// Example with jsQR library (would need to be installed):
		// import jsQR from 'jsQR';
		// const code = jsQR(imageData.data, imageData.width, imageData.height);
		// if (code) {
		//   return code.data;
		// }

		return null;
	}

	function handleCodeDetected(code: string) {
		scanning = false;

		if (animationFrameId) {
			cancelAnimationFrame(animationFrameId);
			animationFrameId = null;
		}

		// Extract access code from QR code data
		// Assume QR contains just the code, or extract from URL
		let accessCode = code;

		// If it's a URL, try to extract the code
		try {
			const url = new URL(code);
			const codeParam = url.searchParams.get('code') || url.searchParams.get('access');
			if (codeParam) {
				accessCode = codeParam;
			}
		} catch {
			// Not a URL, use as-is
		}

		dispatch('detected', { code: accessCode });
		stopScanning();
	}

	function stopScanning() {
		scanning = false;

		if (animationFrameId) {
			cancelAnimationFrame(animationFrameId);
			animationFrameId = null;
		}

		if (stream) {
			stream.getTracks().forEach(track => track.stop());
			stream = null;
		}
	}

	function handleClose() {
		stopScanning();
		dispatch('close');
	}

	onMount(() => {
		// Check if camera is available
		if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
			startScanning();
		} else {
			dispatch('error', { error: 'Camera is not supported on this device or browser.' });
		}
	});

	onDestroy(() => {
		stopScanning();
	});
</script>

<div class="qr-scanner">
	<div class="scanner-header">
		<h3>Scan QR Code</h3>
		<button class="close-btn" on:click={handleClose} aria-label="Close scanner">
			<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
				<path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
			</svg>
		</button>
	</div>

	<div class="scanner-content">
		{#if permissionDenied}
			<div class="permission-message">
				<svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
					<path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM13 17H11V15H13V17ZM13 13H11V7H13V13Z" fill="currentColor"/>
				</svg>
				<p><strong>Camera Permission Required</strong></p>
				<p>Please allow camera access to scan QR codes.</p>
				<p class="hint">Check your browser settings and reload the page.</p>
			</div>
		{:else if hasCamera}
			<div class="video-wrapper">
				<!-- Video element for camera feed -->
				<video bind:this={videoElement} autoplay playsinline muted></video>

				<!-- Canvas for QR detection -->
				<canvas bind:this={canvasElement} style="display: none;"></canvas>

				<!-- Scanning overlay -->
				<div class="scan-overlay">
					<div class="scan-box">
						<div class="corner corner-tl"></div>
						<div class="corner corner-tr"></div>
						<div class="corner corner-bl"></div>
						<div class="corner corner-br"></div>
						<div class="scan-line"></div>
					</div>
				</div>
			</div>

			<div class="scanner-instructions">
				<p>Position the QR code within the frame</p>
			</div>
		{:else}
			<div class="loading-state">
				<div class="spinner"></div>
				<p>Initializing camera...</p>
			</div>
		{/if}
	</div>
</div>

<style>
	.qr-scanner {
		width: 100%;
		background: var(--color-background, #ffffff);
		border-radius: 0.5rem;
		overflow: hidden;
	}

	.scanner-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem 1.5rem;
		background: var(--color-gray-100, #f3f4f6);
		border-bottom: 1px solid var(--color-border, #e5e7eb);
	}

	.scanner-header h3 {
		margin: 0;
		font-size: 1.125rem;
		font-weight: 600;
		color: var(--color-text-primary, #1f2937);
	}

	.close-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0.5rem;
		background: none;
		border: none;
		color: var(--color-text-secondary, #6b7280);
		cursor: pointer;
		border-radius: 0.25rem;
		transition: all 0.2s;
	}

	.close-btn:hover {
		background: var(--color-gray-200, #e5e7eb);
		color: var(--color-text-primary, #1f2937);
	}

	.scanner-content {
		padding: 1.5rem;
	}

	.video-wrapper {
		position: relative;
		width: 100%;
		max-width: 400px;
		margin: 0 auto;
		aspect-ratio: 1;
		background: #000;
		border-radius: 0.5rem;
		overflow: hidden;
	}

	video {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.scan-overlay {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(0, 0, 0, 0.3);
	}

	.scan-box {
		position: relative;
		width: 70%;
		aspect-ratio: 1;
		border: 2px solid rgba(255, 255, 255, 0.5);
	}

	.corner {
		position: absolute;
		width: 20px;
		height: 20px;
		border: 3px solid var(--color-success, #059669);
	}

	.corner-tl {
		top: -2px;
		left: -2px;
		border-right: none;
		border-bottom: none;
	}

	.corner-tr {
		top: -2px;
		right: -2px;
		border-left: none;
		border-bottom: none;
	}

	.corner-bl {
		bottom: -2px;
		left: -2px;
		border-right: none;
		border-top: none;
	}

	.corner-br {
		bottom: -2px;
		right: -2px;
		border-left: none;
		border-top: none;
	}

	.scan-line {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 2px;
		background: linear-gradient(to right, transparent, var(--color-success, #059669), transparent);
		animation: scan 2s ease-in-out infinite;
	}

	@keyframes scan {
		0%, 100% {
			top: 0;
			opacity: 1;
		}
		50% {
			top: calc(100% - 2px);
			opacity: 0.7;
		}
	}

	.scanner-instructions {
		margin-top: 1rem;
		text-align: center;
	}

	.scanner-instructions p {
		margin: 0;
		color: var(--color-text-secondary, #6b7280);
		font-size: 0.875rem;
	}

	.permission-message {
		text-align: center;
		padding: 2rem 1rem;
		color: var(--color-text-secondary, #6b7280);
	}

	.permission-message svg {
		opacity: 0.5;
		margin-bottom: 1rem;
	}

	.permission-message p {
		margin: 0.5rem 0;
	}

	.permission-message strong {
		color: var(--color-text-primary, #1f2937);
	}

	.permission-message .hint {
		font-size: 0.875rem;
		font-style: italic;
		margin-top: 1rem;
	}

	.loading-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 3rem 1rem;
	}

	.spinner {
		width: 3rem;
		height: 3rem;
		border: 3px solid var(--color-gray-300, #d1d5db);
		border-radius: 50%;
		border-top-color: var(--color-primary, #3b82f6);
		animation: spin 1s linear infinite;
		margin-bottom: 1rem;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.loading-state p {
		margin: 0;
		color: var(--color-text-secondary, #6b7280);
		font-size: 0.875rem;
	}

	@media (max-width: 640px) {
		.scanner-content {
			padding: 1rem;
		}

		.video-wrapper {
			max-width: 100%;
		}
	}
</style>
