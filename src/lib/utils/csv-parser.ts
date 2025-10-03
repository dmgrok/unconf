/**
 * CSV/Excel Parser Utilities
 * Handles parsing and validation of participant roster files
 */

export interface ParsedColumn {
	index: number;
	header: string;
	sampleValues: string[];
	detectedType?: 'text' | 'email' | 'number' | 'category';
}

export interface ParseResult {
	columns: ParsedColumn[];
	rows: string[][];
	totalRows: number;
	hasHeaders: boolean;
}

export interface ColumnMapping {
	sourceColumn: number;
	targetField: 'name' | 'email' | 'category' | 'preference' | 'custom';
	customFieldName?: string;
}

export interface ImportOptions {
	hasHeaders: boolean;
	delimiter?: ',' | ';' | '\t';
	encoding?: string;
	skipRows?: number;
}

/**
 * Detect the delimiter used in a CSV string
 */
export function detectDelimiter(content: string): ',' | ';' | '\t' {
	const lines = content.split('\n').slice(0, 5); // Sample first 5 lines
	const delimiters = [',', ';', '\t'] as const;

	const counts = delimiters.map((delimiter) => {
		const lineCounts = lines.map((line) => (line.match(new RegExp(delimiter, 'g')) || []).length);
		const avg = lineCounts.reduce((a, b) => a + b, 0) / lineCounts.length;
		const variance =
			lineCounts.reduce((sum, count) => sum + Math.pow(count - avg, 2), 0) / lineCounts.length;
		return { delimiter, avg, variance };
	});

	// Prefer delimiter with highest average and lowest variance
	counts.sort((a, b) => b.avg - a.avg || a.variance - b.variance);
	return counts[0].delimiter;
}

/**
 * Detect column data types based on sample values
 */
export function detectColumnType(values: string[]): 'text' | 'email' | 'number' | 'category' {
	const samples = values.filter((v) => v && v.trim()).slice(0, 10);

	if (samples.length === 0) return 'text';

	// Email detection
	const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	const emailCount = samples.filter((v) => emailPattern.test(v.trim())).length;
	if (emailCount / samples.length > 0.8) return 'email';

	// Number detection
	const numberCount = samples.filter((v) => !isNaN(Number(v.trim()))).length;
	if (numberCount / samples.length > 0.8) return 'number';

	// Category detection (limited unique values)
	const uniqueValues = new Set(samples.map((v) => v.trim().toLowerCase()));
	if (uniqueValues.size <= Math.min(5, samples.length / 2)) return 'category';

	return 'text';
}

/**
 * Parse CSV/TSV content into structured data
 */
export function parseCSV(content: string, options: ImportOptions = { hasHeaders: true }): ParseResult {
	const delimiter = options.delimiter || detectDelimiter(content);
	const lines = content.split('\n').filter((line) => line.trim());

	// Skip rows if specified
	const startIndex = options.skipRows || 0;
	const dataLines = lines.slice(startIndex);

	if (dataLines.length === 0) {
		throw new Error('No data found in file');
	}

	// Parse rows
	const rows = dataLines.map((line) => parseCSVLine(line, delimiter));

	// Extract headers
	const hasHeaders = options.hasHeaders;
	const headerRow = hasHeaders ? rows[0] : rows[0].map((_, i) => `Column ${i + 1}`);
	const dataRows = hasHeaders ? rows.slice(1) : rows;

	// Build column metadata
	const columns: ParsedColumn[] = headerRow.map((header, index) => {
		const columnValues = dataRows.map((row) => row[index] || '');
		const sampleValues = columnValues.filter((v) => v.trim()).slice(0, 5);

		return {
			index,
			header: header.trim(),
			sampleValues,
			detectedType: detectColumnType(columnValues)
		};
	});

	return {
		columns,
		rows: dataRows,
		totalRows: dataRows.length,
		hasHeaders
	};
}

/**
 * Parse a single CSV line, handling quoted values
 */
function parseCSVLine(line: string, delimiter: string): string[] {
	const result: string[] = [];
	let current = '';
	let inQuotes = false;

	for (let i = 0; i < line.length; i++) {
		const char = line[i];
		const nextChar = line[i + 1];

		if (char === '"') {
			if (inQuotes && nextChar === '"') {
				// Escaped quote
				current += '"';
				i++; // Skip next quote
			} else {
				// Toggle quote state
				inQuotes = !inQuotes;
			}
		} else if (char === delimiter && !inQuotes) {
			// End of field
			result.push(current);
			current = '';
		} else {
			current += char;
		}
	}

	// Add last field
	result.push(current);

	return result.map((field) => field.trim());
}

