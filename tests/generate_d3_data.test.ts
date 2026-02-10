import { test, describe } from 'node:test';
import assert from 'node:assert';
import { getCategory, humanize, getVariant } from '../src/generate_d3_data.ts';

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
        { input: 'guide', expected: '' },
        { input: 'help', expected: '' },

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
    ];

    testCases.forEach(({ input, expected }) => {
        test(`should transform "${input}" to "${expected}"`, () => {
            assert.strictEqual(humanize(input), expected);
        });
    });
});

describe('getVariant', () => {
    test('should return null for unknown product', () => {
        assert.strictEqual(getVariant('unknown', 'title', 'url'), null);
    });

    test('should identify DLP variants', () => {
        assert.strictEqual(getVariant('dlp', 'DLP Cloud', 'url'), 'Cloud');
        assert.strictEqual(getVariant('dlp', 'On-prem DLP', 'url'), 'On-prem');
    });

    test('should identify F1E variants', () => {
        assert.strictEqual(getVariant('F1E', 'Agent for macOS', 'url'), 'macOS');
        assert.strictEqual(getVariant('F1E', 'Agent for Windows', 'url'), 'Windows');
    });

    test('should handle Appliance special logic', () => {
        assert.strictEqual(getVariant('appliance', 'title', 'https://docs.forcepoint.com/appliance/2.0/index.html'), 'Security Appliance Manager (FSAM)');
        assert.strictEqual(getVariant('appliance', 'title', 'https://docs.forcepoint.com/appliance/3.0/index.html'), 'Forcepoint Appliances (V-Series)');
    });
});
