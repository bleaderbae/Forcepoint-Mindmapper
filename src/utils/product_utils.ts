import { PRODUCT_CONFIG } from '../product_config.ts';

/**
 * Determines the product variant based on title and URL.
 */
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