/**
 * Parse Excel file (XLSX) - requires SheetJS library
 */
export async function parseExcel(file: File): Promise<ParseResult> {
	// Dynamic import to avoid bundling if not used
	const XLSX = await import('xlsx');

	return new Promise((resolve, reject) => {
		const reader = new FileReader();

		reader.onload = (e) => {
			try {
				const data = new Uint8Array(e.target?.result as ArrayBuffer);
				const workbook = XLSX.read(data, { type: 'array' });

				// Get first sheet
				const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
				const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as string[][];

				if (jsonData.length === 0) {
					throw new Error('No data found in Excel file');
				}

				// Extract headers and data
				const headerRow = jsonData[0];
				const dataRows = jsonData.slice(1);

				// Build column metadata
				const columns: ParsedColumn[] = headerRow.map((header, index) => {
					const columnValues = dataRows.map((row) => String(row[index] || ''));
					const sampleValues = columnValues.filter((v) => v.trim()).slice(0, 5);

					return {
						index,
						header: String(header).trim(),
						sampleValues,
						detectedType: detectColumnType(columnValues)
					};
				});

				resolve({
					columns,
					rows: dataRows.map((row) => row.map((cell) => String(cell || ''))),
					totalRows: dataRows.length,
					hasHeaders: true
				});
			} catch (error) {
				reject(error);
			}
		};

		reader.onerror = () => reject(new Error('Failed to read Excel file'));
		reader.readAsArrayBuffer(file);
	});
}

/**
 * Validate column mapping
 */
export function validateMapping(
	mappings: ColumnMapping[],
	requiredFields: ('name' | 'email')[] = ['name']
): { valid: boolean; errors: string[] } {
	const errors: string[] = [];

	// Check required fields are mapped
	for (const field of requiredFields) {
		const mapped = mappings.some((m) => m.targetField === field);
		if (!mapped) {
			errors.push(`Required field "${field}" is not mapped`);
		}
	}

	// Check for duplicate mappings
	const targetFields = mappings.map((m) =>
		m.targetField === 'custom' ? `custom:${m.customFieldName}` : m.targetField
	);
	const duplicates = targetFields.filter((field, index) => targetFields.indexOf(field) !== index);

	if (duplicates.length > 0) {
		errors.push(`Duplicate mappings found: ${duplicates.join(', ')}`);
	}

	return {
		valid: errors.length === 0,
		errors
	};
}

/**
 * Transform parsed data using column mapping
 */
export interface ParticipantImportData {
	name: string;
	email?: string;
	category?: string;
	preference?: string;
	customFields?: Record<string, string>;
}

export function applyMapping(
	rows: string[][],
	mappings: ColumnMapping[]
): ParticipantImportData[] {
	return rows.map((row) => {
		const participant: ParticipantImportData = {
			name: '',
			customFields: {}
		};

		for (const mapping of mappings) {
			const value = row[mapping.sourceColumn]?.trim() || '';

			switch (mapping.targetField) {
				case 'name':
					participant.name = value;
					break;
				case 'email':
					participant.email = value;
					break;
				case 'category':
					participant.category = value;
					break;
				case 'preference':
					participant.preference = value;
					break;
				case 'custom':
					if (mapping.customFieldName) {
						participant.customFields![mapping.customFieldName] = value;
					}
					break;
			}
		}

		return participant;
	});
}

/**
 * Validate imported participant data
 */
export function validateImportData(
	data: ParticipantImportData[]
): { valid: boolean; errors: string[]; warnings: string[] } {
	const errors: string[] = [];
	const warnings: string[] = [];

	// Check for missing names
	const missingNames = data.filter((p) => !p.name).length;
	if (missingNames > 0) {
		errors.push(`${missingNames} participant(s) missing name`);
	}

	// Check for duplicate emails
	const emails = data.map((p) => p.email).filter(Boolean) as string[];
	const duplicateEmails = emails.filter((email, index) => emails.indexOf(email) !== index);
	if (duplicateEmails.length > 0) {
		warnings.push(`Duplicate emails found: ${duplicateEmails.slice(0, 3).join(', ')}${duplicateEmails.length > 3 ? '...' : ''}`);
	}

	// Check for duplicate names
	const names = data.map((p) => p.name);
	const duplicateNames = names.filter((name, index) => names.indexOf(name) !== index);
	if (duplicateNames.length > 0) {
		warnings.push(`Duplicate names found: ${duplicateNames.slice(0, 3).join(', ')}${duplicateNames.length > 3 ? '...' : ''}`);
	}

	return {
		valid: errors.length === 0,
		errors,
		warnings
	};
}
