import { URL } from 'url';

/**
 * Normalize URL: remove fragment and query params (unless needed)
 * @param urlStr The URL string to normalize
 * @returns The normalized URL string
 */
export function normalizeUrl(urlStr: string): string {
    if (!urlStr) return '';
    const trimmed = urlStr.trim();
    try {
        const u = new URL(trimmed);
        u.hash = '';
        u.search = ''; // Assuming query params are not needed for unique content identification
        
        // Ensure trailing slash consistency if desired, but here we just return what URL gives us
        return u.toString();
    } catch (e) {
        return trimmed;
    }
}