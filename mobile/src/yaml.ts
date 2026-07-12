/** Lightweight YAML frontmatter helpers for mobile (no gray-matter dependency). */

export function parseFrontmatter(content: string): { data: Record<string, unknown>; body: string } {
	const lines = content.split('\n');
	if (lines[0]?.trim() !== '---') {
		return { data: {}, body: content };
	}

	let end = 1;
	while (end < lines.length && lines[end].trim() !== '---') end++;
	if (end >= lines.length) {
		return { data: {}, body: content };
	}

	const data: Record<string, unknown> = {};
	const yamlLines = lines.slice(1, end);

	for (let i = 0; i < yamlLines.length; i++) {
		const line = yamlLines[i];
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith('#')) continue;

		const indent = line.match(/^\s*/)?.[0].length ?? 0;

		if (trimmed.startsWith('- ')) {
			const parentKey = indent >= 2 ? findParentKey(yamlLines, i) : findLastTopLevelKey(data);
			if (parentKey) {
				const existing = data[parentKey];
				const arr = Array.isArray(existing) ? existing : [];
				arr.push(stripQuotes(trimmed.slice(2).trim()));
				data[parentKey] = arr;
			}
			continue;
		}

		const colon = trimmed.indexOf(':');
		if (colon === -1) continue;

		const key = trimmed.slice(0, colon).trim();
		let value = trimmed.slice(colon + 1).trim();

		if (indent >= 2) {
			const parentKey = findParentKey(yamlLines, i);
			if (parentKey) {
				const parent = (data[parentKey] as Record<string, unknown>) || {};
				parent[key] = value ? coerceYamlValue(stripQuotes(value)) : {};
				data[parentKey] = parent;
			}
			continue;
		}

		if (!value) {
			data[key] = {};
			continue;
		}

		if (value.startsWith('[') && value.endsWith(']')) {
			data[key] = value
				.slice(1, -1)
				.split(',')
				.map((v) => stripQuotes(v.trim()))
				.filter(Boolean);
			continue;
		}

		data[key] = coerceYamlValue(stripQuotes(value));
	}

	return { data, body: lines.slice(end + 1).join('\n') };
}

function findParentKey(yamlLines: string[], index: number): string | null {
	for (let i = index - 1; i >= 0; i--) {
		const line = yamlLines[i];
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith('-')) continue;
		const indent = line.match(/^\s*/)?.[0].length ?? 0;
		if (indent > 0) continue;
		const colon = trimmed.indexOf(':');
		if (colon === -1) continue;
		return trimmed.slice(0, colon).trim();
	}
	return null;
}

function findLastTopLevelKey(data: Record<string, unknown>): string | null {
	const keys = Object.keys(data);
	return keys.length > 0 ? keys[keys.length - 1] : null;
}

export function writeFrontmatter(data: Record<string, unknown>, body = ''): string {
	const yaml = stringifyYamlObject(data);
	const trimmedBody = body.startsWith('\n') ? body : (body ? `\n${body}` : '\n');
	return `---\n${yaml}\n---${trimmedBody}`;
}

export function updateFrontmatterField(
	content: string,
	updates: Record<string, string | number | boolean | string[]>
): string {
	const { data, body } = parseFrontmatter(content);
	return writeFrontmatter({ ...data, ...updates }, body);
}

function stringifyYamlObject(data: Record<string, unknown>, indent = ''): string {
	const lines: string[] = [];
	for (const [key, value] of Object.entries(data)) {
		if (value === undefined) continue;
		if (Array.isArray(value)) {
			if (value.length === 0) {
				lines.push(`${indent}${key}: []`);
				continue;
			}
			lines.push(`${indent}${key}:`);
			for (const item of value) {
				lines.push(`${indent}  - ${formatScalar(item)}`);
			}
			continue;
		}
		if (value && typeof value === 'object') {
			lines.push(`${indent}${key}:`);
			lines.push(stringifyYamlObject(value as Record<string, unknown>, `${indent}  `));
			continue;
		}
		lines.push(`${indent}${key}: ${formatScalar(value)}`);
	}
	return lines.join('\n');
}

function formatScalar(value: unknown): string {
	if (typeof value === 'number') return String(value);
	if (typeof value === 'boolean') return value ? 'true' : 'false';
	const str = String(value ?? '');
	if (/[:#\n]/.test(str) || str.includes('"')) return `"${str.replace(/"/g, '\\"')}"`;
	return str;
}

function stripQuotes(value: string): string {
	if (
		(value.startsWith('"') && value.endsWith('"')) ||
		(value.startsWith("'") && value.endsWith("'"))
	) {
		return value.slice(1, -1);
	}
	return value;
}

function coerceYamlValue(value: string): string | number | boolean {
	if (value === 'true') return true;
	if (value === 'false') return false;
	if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value);
	return value;
}
