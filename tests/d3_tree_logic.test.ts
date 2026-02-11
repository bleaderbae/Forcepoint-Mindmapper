import { test, describe } from 'node:test';
import assert from 'node:assert';
import { findChild, addChild } from '../src/generate_d3_data.ts';
import type { D3Node } from '../src/generate_d3_data.ts';

describe('D3 Tree Logic', () => {
    test('addChild should initialize childrenMap and add child', () => {
        const parent: D3Node = { name: 'Parent', children: [] };
        const child: D3Node = { name: 'Child', children: [] };

        assert.strictEqual(parent.childrenMap, undefined);

        addChild(parent, child);

        assert.ok(parent.childrenMap instanceof Map);
        assert.strictEqual(parent.childrenMap.size, 1);
        assert.strictEqual(parent.childrenMap.get('Child'), child);
        assert.strictEqual(parent.children?.length, 1);
        assert.strictEqual(parent.children?.[0], child);
    });

    test('findChild should return undefined if map is missing', () => {
        const parent: D3Node = { name: 'Parent', children: [] };
        // Without map, findChild should return undefined (even if children array had items,
        // but our findChild assumes map usage.
        // Note: findChild implementation is: return parent.childrenMap?.get(name);

        const found = findChild(parent, 'Child');
        assert.strictEqual(found, undefined);
    });

    test('findChild should return child from map', () => {
        const parent: D3Node = { name: 'Parent', children: [] };
        const child: D3Node = { name: 'Child', children: [] };

        addChild(parent, child);

        const found = findChild(parent, 'Child');
        assert.strictEqual(found, child);
    });

    test('findChild should return undefined for non-existent child', () => {
        const parent: D3Node = { name: 'Parent', children: [] };
        const child: D3Node = { name: 'Child', children: [] };

        addChild(parent, child);

        const found = findChild(parent, 'Other');
        assert.strictEqual(found, undefined);
    });

    test('childrenMap should be non-enumerable', () => {
        const parent: D3Node = { name: 'Parent', children: [] };
        const child: D3Node = { name: 'Child', children: [] };

        addChild(parent, child);

        // JSON.stringify should not include childrenMap
        const json = JSON.stringify(parent);
        const parsed = JSON.parse(json);

        assert.strictEqual(parsed.childrenMap, undefined);
        assert.strictEqual(parsed.children.length, 1);
    });

    test('root node pattern should work', () => {
        const root: D3Node = { name: 'Root', children: [] };
        Object.defineProperty(root, 'childrenMap', {
            value: new Map<string, D3Node>(),
            enumerable: false,
            writable: true
        });

        // Before adding anything
        assert.strictEqual(findChild(root, 'Anything'), undefined);

        const child: D3Node = { name: 'Child', children: [] };
        addChild(root, child);

        assert.strictEqual(findChild(root, 'Child'), child);
    });
});
