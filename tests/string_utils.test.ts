import { test, describe } from 'node:test';
import assert from 'node:assert';
import { sanitize, escapeHtml, getCategory, humanize, escapeRegExp } from '../src/utils/string_utils.ts';

describe('escapeRegExp', () => {
    test('should escape special regex characters', () => {
        assert.strictEqual(escapeRegExp('abc'), 'abc');
        assert.strictEqual(escapeRegExp('.*+?^${}()|[]\\'), '\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\');
    });

    test('should handle strings with mixed characters', () => {
        assert.strictEqual(escapeRegExp('foo[bar]'), 'foo\\[bar\\]');
    });
});

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

describe('getCategory', () => {
    test('should categorize installation & deployment', () => {
        assert.strictEqual(getCategory('how to install'), 'Installation & Deployment');
        assert.strictEqual(getCategory('deploying the agent'), 'Installation & Deployment');
    });

    test('should categorize administration', () => {
        assert.strictEqual(getCategory('admin guide'), 'Administration');
        assert.strictEqual(getCategory('manage users'), 'Administration');
        assert.strictEqual(getCategory('configuration'), 'Administration');
    });

    test('should categorize release notes', () => {
        assert.strictEqual(getCategory('release notes'), 'Release Notes');
        assert.strictEqual(getCategory('RN for version 1.0'), 'Release Notes');
        assert.strictEqual(getCategory('relnotes'), 'Release Notes');
    });

    test('should categorize troubleshooting', () => {
        assert.strictEqual(getCategory('troubleshoot connection'), 'Troubleshooting');
        assert.strictEqual(getCategory('known issues'), 'Troubleshooting');
        assert.strictEqual(getCategory('limitations'), 'Troubleshooting');
    });

    test('should categorize legal', () => {
        assert.strictEqual(getCategory('legal notice'), 'Legal & Third Party');
        assert.strictEqual(getCategory('third-party software'), 'Legal & Third Party');
        assert.strictEqual(getCategory('acknowledgements'), 'Legal & Third Party');
    });

    test('should fallback to General', () => {
        assert.strictEqual(getCategory('getting started'), 'General');
        assert.strictEqual(getCategory(''), 'General');
    });
});

describe('humanize', () => {
    const testCases = [
        // Basic Transformations
        { input: '', expected: '' },
        { input: 'hello-world', expected: 'Hello World' },
        { input: 'hello_world', expected: 'Hello World' },
        { input: 'test.html', expected: 'Test' },
        { input: 'camelCase', expected: 'Camel Case' },
        { input: 'PascalCase', expected: 'Pascal Case' },
        { input: 'UPPERCASE', expected: 'UPPERCASE' },
        { input: 'MixedCASE', expected: 'Mixed CASE' },

        // Versions (Preserved)
        { input: 'v1.0', expected: 'v1.0' },
        { input: '8.9.x', expected: '8.9.x' },
        { input: '2023', expected: '2023' },

        // Keyword Replacements
        { input: 'admin', expected: 'Administrator' },
        { input: 'administrator', expected: 'Administrator' },
        { input: 'install', expected: 'Installation' },
        { input: 'installation', expected: 'Installation' },
        { input: 'rn', expected: 'Release Notes' },
        { input: 'ack', expected: 'Release Notes' },
        { input: 'relnotes', expected: 'Release Notes' },
        { input: 'guide', expected: 'Guide' },
        { input: 'help', expected: 'Help' },

        // Complex Combinations
        { input: 'admin-guide', expected: 'Administrator' },
        { input: 'install_guide.html', expected: 'Installation' },
        { input: 'rn-v1.0', expected: 'Release Notes V1.0' },
        { input: 'my_admin_guide', expected: 'My Administrator' },
        { input: 'deployment_guide', expected: 'Deployment' },
        { input: '  extra   spaces  ', expected: 'Extra Spaces' },
        { input: 'administration_guide', expected: 'Administration' }, // Preserving old test case logic
        { input: 'hello-world_test', expected: 'Hello World Test' }, // Preserving old test case logic

        // New Coverage
        { input: 'hello--world', expected: 'Hello World' }, // Consecutive separators
        { input: '-hello-', expected: 'Hello' }, // Leading/trailing separators
        { input: 'admin.html', expected: 'Administrator' }, // Keyword + HTML extension
        { input: 'user_guide', expected: 'User' }, // Keyword removal 'guide'
        { input: 'help_center', expected: 'Center' }, // Keyword removal 'help'
        { input: 'httpClient', expected: 'Http Client' }, // CamelCase splitting
        { input: 'v1.2.3.4', expected: 'v1.2.3.4' }, // Complex version pattern
        { input: 'test.doc', expected: 'Test.doc' }, // Non-HTML extension preservation
        { input: 'forcepoint-one', expected: 'Forcepoint One' },
        { input: 'Forcepoint ONE', expected: 'Forcepoint ONE' }, // Uppercase word preservation
    ];

    testCases.forEach(({ input, expected }) => {
        test(`should transform "${input}" to "${expected}"`, () => {
            assert.strictEqual(humanize(input), expected);
        });
    });
});
