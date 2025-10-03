<script lang="ts">
	/**
	 * Participant Roster Import Component
	 * Handles CSV/Excel file upload and column mapping
	 */
	import { Upload, FileText, AlertCircle, CheckCircle, X, ArrowRight } from 'lucide-svelte';
	import { createEventDispatcher } from 'svelte';
	import {
		parseCSV,
		parseExcel,
		detectColumnType,
		validateMapping,
		applyMapping,
		validateImportData,
		type ParseResult,
		type ColumnMapping,
		type ParticipantImportData,
		type ImportOptions
	} from '../utils/csv-parser';

	interface ParticipantImporterProps {
		eventId: string;
		requiredFields?: ('name' | 'email')[];
		allowCustomFields?: boolean;
		maxFileSize?: number; // in bytes
		class?: string;
	}

	let {
		eventId,
		requiredFields = ['name'],
		allowCustomFields = true,
		maxFileSize = 5 * 1024 * 1024,
		class: className = ''
	}: ParticipantImporterProps = $props();

	const dispatch = createEventDispatcher<{
		import: { eventId: string; participants: ParticipantImportData[] };
		cancel: void;
	}>();

	// State
	let step = $state<'upload' | 'configure' | 'mapping' | 'preview'>('upload');
	let file = $state<File | null>(null);
	let parseResult = $state<ParseResult | null>(null);
	let importOptions = $state<ImportOptions>({ hasHeaders: true });
	let columnMappings = $state<ColumnMapping[]>([]);
	let previewData = $state<ParticipantImportData[]>([]);
	let validationResult = $state<{ valid: boolean; errors: string[]; warnings: string[] } | null>(
		null
	);
	let isProcessing = $state(false);
	let error = $state<string | null>(null);

	// Drag and drop state
	let isDragging = $state(false);

	// Target field options
	const targetFieldOptions = [
		{ value: 'name', label: 'Name', required: true },
		{ value: 'email', label: 'Email', required: false },
		{ value: 'category', label: 'Category', required: false },
		{ value: 'preference', label: 'Preference', required: false },
		...(allowCustomFields ? [{ value: 'custom', label: 'Custom Field', required: false }] : []),
		{ value: 'skip', label: '(Skip)', required: false }
	];

	function handleFileSelect(event: Event) {
		const target = event.target as HTMLInputElement;
		if (target.files && target.files[0]) {
			processFile(target.files[0]);
		}
	}

	function handleDrop(event: DragEvent) {
		event.preventDefault();
		isDragging = false;

		const files = event.dataTransfer?.files;
		if (files && files[0]) {
			processFile(files[0]);
		}
	}

	function handleDragOver(event: DragEvent) {
		event.preventDefault();
		isDragging = true;
	}

	function handleDragLeave() {
		isDragging = false;
	}

	async function processFile(selectedFile: File) {
		error = null;

		// Validate file size
		if (selectedFile.size > maxFileSize) {
			error = `File size exceeds ${Math.round(maxFileSize / 1024 / 1024)}MB limit`;
			return;
		}

		// Validate file type
		const validTypes = [
			'text/csv',
			'text/plain',
			'application/vnd.ms-excel',
			'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
		];
		if (!validTypes.includes(selectedFile.type) && !selectedFile.name.match(/\.(csv|xlsx|xls)$/i)) {
			error = 'Invalid file type. Please upload a CSV or Excel file.';
			return;
		}

		file = selectedFile;
		isProcessing = true;

		try {
			// Parse file based on extension
			if (selectedFile.name.endsWith('.xlsx') || selectedFile.name.endsWith('.xls')) {
				parseResult = await parseExcel(selectedFile);
			} else {
				const content = await selectedFile.text();
				parseResult = parseCSV(content, importOptions);
			}

			// Auto-generate initial mappings based on detected types
			columnMappings = parseResult.columns.map((col) => {
				let targetField: ColumnMapping['targetField'] = 'skip' as any;

				// Try to match column headers to target fields
				const headerLower = col.header.toLowerCase();
				if (headerLower.includes('name') || headerLower.includes('participant')) {
					targetField = 'name';
				} else if (headerLower.includes('email') || headerLower.includes('mail')) {
					targetField = 'email';
				} else if (
					headerLower.includes('category') ||
					headerLower.includes('group') ||
					headerLower.includes('type')
				) {
					targetField = 'category';
				} else if (headerLower.includes('preference') || headerLower.includes('choice')) {
					targetField = 'preference';
				}

				return {
					sourceColumn: col.index,
					targetField
				};
			});

			step = 'mapping';
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to parse file';
		} finally {
			isProcessing = false;
		}
	}

	function updateMapping(columnIndex: number, targetField: string, customFieldName?: string) {
		const mapping = columnMappings[columnIndex];
		if (mapping) {
			mapping.targetField = targetField as ColumnMapping['targetField'];
			if (targetField === 'custom') {
				mapping.customFieldName = customFieldName || '';
			} else {
				mapping.customFieldName = undefined;
			}
		}
	}

	function validateAndPreview() {
		if (!parseResult) return;

		// Filter out skipped columns
		const activeMappings = columnMappings.filter((m) => m.targetField !== ('skip' as any));

		// Validate mapping
		const mappingValidation = validateMapping(activeMappings, requiredFields);
		if (!mappingValidation.valid) {
			error = mappingValidation.errors.join('; ');
			return;
		}

		// Apply mapping
		previewData = applyMapping(parseResult.rows, activeMappings);

		// Validate import data
		validationResult = validateImportData(previewData);

		step = 'preview';
	}

	function handleImport() {
		if (validationResult && !validationResult.valid) {
			error = 'Please fix validation errors before importing';
			return;
		}

		dispatch('import', {
			eventId,
			participants: previewData
		});
	}

	function reset() {
		step = 'upload';
		file = null;
		parseResult = null;
		columnMappings = [];
		previewData = [];
		validationResult = null;
		error = null;
	}
