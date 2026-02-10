import { test, describe } from 'node:test';
import assert from 'node:assert';
import { buildTree } from '../src/mindmap.ts';
import type { DocNode } from '../src/mindmap.ts';

describe('buildTree', () => {
    test('should return root for empty data', () => {
        const data: DocNode[] = [];
        const result = buildTree(data);
        assert.strictEqual(result.name, 'Forcepoint Help');
        assert.strictEqual(result.children.size, 0);
    });

    test('should build tree with single node', () => {
        const data: DocNode[] = [{
            url: 'http://example.com/page1',
            title: 'Page 1',
            breadcrumbs: ['Section A']
        }];
        const root = buildTree(data);

        assert.strictEqual(root.children.has('Section A'), true);
        const sectionA = root.children.get('Section A')!;
        assert.strictEqual(sectionA.name, 'Section A');
        assert.strictEqual(sectionA.children.has('Page 1'), true);
    });

    test('should build nested breadcrumbs', () => {
        const data: DocNode[] = [{
            url: 'http://example.com/page2',
            title: 'Page 2',
            breadcrumbs: ['Section A', 'Subsection B']
        }];
        const root = buildTree(data);

        const sectionA = root.children.get('Section A')!;
        assert.strictEqual(sectionA.children.has('Subsection B'), true);

        const subB = sectionA.children.get('Subsection B')!;
        assert.strictEqual(subB.name, 'Subsection B');
        assert.strictEqual(subB.children.has('Page 2'), true);
    });

    test('should sanitize special characters', () => {
        const data: DocNode[] = [{
            url: 'http://example.com/page3',
            title: 'Page (3)',
            breadcrumbs: ['Section: C']
        }];
        const root = buildTree(data);

        // "Section: C" -> "Section  C" (colon replaced by space)
        // "Page (3)" -> "Page  3 " -> trimmed "Page  3"

        const sectionName = 'Section  C';
        assert.strictEqual(root.children.has(sectionName), true, `Expected child "${sectionName}" but keys are ${Array.from(root.children.keys())}`);

        const sectionC = root.children.get(sectionName)!;
        const pageName = 'Page  3';
        assert.strictEqual(sectionC.children.has(pageName), true, `Expected child "${pageName}" but keys are ${Array.from(sectionC.children.keys())}`);
    });

    test('should deduplicate nodes', () => {
        const data: DocNode[] = [
            {
                url: 'http://example.com/p1',
                title: 'Page 1',
                breadcrumbs: ['Section A']
            },
            {
                url: 'http://example.com/p2',
                title: 'Page 2',
                breadcrumbs: ['Section A']
            }
        ];
        const root = buildTree(data);

        assert.strictEqual(root.children.size, 1);
        const sectionA = root.children.get('Section A')!;
        assert.strictEqual(sectionA.children.size, 2);
        assert.strictEqual(sectionA.children.has('Page 1'), true);
        assert.strictEqual(sectionA.children.has('Page 2'), true);
    });

    test('should use Uncategorized if breadcrumbs empty', () => {
         const data: DocNode[] = [
            {
                url: 'http://example.com/p1',
                title: 'Page 1',
                breadcrumbs: []
            }
        ];
        const root = buildTree(data);
        assert.strictEqual(root.children.has('Uncategorized'), true);
        const uncat = root.children.get('Uncategorized')!;
        assert.strictEqual(uncat.children.has('Page 1'), true);
    });

    test('should skip empty breadcrumb parts after sanitization', () => {
        const data: DocNode[] = [{
            url: 'http://example.com/p1',
            title: 'Page 1',
            breadcrumbs: ['Section A', '()', 'Section B']
        }];
        const root = buildTree(data);

        const sectionA = root.children.get('Section A');
        assert.ok(sectionA, 'Section A should exist');
        assert.strictEqual(sectionA.children.has('()'), false, 'Should not have empty part as child');

        const sectionB = sectionA.children.get('Section B');
        assert.ok(sectionB, 'Section B should be child of Section A');
        assert.ok(sectionB.children.has('Page 1'), 'Page 1 should be child of Section B');
    });

    test('should skip node if title becomes empty after sanitization', () => {
        const data: DocNode[] = [{
            url: 'http://example.com/p1',
            title: '()',
            breadcrumbs: ['Section A']
        }];
        const root = buildTree(data);

        const sectionA = root.children.get('Section A');
        assert.ok(sectionA, 'Section A should exist');
        assert.strictEqual(sectionA.children.size, 0, 'Section A should have no children');
    });

    test('should handle undefined breadcrumbs by using Uncategorized', () => {
        const data: DocNode[] = [{
            url: 'http://example.com/p1',
            title: 'Page 1',
            breadcrumbs: undefined
        }];
        const root = buildTree(data);

        assert.ok(root.children.has('Uncategorized'), 'Should use Uncategorized fallback');
        const uncat = root.children.get('Uncategorized')!;
        assert.ok(uncat.children.has('Page 1'), 'Page 1 should be in Uncategorized');
    });

    test('should deduplicate identical titles under same parent', () => {
        const data: DocNode[] = [
            {
                url: 'http://example.com/p1',
                title: 'Page 1',
                breadcrumbs: ['Section A']
            },
            {
                url: 'http://example.com/p2', // Different URL
                title: 'Page 1',           // Same Title
                breadcrumbs: ['Section A']
            }
        ];
        const root = buildTree(data);

        const sectionA = root.children.get('Section A')!;
        assert.strictEqual(sectionA.children.size, 1, 'Should have only 1 child');
        assert.ok(sectionA.children.has('Page 1'), 'Should have Page 1');
    });
});
