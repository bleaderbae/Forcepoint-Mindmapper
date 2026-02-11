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
    summary?: string;
    status?: 'current' | 'eol';
    relatedLinks?: { title: string; url: string }[];
    children?: D3Node[];
    childrenMap?: Map<string, D3Node>;
    _children?: D3Node[];
    type?: 'document' | 'legal' | 'category' | 'variant' | 'version' | 'archive' | 'platform';
    value?: number;
}

const EOL_VERSIONS = new Set(['8.3', '8.4', '8.5', '8.6', '8.7', '8.8', '8.9']);
const CURRENT_VERSIONS = new Set(['10.2', '10.3', '10.4', '7.2', '7.3']);

function getVersionStatus(name: string, prodName: string): 'current' | 'eol' {
    const version = name.replace(/\s*\(Latest\)/i, '').trim();
    if (EOL_VERSIONS.has(version)) return 'eol';
    if (CURRENT_VERSIONS.has(version)) return 'current';
    
    // Default logic: older major versions (typically < 9 for DLP/Web) are EOL
    const major = parseInt(version.split('.')[0]);
    if (!isNaN(major)) {
        if (prodName.includes('NGFW') && major < 6) return 'eol';
        if (major < 9) return 'eol';
    }
    return 'current';
}

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

    // Normalization for merging: strip "Forcepoint " if it's a child of Forcepoint or repeats parent name
    let cleanName = child.name;
    if (parent.name === "Forcepoint" && cleanName.startsWith("Forcepoint ")) {
        cleanName = cleanName.replace(/^Forcepoint\s+/, "");
    }
    if (cleanName.startsWith(parent.name + " ")) {
        cleanName = cleanName.replace(new RegExp(`^${parent.name}\\s+`, 'i'), "");
    }
    child.name = cleanName;

    const existing = parent.childrenMap!.get(child.name);
    if (existing) {
        if (child.url) existing.url = child.url;
        if (child.type && existing.type !== 'version' && existing.type !== 'archive') {
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
    console.log(`Processing ${data.length} nodes with Platform Consolidation...`);

    const root: D3Node = { name: "Forcepoint", children: [], type: 'category' };

    for (const page of data) {
        if (!page.title || !page.url) continue;

        let urlPath = '';
        try { urlPath = new URL(page.url).pathname; } catch (e) { continue; }
        const segments = urlPath.split('/').filter(s => s && !s.endsWith('.html'));
        
        // --- Step 1: Detect Platform / Product Root ---
        let productCode = segments[0] === 'docs' ? (segments[1] || 'general') : segments[0];
        if (productCode === 'Tech_Pubs' || productCode === 'shared') productCode = 'general';

        // Forcepoint ONE Platform Check
        const isOnePlatform = (page.title + ' ' + page.url).toLowerCase().includes('forcepoint one') || productCode === 'fpone';
        
        let prodName = isOnePlatform ? 'Forcepoint ONE' : (PRODUCT_CONFIG[productCode]?.name || humanize(productCode));
        if (prodName.toLowerCase() === 'docs' || prodName.toLowerCase() === 'documentation') prodName = 'Forcepoint General';

        let current = addChild(root, { name: prodName, children: [], type: isOnePlatform ? 'platform' : 'category' });

        // --- Step 2: Version Injection from URL ---
        const versionMatch = urlPath.match(/\/(\d+(\.\d+)*)\//);
        let injectedVersion = '';
        if (versionMatch && !isOnePlatform) { // For platform like ONE, versions are often date-based or inside sub-docs
            injectedVersion = versionMatch[1];
            current = addChild(current, { name: injectedVersion, children: [], type: 'version' });
        }

        // --- Step 3: Breadcrumb Pathing ---
        const crumbs = (page.breadcrumbs || []).filter((b: string) => {
            const lower = b.toLowerCase();
            return !['home', 'documentation', 'product documentation', 'sitemap', 'forcepoint', prodName.toLowerCase(), injectedVersion.toLowerCase()].includes(lower);
        });

        for (const crumb of crumbs) {
            let cleanCrumb = humanize(crumb);
            if (!cleanCrumb || cleanCrumb === current.name) continue;
            
            // Further redundancy check: if crumb is "Forcepoint ONE Firewall" and we are inside "Forcepoint ONE", rename to "Firewall"
            if (cleanCrumb.startsWith(current.name + " ")) {
                cleanCrumb = cleanCrumb.replace(new RegExp(`^${current.name}\\s+`, 'i'), "");
            }

            const nodeType = isVersionString(cleanCrumb) ? 'version' : 'category';
            current = addChild(current, { name: cleanCrumb, children: [], type: nodeType });
        }

        // --- Step 4: Add Leaf Node ---
        const pageTitle = humanize(page.title);
        const isLegal = getCategory(page.title + ' ' + page.url) === 'Legal & Third Party';
        
        const relatedLinks = (page.relatedUrls || []).map((u: string) => ({
            url: u,
            title: u.split('/').pop()?.replace('.html', '').replace(/[-_]/g, ' ') || 'Related Link'
        }));

        if (current.name !== pageTitle) {
            addChild(current, { 
                name: pageTitle, 
                url: page.url, 
                type: isLegal ? 'legal' : 'document',
                summary: page.content,
                relatedLinks
            });
        } else {
            current.url = page.url;
            current.type = isLegal ? 'legal' : 'document';
            current.summary = page.content;
            current.relatedLinks = relatedLinks;
        }
    }

    // --- Step 5: Post-Process: Prune and Label ---
    const finalizeNodes = (node: D3Node, parentProd?: string) => {
        if (!node.children || node.children.length === 0) return;

        const currentProd = node.type === 'category' || node.type === 'platform' ? node.name : parentProd;

        // 1. Prune Versions into Archives
        const versionChildren = node.children.filter(c => c.type === 'version' || isVersionString(c.name));
        if (versionChildren.length > 1) {
            versionChildren.sort((a, b) => compareVersions(b.name, a.name));
            const latest = versionChildren[0];
            const others = versionChildren.slice(1);

            const archiveNode: D3Node = { name: "Version Archives", children: others, type: 'archive', status: 'eol' };
            const nonVersions = node.children.filter(c => !versionChildren.includes(c));
            
            node.children = [...nonVersions, latest, archiveNode];
            if (!latest.name.includes("(Latest)")) {
                latest.name = `${latest.name} (Latest)`;
            }

            // Assign status
            latest.status = 'current';
            others.forEach(o => o.status = getVersionStatus(o.name, currentProd || ''));
        } else if (versionChildren.length === 1) {
            versionChildren[0].status = 'current';
        }

        // 2. Propagate status to documents
        node.children?.forEach(child => {
            if (node.status === 'eol') child.status = 'eol';
            finalizeNodes(child, currentProd);
        });
    };

    finalizeNodes(root);

    const summaries: Record<string, { summary: string; relatedLinks: any[] }> = {};
    const pruneContent = (node: D3Node) => {
        if (node.url) {
            summaries[node.url] = { 
                summary: node.summary || "", 
                relatedLinks: node.relatedLinks || [] 
            };
        }
        delete node.summary;
        delete node.relatedLinks;
        node.children?.forEach(pruneContent);
    };
    pruneContent(root);

    const outputPath = path.join(process.cwd(), 'd3-data.json');
    const summaryPath = path.join(process.cwd(), 'summaries.json');
    
    fs.writeFileSync(outputPath, JSON.stringify(root)); // Minified for production speed
    fs.writeFileSync(summaryPath, JSON.stringify(summaries));
    
    console.log(`D3 structure saved to ${outputPath}`);
    console.log(`Summaries lookup saved to ${summaryPath}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    run();
}