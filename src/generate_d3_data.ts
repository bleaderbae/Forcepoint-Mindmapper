import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { PRODUCT_CONFIG } from './product_config.ts';
import type { ProductConfig } from './product_config.ts';

interface D3Node {
    name: string;
    url?: string;
    children?: D3Node[];
    childrenMap?: Map<string, D3Node>;
    _children?: D3Node[];
    type?: 'document' | 'legal' | 'category' | 'variant' | 'version';
}

export function humanize(text: string): string {
    if (!text) return '';
    if (/^v?\d+(\.\d+|x)*$/.test(text)) return text; // Versions

    return text
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/[\(\)\[\]\{\}"'#;]/g, '') 
        .replace(/[-_]/g, ' ')
        .replace(/\.html$/i, '')
        .replace(/([a-z])([A-Z])/g, '$1 $2') // camelCase
        .replace(/\b(ack|rn|relnotes|release notes)\b/gi, 'Release Notes')
        .replace(/\b(install|installation)\b/gi, 'Installation')
        .replace(/\b(admin|administrator)\b/gi, 'Administrator')
        .replace(/\b(guide|help|online help|documentation|sitemap)\b/gi, '')
        .trim()
        .replace(/\s+/g, ' ')
        .split(' ')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');
}

export function getCategory(text: string): string {
    const t = text.toLowerCase();
    if (t.includes('install') || t.includes('deploy')) return 'Installation & Deployment';
    if (t.includes('admin') || t.includes('manage') || t.includes('config')) return 'Administration';
    if (t.includes('release') || t.includes('rn') || t.includes('relnotes')) return 'Release Notes';
    if (t.includes('troubleshoot') || t.includes('limitations') || t.includes('known issues')) return 'Troubleshooting';
    if (t.includes('legal') || t.includes('third-party') || t.includes('acknowledg')) return 'Legal & Third Party';
    return 'General';
}

export function getVariant(prodCode: string, title: string, url: string): string | null {
    const config = PRODUCT_CONFIG[prodCode];
    if (!config) return null;

    // Check variants by regex
    if (config.variants) {
        for (const v of config.variants) {
            if (v.pattern.test(title) || v.pattern.test(url)) {
                return v.name;
            }
        }
    }

    // Special logic for Appliances based on URL version
    if (prodCode === 'appliance') {
        if (/\/2\./.test(url) || /\/2\.x\//.test(url)) return 'Security Appliance Manager (FSAM)';
        return 'Forcepoint Appliances (V-Series)';
    }

    return config.defaultVariant || 'General';
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
        if (parent.childrenMap) {
            return parent.childrenMap.get(name);
        }
        return parent.children?.find(c => c.name === name);
    };

    const addChild = (parent: D3Node, child: D3Node) => {
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

        const config = PRODUCT_CONFIG[prodCode];
        const prodName = config ? config.name : humanize(prodCode);

        let prodNode = findChild(current, prodName);
        if (!prodNode) {
            prodNode = { name: prodName, children: [], type: 'category' };
            addChild(current, prodNode);
        }
        current = prodNode;

        // --- Step 2: Determine Variant ---
        // Some products like F1E or Forcepoint ONE need splitting by sub-product/variant
        // Check if we should insert a Variant Node
        const variantName = getVariant(prodCode, page.title, page.url);

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
        let nextIndex = 1;
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
