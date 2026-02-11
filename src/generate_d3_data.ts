import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { PRODUCT_CONFIG } from './product_config.ts';
import type { DocNode } from './types.ts';
import { humanize, getCategory } from './utils/string_utils.ts';
import { getVariant } from './utils/product_utils.ts';

export interface D3Node {
    name: string;
    url?: string;
    children?: D3Node[];
    childrenMap?: Map<string, D3Node>;
    _children?: D3Node[];
    type?: 'document' | 'legal' | 'category' | 'variant' | 'version';
}

export const findChild = (parent: D3Node, name: string): D3Node | undefined => {
    // Optimization: Use O(1) map lookup instead of O(N) array search
    return parent.childrenMap?.get(name);
};

export const addChild = (parent: D3Node, child: D3Node) => {
    if (!parent.children) parent.children = [];
    parent.children.push(child);

    if (!parent.childrenMap) {
        Object.defineProperty(parent, 'childrenMap', {
            value: new Map<string, D3Node>(),
            enumerable: false,
            writable: true
        });
    }
    parent.childrenMap!.set(child.name, child);
};

function run() {
    const dataPath = path.join(process.cwd(), 'full_site_data.json');
    if (!fs.existsSync(dataPath)) {
        console.error('Data file not found!');
        return;
    }

    const data: any[] = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
    console.log(`Processing ${data.length} nodes for D3...`);

    const root: D3Node = { name: "Forcepoint", children: [], type: 'category' };

    // Initialize root with childrenMap to support O(1) lookups immediately
    Object.defineProperty(root, 'childrenMap', {
        value: new Map<string, D3Node>(),
        enumerable: false,
        writable: true
    });

    for (const page of data) {
        if (!page.title || !page.url) continue;

        let current = root;

        // --- Step 1: Extract Product ---
        let urlPath = '';
        try {
            const urlObj = new URL(page.url);
            urlPath = urlObj.pathname;
        } catch (e) {
            continue;
        }

        const segments = urlPath.split('/').filter(s => s && !s.endsWith('.html'));
        if (segments.length === 0) continue;

        const prodCode = segments[0] || '';
        if (!prodCode) continue;

        let finalProdCode = prodCode;
        let nextIndex = 1;

        if (prodCode === 'docs') {
            if (segments.length > 1) {
                // Use the next segment as the product code (e.g. /docs/bjces/ -> bjces)
                finalProdCode = segments[1];
                
                // Map common sub-folders to proper products
                if (finalProdCode === 'Tech_Pubs' || finalProdCode === 'shared' || finalProdCode === 'product-docs') {
                    finalProdCode = 'general';
                } else if (finalProdCode === 'email') {
                    finalProdCode = 'emailsec';
                } else if (finalProdCode === 'web') {
                    finalProdCode = 'websec';
                }
                
                nextIndex = 2; // Skip 'docs' and the product code segment
            } else {
                // Root docs pages need keyword matching
                const combined = (page.title + ' ' + page.url).toLowerCase();
                if (combined.includes('dlp') || combined.includes('data security')) finalProdCode = 'dlp';
                else if (combined.includes('f1e')) finalProdCode = 'F1E';
                else if (combined.includes('one') || combined.includes('sse')) finalProdCode = 'fpone';
                else if (combined.includes('email')) finalProdCode = 'emailsec';
                else if (combined.includes('web')) finalProdCode = 'websec';
                else if (combined.includes('appliance')) finalProdCode = 'appliance';
                else if (combined.includes('insights')) finalProdCode = 'insights';
                else if (combined.includes('dspm')) finalProdCode = 'dspm';
                else if (combined.includes('rbi')) finalProdCode = 'frbi';
                else if (combined.includes('ngfw') || combined.includes('firewall')) finalProdCode = 'ngfw';
                else if (combined.includes('endpoint')) finalProdCode = 'endpoint';
                else finalProdCode = 'general';
                nextIndex = 1;
            }
        }

        const config = PRODUCT_CONFIG[finalProdCode];
        let prodName = config ? config.name : humanize(finalProdCode);

        // Safety: never use "Docs" or "Documentation" as a top-level product name
        if (prodName.toLowerCase() === 'docs' || prodName.toLowerCase() === 'documentation') {
            prodName = 'Forcepoint General';
        }

        let prodNode = findChild(current, prodName);
        if (!prodNode) {
            prodNode = { name: prodName, children: [], type: 'category' };
            addChild(current, prodNode);
        }
        current = prodNode;

        // --- Step 2: Determine Variant ---
        // Some products like F1E or Forcepoint ONE need splitting by sub-product/variant
        // Check if we should insert a Variant Node
        const variantName = getVariant(finalProdCode, page.title, page.url);

        if (variantName && variantName !== 'General') {
            let variantNode = findChild(current, variantName);
            if (!variantNode) {
                variantNode = { name: variantName, children: [], type: 'variant' };
                addChild(current, variantNode);
            }
            current = variantNode;
        }

        // --- Step 3: Version / Category ---
        // Heuristic: Skip locale if present
        if (segments.length > nextIndex) {
            const seg = segments[nextIndex];
            if (seg && /^[a-z]{2}-[a-z]{2}$/i.test(seg)) {
                nextIndex++; // Skip locale
            }
        }

        if (segments.length > nextIndex) {
            let verSeg = segments[nextIndex];
            if (verSeg) {
                let verName = humanize(verSeg);

                // Specific overrides
                if (verSeg === 'RN') verName = 'Release Notes';
                else if (verSeg === 'howto') verName = 'How To';
                else if (verSeg === 'dlphelp') verName = 'DLP Help';
                else if (verSeg === 'fsmhelp') verName = 'FSM Help';
                else if (verSeg === 'deployctr') verName = 'Deployment Center';
                else if (verSeg === 'onlinehelp') verName = 'Online Help';

                // Check if this version node matches the Variant name (redundancy check)
                if (verName !== current.name) {
                    let verNode = findChild(current, verName);
                    if (!verNode) {
                        verNode = { name: verName, children: [], type: 'version' };
                        addChild(current, verNode);
                    }
                    current = verNode;
                }
            }
        }

        // --- Step 4: Category (Legal vs Doc) ---
        const category = getCategory(page.title + ' ' + page.url);
        if (category === 'Legal & Third Party') {
            let legalNode = findChild(current, 'Legal & Third Party');
            if (!legalNode) {
                legalNode = { name: 'Legal & Third Party', children: [], type: 'category' };
                addChild(current, legalNode);
            }
            current = legalNode;
        }

        // --- Step 5: Merge Breadcrumbs ---
        const crumbs = (page.breadcrumbs || []).filter((b: string) => {
            const lower = b.toLowerCase();
            return lower !== 'home' && 
                   lower !== 'documentation' && 
                   lower !== 'product documentation' &&
                   lower !== 'sitemap';
        });

        for (const crumb of crumbs) {
             let cleanCrumb = humanize(crumb);
             if (!cleanCrumb) continue;

             // Skip redundancy with ancestors
             if (cleanCrumb === current.name || 
                 cleanCrumb === prodName || 
                 (variantName && cleanCrumb === variantName)) {
                 continue;
             }

             let child = findChild(current, cleanCrumb);
             if (!child) {
                 child = { name: cleanCrumb, children: [], type: 'category' };
                 addChild(current, child);
             }
             current = child;
        }

        // --- Step 6: Add Leaf Node ---
        const pageTitle = humanize(page.title);
        const type = category === 'Legal & Third Party' ? 'legal' : 'document';

        if (current.name === pageTitle) {
            current.url = page.url;
            current.type = type;
        } else {
            let child = findChild(current, pageTitle);
            if (child) {
                child.url = page.url;
                child.type = type;
            } else {
                child = { name: pageTitle, url: page.url, children: [], type };
                addChild(current, child);
            }
        }
    }

    const outputPath = path.join(process.cwd(), 'd3-data.json');
    fs.writeFileSync(outputPath, JSON.stringify(root, null, 2));
    console.log(`D3 data saved to ${outputPath}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    run();
}
