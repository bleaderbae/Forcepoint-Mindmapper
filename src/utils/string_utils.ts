/**
 * Sanitizes text for use in Mermaid diagrams and other visual formats.
 * Removes special characters that might break Mermaid syntax.
 */
export function sanitize(text: any): string {
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
export function humanize(text: string): string {
    if (!text) return '';
    if (/^v?\d+(\.\d+|x)*$/.test(text)) return text; // Versions

    let result = text
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/[\(\)\[\]\{\}"'#;]/g, '') 
        .replace(/[-_]/g, ' ')
        .replace(/\.html$/i, '')
        .replace(/([a-z])([A-Z])/g, '$1 $2') // camelCase
        .replace(/\b(ack|rn|relnotes|release notes)\b/gi, 'Release Notes')
        .replace(/\b(install|installation)\b/gi, 'Installation')
        .replace(/\b(admin|administrator)\b/gi, 'Administrator');

    const beforeGeneric = result;
    result = result.replace(/\b(guide|help|online help|documentation|sitemap)\b/gi, '').trim();

    if (!result) {
        result = beforeGeneric.trim();
    }

    return result
        .replace(/\s+/g, ' ')
        .split(' ')
        .map(w => {
            if (w.length > 1 && w === w.toUpperCase()) return w;
            return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
        })
        .join(' ');
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
