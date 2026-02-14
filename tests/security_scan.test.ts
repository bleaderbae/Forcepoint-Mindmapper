import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';

test('Security Scan: Check for unsafe d.data.type interpolation in src/render_d3.ts', () => {
    const filePath = path.join(process.cwd(), 'src/render_d3.ts');
    const content = fs.readFileSync(filePath, 'utf-8');

    // Check if d.data.type is interpolated directly, which is unsafe for HTML injection
    // We expect it to be sanitized first (e.g. const safeType = escapeHtml(d.data.type))
    const unsafePattern = /\$\{d\.data\.type\}/;

    if (unsafePattern.test(content)) {
        // Find line number for better error message
        const lines = content.split('\n');
        lines.forEach((line, index) => {
            if (unsafePattern.test(line)) {
                console.error(`Unsafe usage found at line ${index + 1}: ${line.trim()}`);
            }
        });
        assert.fail('Found unsafe interpolation of d.data.type. It should be sanitized before use.');
    }
});
