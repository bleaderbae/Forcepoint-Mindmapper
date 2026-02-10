import { URL } from 'url';

/**
 * Normalize URL: remove fragment and query params (unless needed)
 * @param urlStr The URL string to normalize
 * @returns The normalized URL string
 */
export function normalizeUrl(urlStr: string): string {
    try {
        const u = new URL(urlStr);
        u.hash = '';
        u.search = ''; // Assuming query params are not needed for unique content identification
        return u.toString();
    } catch (e) {
        return urlStr;
    }
}
