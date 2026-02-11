import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { PRODUCT_CONFIG } from './product_config.ts';
import { humanize, getCategory } from './utils/string_utils.ts';

export interface D3Node {
    name: string;
    url?: string;
    children?: D3Node[];
    childrenMap?: Map<string, D3Node>;
    _children?: D3Node[];
    type?: 'document' | 'legal' | 'category' | 'variant' | 'version' | 'archive' | 'platform';
    value?: number;
    id?: number;
}

// Comprehensive Mapping for Product Families
const PRODUCT_FAMILY_MAP: Record<string, string> = {
    'dlp': 'DLP',
    'fpone': 'ONE',
    'fponefirewall': 'ONE',
    'fponemobile': 'ONE',
    'fponesse': 'ONE',
    'frbi': 'ONE',
    'getvisibility': 'ONE',
    'fpdsc': 'ONE', // Data Security Cloud is part of the ONE SSE platform
    'emailsec': 'Email Security',
    'websec': 'Web Security',
    'f1e': 'F1E',
    'appliance': 'Appliances',
    'ngfw': 'NGFW',
    'dspm': 'DSPM',
    'insights': 'Insights',
    'dup': 'DUP',
    'datasecurity': 'Data Security'
};

export const findChild = (parent: D3Node, name: string): D3Node | undefined => {
    return parent.childrenMap?.get(name);
};

export const addChild = (parent: D3Node, child: D3Node) => {
    if (!parent.children) parent.children = [];
    if (!parent.childrenMap) {
        Object.defineProperty(parent, 'childrenMap', {
            value: new Map<string, D3Node>(),
            enumerable: false,
            writable: true
        });
    }

    // Normalization: Strip brand name and parent name to keep canvas clean
    let cleanName = child.name.replace(/^Forcepoint\s+/i, "").trim();
    if (parent.name !== "Forcepoint" && cleanName.startsWith(parent.name + " ")) {
        cleanName = cleanName.replace(new RegExp(`^${parent.name}\\s+`, 'i'), "").trim();
    }
    child.name = cleanName || child.name;

    const existing = parent.childrenMap!.get(child.name);
    if (existing) {
        if (child.url) existing.url = child.url;
        if (child.type && !['version', 'archive'].includes(existing.type || '')) {
            existing.type = child.type;
        }
        return existing;
    }

    parent.children.push(child);
    parent.childrenMap!.set(child.name, child);
    return child;
};

function isVersionString(name: string): boolean {
    const clean = name.replace(/^v/i, '');
    return /^\d+(\.\d+)*$/.test(clean) || /^\d+\.x$/i.test(clean) || /^\d{6}$/.test(clean);
}

function compareVersions(a: string, b: string): number {
    const va = a.replace(/^v/i, '').split('.').map(Number);
    const vb = b.replace(/^v/i, '').split('.').map(Number);
    for (let i = 0; i < Math.max(va.length, vb.length); i++) {
        const numA = va[i] || 0;
        const numB = vb[i] || 0;
        if (numA > numB) return 1;
        if (numA < numB) return -1;
    }
    return 0;
}

function run() {
    const dataPath = path.join(process.cwd(), 'full_site_data.json');
    if (!fs.existsSync(dataPath)) {
        console.error('Data file not found!');
        return;
    }

    const data: any[] = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
    console.log(`Processing ${data.length} nodes with Alpha-Sorting and Platform Consolidation...`);

    const root: D3Node = { name: "Forcepoint", children: [], type: 'category' };

    for (const page of data) {
        if (!page.title || !page.url) continue;

        let urlPath = '';
        try { urlPath = new URL(page.url).pathname; } catch (e) { continue; }
        const segments = urlPath.split('/').filter(s => s && !s.endsWith('.html'));
        if (segments.length === 0) continue;

        // --- Step 1: Detect Family ---
        let productCode = segments[0].toLowerCase();
        if (productCode === 'docs') {
            productCode = (segments[1] || 'general').toLowerCase();
        }
        if (['tech_pubs', 'shared', 'product-docs'].includes(productCode)) productCode = 'general';

        const familyName = PRODUCT_FAMILY_MAP[productCode] || humanize(productCode);
        const type = familyName === 'ONE' ? 'platform' : 'category';

        let current = addChild(root, { name: familyName, children: [], type });

        // --- Step 2: Version Extraction ---
        const versionMatch = urlPath.match(/\/(\d+(\.\d+)*)\//);
        let injectedVersion = '';
        if (versionMatch) {
            injectedVersion = versionMatch[1];
            current = addChild(current, { name: injectedVersion, children: [], type: 'version' });
        }

        // --- Step 3: Breadcrumb Pathing ---
        const crumbs = (page.breadcrumbs || []).filter((b: string) => {
            const lower = b.toLowerCase();
            return !['home', 'documentation', 'product documentation', 'sitemap', 'forcepoint', familyName.toLowerCase(), injectedVersion.toLowerCase(), 'general'].includes(lower);
        });

        for (const crumb of crumbs) {
            const cleanCrumb = humanize(crumb);
            if (!cleanCrumb || cleanCrumb === current.name) continue;
            current = addChild(current, { name: cleanCrumb, children: [], type: isVersionString(cleanCrumb) ? 'version' : 'category' });
        }

        // --- Step 4: Add Leaf Node ---
        const pageTitle = humanize(page.title);
        const isLegal = getCategory(page.title + ' ' + page.url) === 'Legal & Third Party';
        
        if (current.name !== pageTitle) {
            addChild(current, { name: pageTitle, url: page.url, type: isLegal ? 'legal' : 'document' });
        } else {
            current.url = page.url;
            current.type = isLegal ? 'legal' : 'document';
        }
    }

    // --- Step 5: Post-Processing (Final Sorting & Pruning) ---
    const finalizeNodes = (node: D3Node) => {
        if (!node.children || node.children.length === 0) return;

        // Priority sort: Categories/Platforms first, then alphabetical
        node.children.sort((a, b) => {
            // Put 'ONE' at the very top if it exists
            if (a.name === 'ONE') return -1;
            if (b.name === 'ONE') return 1;
            
            // Standard alpha sort
            return a.name.localeCompare(b.name);
        });

        // Prune Versions (Avoid nesting archives)
        if (node.type !== 'archive') {
            const versionChildren = node.children.filter(c => c.type === 'version' || isVersionString(c.name));
            if (versionChildren.length > 1) {
                versionChildren.sort((a, b) => compareVersions(b.name, a.name));
                const latest = versionChildren[0];
                const others = versionChildren.slice(1);

                const archiveNode: D3Node = { name: "Version Archives", children: others, type: 'archive' };
                const nonVersions = node.children.filter(c => !versionChildren.includes(c));
                
                node.children = [...nonVersions, latest, archiveNode];
                if (!latest.name.includes("(Latest)")) latest.name = `${latest.name} (Latest)`;
            }
        }

        node.children?.forEach(finalizeNodes);
    };

    finalizeNodes(root);

    const outputPath = path.join(process.cwd(), 'd3-data.json');
    fs.writeFileSync(outputPath, JSON.stringify(root, null, 2));
    console.log(`D3 data saved with Alpha-Sorting to ${outputPath}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    run();
}