</script>

<div class="participant-importer {className}">
	<!-- Upload Step -->
	{#if step === 'upload'}
		<div class="upload-step">
			<h3>Import Participant Roster</h3>
			<p class="description">Upload a CSV or Excel file with participant information</p>

			<div
				class="drop-zone"
				class:dragging={isDragging}
				ondrop={handleDrop}
				ondragover={handleDragOver}
				ondragleave={handleDragLeave}
			>
				<Upload size={48} />
				<p><strong>Drag and drop</strong> your file here</p>
				<p class="or">or</p>
				<label class="file-input-label">
					<input
						type="file"
						accept=".csv,.xlsx,.xls"
						onchange={handleFileSelect}
						disabled={isProcessing}
					/>
					<span class="button">Choose File</span>
				</label>

				<p class="hint">Supported formats: CSV, Excel (.xlsx, .xls)</p>
				<p class="hint">Maximum file size: {Math.round(maxFileSize / 1024 / 1024)}MB</p>
			</div>

			{#if error}
				<div class="error-message">
					<AlertCircle size={20} />
					<span>{error}</span>
				</div>
			{/if}
		</div>
	{/if}

	<!-- Column Mapping Step -->
	{#if step === 'mapping' && parseResult}
		<div class="mapping-step">
			<div class="header">
				<div>
					<h3>Map Columns</h3>
					<p class="description">
						Match your file columns to participant fields
						{#if file}
							<span class="file-name">
								<FileText size={16} />
								{file.name}
							</span>
						{/if}
					</p>
				</div>
				<button class="close-button" onclick={reset} aria-label="Close">
					<X size={20} />
				</button>
			</div>

			<div class="mapping-grid">
				<div class="grid-header">
					<span>Source Column</span>
					<span></span>
					<span>Target Field</span>
					<span>Sample Data</span>
				</div>

				{#each parseResult.columns as column, index}
					<div class="mapping-row">
						<div class="source-column">
							<div class="column-name">{column.header}</div>
							<div class="column-type">{column.detectedType}</div>
						</div>

						<div class="arrow">
							<ArrowRight size={20} />
						</div>

						<div class="target-field">
							<select
								value={columnMappings[index]?.targetField || 'skip'}
								onchange={(e) =>
									updateMapping(index, (e.target as HTMLSelectElement).value)}
							>
								{#each targetFieldOptions as option}
									<option value={option.value}>
										{option.label}
										{option.required ? '*' : ''}
									</option>
								{/each}
							</select>

							{#if columnMappings[index]?.targetField === 'custom'}
								<input
									type="text"
									placeholder="Custom field name"
									value={columnMappings[index]?.customFieldName || ''}
									oninput={(e) =>
										updateMapping(
											index,
											'custom',
											(e.target as HTMLInputElement).value
										)}
									class="custom-field-input"
								/>
							{/if}
						</div>

						<div class="sample-data">
							{#each column.sampleValues.slice(0, 3) as sample}
								<div class="sample-value">{sample}</div>
							{/each}
						</div>
					</div>
				{/each}
			</div>

			{#if error}
				<div class="error-message">
					<AlertCircle size={20} />
					<span>{error}</span>
				</div>
			{/if}

			<div class="actions">
				<button class="button secondary" onclick={reset}>Cancel</button>
				<button class="button primary" onclick={validateAndPreview}>
					Preview Import ({parseResult.totalRows} rows)
				</button>
			</div>
		</div>
	{/if}

	<!-- Preview Step -->
	{#if step === 'preview' && validationResult}
		<div class="preview-step">
			<div class="header">
				<div>
					<h3>Preview Import</h3>
					<p class="description">Review participants before importing</p>
				</div>
				<button class="close-button" onclick={reset} aria-label="Close">
					<X size={20} />
				</button>
			</div>

			<!-- Validation Messages -->
			{#if validationResult.errors.length > 0}
				<div class="validation-errors">
					<AlertCircle size={20} />
					<div>
						<strong>Errors Found:</strong>
						<ul>
							{#each validationResult.errors as error}
								<li>{error}</li>
							{/each}
						</ul>
					</div>
				</div>
			{/if}

			{#if validationResult.warnings.length > 0}
				<div class="validation-warnings">
					<AlertCircle size={20} />
					<div>
						<strong>Warnings:</strong>
						<ul>
							{#each validationResult.warnings as warning}
								<li>{warning}</li>
							{/each}
						</ul>
					</div>
				</div>
			{/if}

			<!-- Preview Table -->
			<div class="preview-table-container">
				<table class="preview-table">
					<thead>
						<tr>
							<th>Name</th>
							<th>Email</th>
							<th>Category</th>
							<th>Preference</th>
							{#if previewData.some((p) => Object.keys(p.customFields || {}).length > 0)}
								<th>Custom Fields</th>
							{/if}
						</tr>
					</thead>
					<tbody>
						{#each previewData.slice(0, 10) as participant}
							<tr>
								<td>{participant.name || '—'}</td>
								<td>{participant.email || '—'}</td>
								<td>{participant.category || '—'}</td>
								<td>{participant.preference || '—'}</td>
								{#if previewData.some((p) => Object.keys(p.customFields || {}).length > 0)}
									<td>
										{#if participant.customFields && Object.keys(participant.customFields).length > 0}
											{Object.entries(participant.customFields)
												.map(([k, v]) => `${k}: ${v}`)
												.join(', ')}
										{:else}
											—
										{/if}
									</td>
								{/if}
							</tr>
						{/each}
					</tbody>
				</table>

				{#if previewData.length > 10}
					<p class="preview-note">
						Showing first 10 of {previewData.length} participants
					</p>
				{/if}
			</div>

			<div class="actions">
				<button class="button secondary" onclick={() => (step = 'mapping')}>
					Back to Mapping
				</button>
				<button
					class="button primary"
					onclick={handleImport}
					disabled={!validationResult.valid}
				>
					<CheckCircle size={20} />
					Import {previewData.length} Participants
				</button>
			</div>
		</div>
	{/if}

	{#if isProcessing}
		<div class="processing-overlay">
			<div class="spinner"></div>
			<p>Processing file...</p>
		</div>
	{/if}
</div>

<style>
	.participant-importer {
		background: white;
		border-radius: 12px;
		padding: 2rem;
		max-width: 900px;
		margin: 0 auto;
	}

	h3 {
		margin: 0 0 0.5rem 0;
		font-size: 1.5rem;
		color: #1f2937;
	}

	.description {
		color: #6b7280;
		margin: 0 0 1.5rem 0;
	}

	.file-name {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		margin-left: 0.5rem;
		padding: 0.25rem 0.5rem;
		background: #f3f4f6;
		border-radius: 4px;
		font-size: 0.875rem;
		color: #4b5563;
	}

	/* Upload Step */
	.drop-zone {
		border: 2px dashed #d1d5db;
		border-radius: 12px;
		padding: 3rem 2rem;
		text-align: center;
		transition: all 0.2s;
		background: #fafafa;
	}

	.drop-zone.dragging {
		border-color: #6366f1;
		background: #eef2ff;
	}

	.drop-zone svg {
		color: #9ca3af;
		margin-bottom: 1rem;
	}

	.drop-zone p {
		margin: 0.5rem 0;
		color: #6b7280;
	}

	.drop-zone .or {
		color: #9ca3af;
		font-size: 0.875rem;
	}

	.file-input-label {
		display: inline-block;
		margin: 1rem 0;
	}

	.file-input-label input[type='file'] {
		display: none;
	}

	.hint {
		font-size: 0.875rem;
		color: #9ca3af;
	}

	/* Mapping Step */
	.header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 1.5rem;
	}

	.close-button {
		background: none;
		border: none;
		padding: 0.5rem;
		cursor: pointer;
		color: #6b7280;
		border-radius: 6px;
		transition: all 0.2s;
	}

	.close-button:hover {
		background: #f3f4f6;
		color: #1f2937;
	}

	.mapping-grid {
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		overflow: hidden;
		margin-bottom: 1.5rem;
	}

	.grid-header {
		display: grid;
		grid-template-columns: 1fr 40px 1fr 1.5fr;
		gap: 1rem;
		padding: 1rem;
		background: #f9fafb;
		border-bottom: 1px solid #e5e7eb;
		font-weight: 600;
		font-size: 0.875rem;
		color: #374151;
	}

	.mapping-row {
		display: grid;
		grid-template-columns: 1fr 40px 1fr 1.5fr;
		gap: 1rem;
		padding: 1rem;
		border-bottom: 1px solid #f3f4f6;
		align-items: center;
	}

	.mapping-row:last-child {
		border-bottom: none;
	}

	.source-column {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.column-name {
		font-weight: 500;
		color: #1f2937;
	}

	.column-type {
		font-size: 0.75rem;
		color: #9ca3af;
		text-transform: uppercase;
	}

	.arrow {
		display: flex;
		justify-content: center;
		color: #d1d5db;
	}

	.target-field {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.target-field select {
		padding: 0.5rem;
		border: 1px solid #d1d5db;
		border-radius: 6px;
		font-size: 0.875rem;
		background: white;
		cursor: pointer;
	}

	.custom-field-input {
		padding: 0.5rem;
		border: 1px solid #d1d5db;
		border-radius: 6px;
		font-size: 0.875rem;
	}

	.sample-data {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.sample-value {
		font-size: 0.875rem;
		color: #6b7280;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	/* Preview Step */
	.validation-errors,
	.validation-warnings {
		display: flex;
		gap: 1rem;
		padding: 1rem;
		border-radius: 8px;
		margin-bottom: 1rem;
	}

	.validation-errors {
		background: #fef2f2;
		border: 1px solid #fecaca;
		color: #991b1b;
	}

	.validation-warnings {
		background: #fffbeb;
		border: 1px solid #fde68a;
		color: #92400e;
	}

	.validation-errors ul,
	.validation-warnings ul {
		margin: 0.5rem 0 0 0;
		padding-left: 1.5rem;
	}

	.preview-table-container {
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		overflow: auto;
		margin-bottom: 1rem;
	}

	.preview-table {
		width: 100%;
		border-collapse: collapse;
	}

	.preview-table th,
	.preview-table td {
		padding: 0.75rem;
		text-align: left;
		border-bottom: 1px solid #f3f4f6;
	}

	.preview-table th {
		background: #f9fafb;
		font-weight: 600;
		font-size: 0.875rem;
		color: #374151;
		position: sticky;
		top: 0;
	}

	.preview-table td {
		font-size: 0.875rem;
		color: #6b7280;
	}

	.preview-table tbody tr:hover {
		background: #fafafa;
	}

	.preview-note {
		text-align: center;
		font-size: 0.875rem;
		color: #6b7280;
		margin-top: 1rem;
	}

	/* Actions */
	.actions {
		display: flex;
		gap: 1rem;
		justify-content: flex-end;
	}

	/* Buttons */
	.button {
		padding: 0.75rem 1.5rem;
		border-radius: 8px;
		font-weight: 500;
		font-size: 0.875rem;
		cursor: pointer;
		transition: all 0.2s;
		border: none;
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
	}

	.button.primary {
		background: #6366f1;
		color: white;
	}

	.button.primary:hover:not(:disabled) {
		background: #4f46e5;
	}

	.button.primary:disabled {
		background: #d1d5db;
		cursor: not-allowed;
	}

	.button.secondary {
		background: white;
		color: #374151;
		border: 1px solid #d1d5db;
	}

	.button.secondary:hover {
		background: #f9fafb;
	}

	/* Error Message */
	.error-message {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 1rem;
		background: #fef2f2;
		border: 1px solid #fecaca;
		border-radius: 8px;
		color: #991b1b;
		margin-top: 1rem;
	}

	/* Processing Overlay */
	.processing-overlay {
		position: absolute;
		inset: 0;
		background: rgba(255, 255, 255, 0.9);
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 1rem;
		border-radius: 12px;
	}

	.spinner {
		width: 40px;
		height: 40px;
		border: 4px solid #e5e7eb;
		border-top-color: #6366f1;
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	/* Responsive */
	@media (max-width: 768px) {
		.participant-importer {
			padding: 1rem;
		}

		.grid-header,
		.mapping-row {
			grid-template-columns: 1fr;
			gap: 0.5rem;
		}

		.arrow {
			display: none;
		}

		.preview-table-container {
			overflow-x: auto;
		}

		.preview-table {
			font-size: 0.75rem;
		}
	}
</style>
