import { test, describe } from 'node:test';
import assert from 'node:assert';
import { buildTree } from '../src/generate_mindmap.ts';
import type { DocNode } from '../src/generate_mindmap.ts';

describe('buildTree (generate_mindmap)', () => {
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

        assert.strictEqual(root.childrenMap?.has('Section A'), true);
        const sectionA = root.childrenMap?.get('Section A')!;
        assert.strictEqual(sectionA.title, 'Section A');
        assert.strictEqual(sectionA.childrenMap?.has('Page 1'), true);

        // Also check array
        assert.ok(root.children.find(c => c.title === 'Section A'));
    });

    test('should build nested breadcrumbs', () => {
        const data: DocNode[] = [{
            url: 'http://example.com/page2',
            title: 'Page 2',
            breadcrumbs: ['Section A', 'Subsection B']
        }];
        const root = buildTree(data);

        const sectionA = root.childrenMap?.get('Section A')!;
        assert.strictEqual(sectionA.childrenMap?.has('Subsection B'), true);

        const subB = sectionA.childrenMap?.get('Subsection B')!;
        assert.strictEqual(subB.title, 'Subsection B');
        assert.strictEqual(subB.childrenMap?.has('Page 2'), true);
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
        const sectionA = root.childrenMap?.get('Section A')!;
        assert.strictEqual(sectionA.children.length, 2);
        assert.strictEqual(sectionA.childrenMap?.has('Page 1'), true);
        assert.strictEqual(sectionA.childrenMap?.has('Page 2'), true);
    });
});
