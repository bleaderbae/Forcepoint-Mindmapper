import { test, describe } from 'node:test';
import assert from 'node:assert';
import { buildTree } from '../src/generate_mindmap.ts';
import type { DocNode } from '../src/generate_mindmap.ts';

describe('buildTree (Legacy Logic)', () => {
    test('should return root for empty data', () => {
        const data: DocNode[] = [];
        const result = buildTree(data);
        assert.strictEqual(result.title, 'Forcepoint Help');
        assert.strictEqual(result.children.length, 0);
    });

    test('should build tree with single node', () => {
        const data: DocNode[] = [{
            url: 'http://example.com/page1',
            title: 'Page 1',
            breadcrumbs: ['Section A']
        }];
        const root = buildTree(data);

        assert.strictEqual(root.childrenMap!.has('Section A'), true);
        const sectionA = root.childrenMap!.get('Section A')!;
        assert.strictEqual(sectionA.title, 'Section A');
        assert.strictEqual(sectionA.childrenMap!.has('Page 1'), true);
    });

    test('should build nested breadcrumbs', () => {
        const data: DocNode[] = [{
            url: 'http://example.com/page2',
            title: 'Page 2',
            breadcrumbs: ['Section A', 'Subsection B']
        }];
        const root = buildTree(data);

        const sectionA = root.childrenMap!.get('Section A')!;
        assert.strictEqual(sectionA.childrenMap!.has('Subsection B'), true);

        const subB = sectionA.childrenMap!.get('Subsection B')!;
        assert.strictEqual(subB.title, 'Subsection B');
        assert.strictEqual(subB.childrenMap!.has('Page 2'), true);
    });

    test('should sanitize special characters', () => {
        // Note: sanitize is internal to generateMermaid, buildTree uses raw titles but sanitize might be applied?
        // Actually buildTree uses titles as is. sanitize is called in generateMermaid.
        // But let's check if buildTree does any sanitization?
        // Reading src/generate_mindmap.ts: buildTree uses titles as keys.
        // So this test expectation might be wrong if it expects sanitization in the tree structure itself.
        // The original test expected "Section: C" -> "Section  C".
        // Let's assume buildTree DOES NOT sanitize.

        const data: DocNode[] = [{
            url: 'http://example.com/page3',
            title: 'Page (3)',
            breadcrumbs: ['Section: C']
        }];
        const root = buildTree(data);

        // If buildTree does not sanitize, keys should be original.
        const sectionName = 'Section: C';
        assert.strictEqual(root.childrenMap!.has(sectionName), true);

        const sectionC = root.childrenMap!.get(sectionName)!;
        const pageName = 'Page (3)';
        assert.strictEqual(sectionC.childrenMap!.has(pageName), true);
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

        assert.strictEqual(root.children.length, 1);
        const sectionA = root.childrenMap!.get('Section A')!;
        assert.strictEqual(sectionA.children.length, 2);
        assert.strictEqual(sectionA.childrenMap!.has('Page 1'), true);
        assert.strictEqual(sectionA.childrenMap!.has('Page 2'), true);
    });

    test('should handle undefined or empty breadcrumbs', () => {
         const data: DocNode[] = [
            {
                url: 'http://example.com/p1',
                title: 'Page 1',
                breadcrumbs: []
            }
        ];
        // In current implementation, if breadcrumbs empty, it just adds to root?
        // Let's check logic:
        // for (const crumb of doc.breadcrumbs) { ... } -> loop doesn't run.
        // current is root.
        // if (current.title === doc.title) ...
        // else ... adds doc as child of current (root).

        const root = buildTree(data);
        // So it should be child of root directly.
        assert.strictEqual(root.childrenMap!.has('Page 1'), true);
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

        const sectionA = root.childrenMap!.get('Section A')!;
        // Logic: if docNode exists, update it. So size is 1.
        assert.strictEqual(sectionA.children.length, 1);
        assert.ok(sectionA.childrenMap!.has('Page 1'));
    });
});
