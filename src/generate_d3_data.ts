import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { PRODUCT_CONFIG } from './product_config.ts';
import { humanize, getCategory } from './utils/string_utils.ts';

export interface D3Node {
    name: string;
    url?: string;
    summary?: string;
    children?: D3Node[];
    childrenMap?: Map<string, D3Node>;
    _children?: D3Node[];
    type?: 'document' | 'legal' | 'category' | 'variant' | 'version' | 'archive' | 'platform';
    value?: number;
    id?: number;
}

const PRODUCT_FAMILY_MAP: Record<string, string> = {
    'dlp': 'DLP',
    'fpone': 'ONE',
    'fponefirewall': 'ONE',
    'fponemobile': 'ONE',
    'fponesse': 'ONE',
    'frbi': 'ONE',
    'getvisibility': 'ONE',
    'fpdsc': 'ONE',
    'emailsec': 'Email Security',
    'websec': 'Web Security',
    'f1e': 'F1E',
    'appliance': 'Appliances',
    'ngfw': 'NGFW',
    'dspm': 'DSPM',
    'insights': 'Insights',
    'dup': 'DUP',
    'datasecurity': 'Data Security',
    'bjces': 'Boldon James',
    'boldon james': 'Boldon James'
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

    let cleanName = child.name.replace(/^Forcepoint\s+/i, "").replace(/^[|>: ]+/, "").trim();
    if (parent.name !== "Forcepoint") {
        const pLow = parent.name.toLowerCase();
        if (cleanName.toLowerCase().startsWith(pLow)) {
            const next = cleanName.substring(pLow.length).replace(/^[|>: ]+/, "").trim();
            if (next && next.length > 2) cleanName = next;
        }
    }
    child.name = cleanName || child.name;

    const existing = parent.childrenMap!.get(child.name);
    if (existing) {
        if (child.url) existing.url = child.url;
        if (child.summary && !existing.summary) existing.summary = child.summary;
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

function cleanSummary(content: string, title: string): string {
    if (!content) return "";
    let clean = content.trim();
    const cleanTitle = title.trim();
    if (clean.startsWith(cleanTitle)) clean = clean.substring(cleanTitle.length).trim();
    return clean.substring(0, 450).trim() + (clean.length > 450 ? "..." : "");
}

function run() {
    const dataPath = path.join(process.cwd(), 'full_site_data.json');
    if (!fs.existsSync(dataPath)) return;

    const data: any[] = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
    console.log(`Processing ${data.length} nodes with Delimiter-First Breadcrumb Integrity...`);

    const root: D3Node = { name: "Forcepoint", children: [], type: 'category' };

    for (const page of data) {
        if (!page.title || !page.url) continue;

        let urlPath = '';
        try { urlPath = new URL(page.url).pathname; } catch (e) { continue; }
        const segments = urlPath.split('/').filter(s => s && !s.endsWith('.html'));
        let productCode = segments[0] === 'docs' ? (segments[1] || 'general') : segments[0];
        let familyName = PRODUCT_FAMILY_MAP[productCode.toLowerCase()] || humanize(productCode);

        // --- Step 1: Intelligent Platform Routing ---
        const fullIdentity = (page.title + ' ' + page.url).toLowerCase();
        let pathStack: string[] = [];

        if (fullIdentity.includes('sse') || fullIdentity.includes('swg') || fullIdentity.includes('casb') || fullIdentity.includes('data security cloud')) {
            pathStack.push('ONE');
            if (fullIdentity.includes('swg')) pathStack.push('SWG');
            else if (fullIdentity.includes('casb')) pathStack.push('CASB');
            else if (fullIdentity.includes('firewall')) pathStack.push('Firewall');
        } else {
            pathStack.push(familyName);
        }

        // --- Step 2: Version and Breadcrumbs ---
        const versionMatch = urlPath.match(/\/(\d+(\.\d+)*)\//);
        if (versionMatch) pathStack.push(versionMatch[1]);

        let rawCrumbs = page.breadcrumbs || [];
        if (rawCrumbs.length === 0) rawCrumbs = page.title.split(/[|>]/).map((s: string) => s.trim());

        const filteredCrumbs = rawCrumbs.filter((c: string) => {
            const low = c.toLowerCase();
            return !['home', 'documentation', 'product documentation', 'sitemap', 'forcepoint', familyName.toLowerCase(), 'general'].includes(low);
        });
        pathStack = [...pathStack, ...filteredCrumbs];

        // --- Step 3: Build Tree ---
        let current = root;
        for (let i = 0; i < pathStack.length; i++) {
            const name = humanize(pathStack[i]);
            if (!name || name === current.name) continue;
            const nodeType = name === 'ONE' ? 'platform' : (isVersionString(name) ? 'version' : 'category');
            current = addChild(current, { name, children: [], type: nodeType });
        }

        // --- Step 4: Final Leaf with Summary ---
        const finalTitle = humanize(page.title);
        const summary = cleanSummary(page.content, page.title);
        const isLegal = getCategory(page.title + ' ' + page.url) === 'Legal & Third Party';
        
        if (current.name !== finalTitle) {
            addChild(current, { name: finalTitle, url: page.url, summary, type: isLegal ? 'legal' : 'document' });
        } else {
            current.url = page.url;
            current.summary = summary;
            current.type = isLegal ? 'legal' : 'document';
        }
    }

    const finalizeNodes = (node: D3Node) => {
        if (!node.children || node.children.length === 0) return;
        
        // Consistent Sorting: Platforms first, then Alphabetical
        node.children.sort((a, b) => {
            if (a.name === 'ONE') return -1;
            if (b.name === 'ONE') return 1;
            return a.name.localeCompare(b.name);
        });

        const versionChildren = node.children.filter(c => c.type === 'version' || isVersionString(c.name));
        if (versionChildren.length > 1 && node.type !== 'archive') {
            versionChildren.sort((a, b) => compareVersions(b.name, a.name));
            const archiveNode: D3Node = { name: "Version Archives", children: versionChildren.slice(1), type: 'archive' };
            const nonVersions = node.children.filter(c => !versionChildren.includes(c));
            node.children = [...nonVersions, versionChildren[0], archiveNode];
            if (!versionChildren[0].name.includes("(Latest)")) versionChildren[0].name = `${versionChildren[0].name} (Latest)`;
        }
        node.children?.forEach(finalizeNodes);
    };

    finalizeNodes(root);
    fs.writeFileSync(path.join(process.cwd(), 'd3-data.json'), JSON.stringify(root, null, 2));
}

run();