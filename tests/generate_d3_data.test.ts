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
    test('should handle empty strings', () => {
        assert.strictEqual(humanize(''), '');
    });

    test('should handle versions', () => {
        assert.strictEqual(humanize('v1.0'), 'v1.0');
        assert.strictEqual(humanize('8.9.x'), '8.9.x');
    });

    test('should clean hyphens and underscores', () => {
        assert.strictEqual(humanize('hello-world_test'), 'Hello World Test');
    });

    test('should handle camelCase', () => {
        assert.strictEqual(humanize('mySmallApp'), 'My Small App');
    });

    test('should replace specific keywords', () => {
        assert.strictEqual(humanize('install_guide'), 'Installation');
        assert.strictEqual(humanize('relnotes_v1'), 'Release Notes V1');
    });

    test('should remove guide/help', () => {
        // "administration_guide" -> "Administration Guide" -> "Administrator " -> "Administrator"
        // Wait, "guide" is replaced by "" then trimmed.
        // humanize replaces "admin" with "Administrator"
        assert.strictEqual(humanize('administration_guide'), 'Administration');
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
