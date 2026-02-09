import * as fs from 'fs';
import * as path from 'path';

interface D3Node {
    name: string;
    url?: string;
    children?: D3Node[];
    _children?: D3Node[];
    type?: 'document' | 'legal' | 'category';
}

// Map product codes to friendly names
const PRODUCT_MAP: Record<string, string> = {
    'dlp': 'DLP',
    'endpoint': 'Endpoint',
    'fpone': 'Forcepoint ONE',
    'fponefirewall': 'Forcepoint ONE Firewall',
    'F1E': 'F1E',
    'fpdsc': 'Data Security Cloud',
    'emailsec': 'Email Security',
    'websec': 'Web Security',
    'appliance': 'Appliances',
    'datasecurity': 'Data Security',
    'dspm': 'DSPM',
    'frbi': 'RBI',
    'docs': 'Documentation',
    'insights': 'Insights',
    'dup': 'DUP',
    'ap-data': 'AP-Data'
};

function humanize(text: string): string {
    if (!text) return '';
    // If it looks like a version (e.g., 10.4.0, v8.5), keep it mostly as is but maybe capitalize 'v'
    if (/^v?\d+(\.\d+)*$/.test(text)) return text;

    return text
        .replace(/[-_]/g, ' ')
        .replace(/\.html$/i, '')
        .replace(/([a-z])([A-Z])/g, '$1 $2') // camelCase to Space
        .replace(/\b(ack|rn|relnotes|release notes)\b/yi, 'Release Notes')
        .replace(/\b(install|installation)\b/yi, 'Installation')
        .replace(/\b(admin|administrator)\b/yi, 'Administrator')
        .replace(/\b(guide|help)\b/yi, '') // often redundant if category is clear? No, keep guide.
        .trim()
        .replace(/\s+/g, ' ')
        .split(' ')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
}

function getCategory(text: string): string {
    const t = text.toLowerCase();
    if (t.includes('install') || t.includes('deploy')) return 'Installation & Deployment';
    if (t.includes('admin') || t.includes('manage') || t.includes('config')) return 'Administration';
    if (t.includes('release') || t.includes('rn') || t.includes('relnotes')) return 'Release Notes';
    if (t.includes('troubleshoot') || t.includes('limitations') || t.includes('known issues')) return 'Troubleshooting';
    if (t.includes('legal') || t.includes('third-party') || t.includes('acknowledg')) return 'Legal & Third Party';
    return 'General';
}

