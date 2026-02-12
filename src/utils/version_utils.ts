const EOL_VERSIONS = new Set(['8.3', '8.4', '8.5', '8.6', '8.7', '8.8', '8.9']);
const CURRENT_VERSIONS = new Set(['10.2', '10.3', '10.4', '7.2', '7.3']);

export function getVersionStatus(name: string, prodName: string): 'current' | 'eol' {
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

export function isVersionString(name: string): boolean {
    const clean = name.replace(/^v/i, '');
    return /^\d+(\.\d+)*$/.test(clean) || /^\d+\.x$/i.test(clean) || /^\d{6}$/.test(clean);
}

export function compareVersions(a: string, b: string): number {
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
