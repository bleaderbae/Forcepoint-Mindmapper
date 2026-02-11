import { test, describe } from 'node:test';
import assert from 'node:assert';
import { sanitize, escapeHtml } from '../src/utils/string_utils.ts';

describe('escapeHtml', () => {
    test('should escape HTML special characters', () => {
        assert.strictEqual(escapeHtml('<script>'), '&lt;script&gt;');
        assert.strictEqual(escapeHtml('A & B'), 'A &amp; B');
        assert.strictEqual(escapeHtml('"quoted"'), '&quot;quoted&quot;');
        assert.strictEqual(escapeHtml("'single'"), '&#039;single&#039;');
    });

    test('should return original string if no special characters', () => {
        assert.strictEqual(escapeHtml('Hello World'), 'Hello World');
    });

    test('should handle mixed content', () => {
        assert.strictEqual(escapeHtml('User <script> & "Other"'), 'User &lt;script&gt; &amp; &quot;Other&quot;');
    });
});

describe('sanitize', () => {
    test('should return "Untitled" for empty or null input', () => {
        assert.strictEqual(sanitize(''), 'Untitled');
        assert.strictEqual(sanitize(null), 'Untitled');
        assert.strictEqual(sanitize(undefined), 'Untitled');
    });

    test('should return "Untitled" for non-string input', () => {
        assert.strictEqual(sanitize(123), 'Untitled');
        assert.strictEqual(sanitize({}), 'Untitled');
    });

    test('should replace special characters with spaces', () => {
        assert.strictEqual(sanitize('Hello [World]'), 'Hello World');
        assert.strictEqual(sanitize('Key: Value'), 'Key Value');
        assert.strictEqual(sanitize('Func(args)'), 'Func args');
        assert.strictEqual(sanitize('A | B'), 'A B');
        assert.strictEqual(sanitize('"Quoted"'), 'Quoted');
    });

    test('should replace newlines with spaces', () => {
        assert.strictEqual(sanitize('Line1\nLine2'), 'Line1 Line2');
        assert.strictEqual(sanitize('Line1\r\nLine2'), 'Line1 Line2');
    });

    test('should collapse multiple spaces into one', () => {
        assert.strictEqual(sanitize('A    B'), 'A B');
        assert.strictEqual(sanitize('   Start'), 'Start');
        assert.strictEqual(sanitize('End   '), 'End');
    });

    test('should handle combination of all cases', () => {
        const input = '  Title: [Draft]\n(v1.0)  ';
        // Steps logic:
        // 1. [ ] ( ) : become spaces -> "  Title   Draft \n v1.0   "
        // 2. \n becomes space -> "  Title   Draft   v1.0   "
        // 3. multiple spaces -> " Title Draft v1.0 "
        // 4. trim -> "Title Draft v1.0"
        assert.strictEqual(sanitize(input), 'Title Draft v1.0');
    });

    test('should escape HTML entities', () => {
        assert.strictEqual(sanitize('A & B'), 'A &amp; B');
        assert.strictEqual(sanitize('A < B'), 'A &lt; B');
        assert.strictEqual(sanitize('A > B'), 'A &gt; B');
        assert.strictEqual(sanitize('A & B < C > D'), 'A &amp; B &lt; C &gt; D');
    });
});
