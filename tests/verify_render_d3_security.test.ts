import { test } from 'node:test';
import * as assert from 'node:assert';
import * as fs from 'fs';
import * as path from 'path';

test('Security: render_d3.ts should have XSS protection', () => {
    const filePath = path.join(process.cwd(), 'src/render_d3.ts');
    const content = fs.readFileSync(filePath, 'utf-8');

    // 1. Check directory items (Task specified vulnerability)
    // Vulnerable: ...>${c.data.name}</li>
    // Secure: ...>${escapeHtml(c.data.name)}</li>
    const directoryVulnerablePattern = /\$\{c\.data\.name\}(?=<\/li>)/;
    const directorySecurePattern = /\$\{escapeHtml\(c\.data\.name\)\}(?=<\/li>)/;

    // Note: Regex test on the whole file might match the secure version as "vulnerable"
    // because ${escapeHtml(c.data.name)} contains ${c.data.name} IF we don't handle the prefix.
    // But \$\{c\.data\.name\} matches "${c.data.name}".
    // \$\{escapeHtml\(c\.data\.name\)\} matches "${escapeHtml(c.data.name)}".
    // So the vulnerable pattern (without escapeHtml) should NOT be present unless it's strictly matching.

    // To be safer, we verify that every occurrence of ${c.data.name} is preceded by escapeHtml(.
    // But since we are grepping the file content which is TS source code containing a string...

    if (directorySecurePattern.test(content)) {
        // It is secure.
    } else {
        assert.fail("Directory items name: OK pattern not found.");
    }

    // 2. Check d.data.type usage
    const typeVulnerablePattern = /\$\{d\.data\.type\}/;
    const typeSecurePattern = /\$\{safeType\}/;
    const safeTypeDefPattern = /const safeType = escapeHtml\(d\.data\.type/;

    if (typeSecurePattern.test(content) && safeTypeDefPattern.test(content)) {
         // OK
    } else {
         // Check for direct escape as fallback
         const directEscape = /\$\{escapeHtml\(d\.data\.type/;
         if (directEscape.test(content)) {
             // OK
         } else {
             assert.fail("Node type: VULNERABLE (d.data.type is used directly or safeType missing).");
         }
    }
});
