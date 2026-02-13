/**
 * Escapes HTML special characters to prevent XSS.
 */
export function escapeHtml(unsafe: string): string {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

/**
 * Escapes characters that have special meaning in regular expressions.
 */
export function escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Sanitizes text for use in Mermaid diagrams and other visual formats.
 * Removes special characters that might break Mermaid syntax.
 */
export function sanitize(text: unknown): string {
    if (typeof text !== 'string') return 'Untitled';
    if (!text.trim()) return 'Untitled';

    return text.replace(/[\(\)\[\]\{\}"'#;:|]/g, ' ')
               .replace(/&/g, '&amp;')
               .replace(/</g, '&lt;')
               .replace(/>/g, '&gt;')
               .replace(/[\r\n]+/g, ' ')
               .replace(/\s+/g, ' ')
               .trim();
}

/**
 * Transforms technical strings/URLs into human-readable titles.
 */
const humanizeCache = new Map<string, string>();
const MAX_CACHE_SIZE = 10000;

export function humanize(text: string): string {
    if (!text) return '';
    const cached = humanizeCache.get(text);
    if (cached !== undefined) return cached;

    if (/^v?\d+(\.\d+|x)*$/.test(text)) {
        if (humanizeCache.size >= MAX_CACHE_SIZE) humanizeCache.clear();
        humanizeCache.set(text, text);
        return text; // Versions
    }

    let result = text
        .replace(/&amp;|&lt;|&gt;/g, (m) => {
             if (m === '&amp;') return '&';
             if (m === '&lt;') return '<';
             return '>';
        })
        .replace(/[\(\)\[\]\{\}"'#;]/g, '') 
        .replace(/[-_]/g, ' ')
        .replace(/\.html$/i, '')
        .replace(/([a-z])([A-Z])/g, '$1 $2') // camelCase

        // Combined keyword replacement
        .replace(/\b(ack|rn|relnotes|release notes|install|installation|admin|administrator)\b/gi, (m) => {
            const lower = m.toLowerCase();
            if (lower === 'ack' || lower === 'rn' || lower.startsWith('rel')) return 'Release Notes';
            if (lower.startsWith('install')) return 'Installation';
            return 'Administrator';
        });

    const beforeGeneric = result;
    result = result.replace(/\b(guide|help|online help|documentation|sitemap)\b/gi, '').trim();

    if (!result) {
        result = beforeGeneric.trim();
    }

    const finalResult = result
        .replace(/\s+/g, ' ')
        .split(' ')
        .map(w => {
            if (w.length > 1 && w === w.toUpperCase()) return w;
            return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
        })
        .join(' ');

    if (humanizeCache.size >= MAX_CACHE_SIZE) humanizeCache.clear();
    humanizeCache.set(text, finalResult);
    return finalResult;
}

/**
 * Categorizes documentation based on title/content keywords.
 */
export function getCategory(text: string): string {
    const t = text.toLowerCase();
    if (t.includes('install') || t.includes('deploy')) return 'Installation & Deployment';
    if (t.includes('admin') || t.includes('manage') || t.includes('config')) return 'Administration';
    if (t.includes('release') || t.includes('rn') || t.includes('relnotes')) return 'Release Notes';
    if (t.includes('troubleshoot') || t.includes('limitations') || t.includes('known issues')) return 'Troubleshooting';
    if (t.includes('legal') || t.includes('third-party') || t.includes('acknowledg')) return 'Legal & Third Party';
    return 'General';
}
