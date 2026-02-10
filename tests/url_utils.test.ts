import { describe, test } from 'node:test';
import assert from 'node:assert';
import { normalizeUrl } from '../src/url_utils.ts';

describe('normalizeUrl', () => {
    test('should normalize a standard URL', () => {
        const input = 'https://example.com/page';
        const expected = 'https://example.com/page';
        assert.strictEqual(normalizeUrl(input), expected);
    });

    test('should remove query parameters', () => {
        const input = 'https://example.com/page?query=param';
        const expected = 'https://example.com/page';
        assert.strictEqual(normalizeUrl(input), expected);
    });

    test('should remove hash fragment', () => {
        const input = 'https://example.com/page#section';
        const expected = 'https://example.com/page';
        assert.strictEqual(normalizeUrl(input), expected);
    });

    test('should remove both query parameters and hash fragment', () => {
        const input = 'https://example.com/page?query=param#section';
        const expected = 'https://example.com/page';
        assert.strictEqual(normalizeUrl(input), expected);
    });

    test('should return original string for invalid URL', () => {
        const input = 'invalid-url';
        assert.strictEqual(normalizeUrl(input), input);
    });

    test('should handle trailing slash', () => {
         const input = 'https://example.com/page/';
         const expected = 'https://example.com/page/';
         assert.strictEqual(normalizeUrl(input), expected);
    });
});
