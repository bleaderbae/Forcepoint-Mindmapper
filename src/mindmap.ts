import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

export interface DocNode {
    url: string;
    title: string;
    breadcrumbs?: string[];
}

export interface TreeNode {
    name: string;
    children: Map<string, TreeNode>;
}

export function buildTree(data: DocNode[]): TreeNode {
    const root: TreeNode = { name: 'Forcepoint Help', children: new Map() };

    for (const page of data) {
        let current = root;
        // Use breadcrumbs if available
        const pathParts = page.breadcrumbs && page.breadcrumbs.length > 0 
            ? page.breadcrumbs 
            : ['Uncategorized'];

        for (const part of pathParts) {
            // sanitize part for mermaid (remove parens etc)
            const cleanPart = part.replace(/[:()\[\]]/g, ' ').trim();
            if (!cleanPart) continue;

            if (!current.children.has(cleanPart)) {
                current.children.set(cleanPart, { name: cleanPart, children: new Map() });
            }
            current = current.children.get(cleanPart)!;
        }
        
        // Add the actual page as a leaf
        const cleanTitle = page.title.replace(/[:()\[\]]/g, ' ').trim();
        if (cleanTitle && !current.children.has(cleanTitle)) {
             current.children.set(cleanTitle, { name: cleanTitle, children: new Map() });
        }
    }
    return root;
}

export function generateMermaid(node: TreeNode, depth: number = 0): string {
    const indent = '  '.repeat(depth);
    let result = `${indent}${node.name}\n`;
    
    const sortedKeys = Array.from(node.children.keys()).sort();
    for (const key of sortedKeys) {
        result += generateMermaid(node.children.get(key)!, depth + 1);
    }
    return result;
}

function run() {
    const dataPath = path.join(process.cwd(), 'full_site_data.json');
    if (!fs.existsSync(dataPath)) {
        console.error('Data file not found. Run the crawler first.');
        return;
    }

    const rawData: DocNode[] = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
    console.log(`Loaded ${rawData.length} pages.`);

    const root = buildTree(rawData);
    
    const mermaidContent = 'mindmap\n' + generateMermaid(root);
    fs.writeFileSync(path.join(process.cwd(), 'mindmap.mmd'), mermaidContent);
    console.log('Mermaid mindmap saved to mindmap.mmd');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    run();
}