function run() {
    const dataPath = path.join(process.cwd(), 'full_site_data.json');
    if (!fs.existsSync(dataPath)) {
        console.error('Data file not found!');
        return;
    }

    const data: any[] = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
    console.log(`Processing ${data.length} nodes for D3...`);

    const root: D3Node = { name: "Forcepoint Documentation", children: [], type: 'category' };

    const findChild = (parent: D3Node, name: string): D3Node | undefined => {
        return parent.children?.find(c => c.name === name);
    };

    const addChild = (parent: D3Node, child: D3Node) => {
        if (!parent.children) parent.children = [];
        parent.children.push(child);
    };

    for (const page of data) {
        if (!page.title) continue;
        if (!page.url) continue;

        let current = root;

        // --- Step 1: Extract Hierarchy from URL ---
        let urlPath = '';
        try {
            const urlObj = new URL(page.url);
            urlPath = urlObj.pathname;
        } catch (e) {
            continue;
        }

        const segments = urlPath.split('/').filter(s => s && !s.endsWith('.html'));

        // Skip first segment if empty (leading slash)
        if (segments.length > 0) {
            // Segment 0: Product
            const prodCode = segments[0] || '';
            if (!prodCode) continue;

            let prodName = PRODUCT_MAP[prodCode] || humanize(prodCode);

            // --- Special Logic for "Appliances" ---
            // "The 'appliances' node has 4 different branches but the branches support two different product types."
            // Based on URL:
            // /appliance/en-us/2.x/fsam/... -> Security Appliance Manager
            // /appliance/en-us/8.5.x/release_notes/... -> Forcepoint Appliances (V-Series)

            if (prodCode === 'appliance') {
                const versionSeg = segments.find(s => s.match(/^\d+(\.\d+|x)*$/)); // Find version segment
                if (versionSeg && versionSeg.startsWith('2.')) {
                    prodName = 'Security Appliance Manager (FSAM)';
                } else {
                    prodName = 'Forcepoint Appliances (V-Series)';
                }
            }

            let prodNode = findChild(current, prodName);
            if (!prodNode) {
                prodNode = { name: prodName, children: [], type: 'category' };
                addChild(current, prodNode);
            }
            current = prodNode;

            // Segment 1+: Version / Category
            // Heuristic: Skip locale if present
            let nextIndex = 1;
            if (segments.length > nextIndex) {
                const seg = segments[nextIndex];
                if (seg && /^[a-z]{2}-[a-z]{2}$/i.test(seg)) {
                    nextIndex++;
                }
            }

            // Identify Version or major Category
            if (segments.length > nextIndex) {
                let verSeg = segments[nextIndex];

                // If version segment looks like a version, keep it. If not, maybe it's a category.
                // But for deep linking, let's treat the next segment as a grouping node (Version).
                if (verSeg) {
                    let verName = humanize(verSeg);

                    // Specific overrides
                    if (verSeg === 'RN') verName = 'Release Notes';
                    else if (verSeg === 'howto') verName = 'How To';
                    else if (verSeg === 'dlphelp') verName = 'DLP Help';

                    let verNode = findChild(current, verName);
                    if (!verNode) {
                        verNode = { name: verName, children: [], type: 'category' };
                        addChild(current, verNode);
                    }
                    current = verNode;
                }
            }
        }

        // --- Step 2: Merge Breadcrumbs ---
        // Clean up breadcrumbs to remove redundancy with what we just built
        const crumbs = (page.breadcrumbs || []).filter((b: string) => b !== 'Home');

        // --- Determine Page Category (Legal vs Doc) ---
        const category = getCategory(page.title + ' ' + page.url);

        // If it's a legal notice, maybe group it under a "Legal" folder?
        if (category === 'Legal & Third Party') {
            let legalNode = findChild(current, 'Legal & Third Party');
            if (!legalNode) {
                legalNode = { name: 'Legal & Third Party', children: [], type: 'category' };
                addChild(current, legalNode);
            }
            current = legalNode;
        }
        // We could group Installation, etc. too, but breadcrumbs usually handle that structure.
        // Let's rely on breadcrumbs for the rest, but sanitize them.

        for (const crumb of crumbs) {
             let cleanCrumb = humanize(crumb);
             // Skip redundancy
             if (cleanCrumb === current.name) continue;
             if (cleanCrumb === root.name) continue; // "Forcepoint Documentation"

             let child = findChild(current, cleanCrumb);
             if (!child) {
                 child = { name: cleanCrumb, children: [], type: 'category' };
                 addChild(current, child);
             }
             current = child;
        }

        // --- Step 3: Add Leaf Node (The Page) ---
        const pageTitle = humanize(page.title);
        if (current.name === pageTitle) {
            current.url = page.url;
            current.type = category === 'Legal & Third Party' ? 'legal' : 'document';
        } else {
            let child = findChild(current, pageTitle);
            if (child) {
                child.url = page.url;
                child.type = category === 'Legal & Third Party' ? 'legal' : 'document';
            } else {
                child = {
                    name: pageTitle,
                    url: page.url,
                    children: [],
                    type: category === 'Legal & Third Party' ? 'legal' : 'document'
                };
                addChild(current, child);
            }
        }
    }

    const outputPath = path.join(process.cwd(), 'd3-data.json');
    fs.writeFileSync(outputPath, JSON.stringify(root, null, 2));
    console.log(`D3 data saved to ${outputPath}`);
}

run();
