export interface VariantRule {
    pattern: RegExp;
    name: string;
}

export interface ProductConfig {
    name: string;
    variants: VariantRule[];
    defaultVariant?: string;
}

export const PRODUCT_CONFIG: Record<string, ProductConfig> = {
    'dlp': {
        name: 'DLP',
        variants: [
            { pattern: /Cloud/i, name: 'Cloud' },
            { pattern: /On-prem|On\sPrem/i, name: 'On-prem' }
        ],
        defaultVariant: 'On-prem'
    },
    'endpoint': {
        name: 'Endpoint',
        variants: [],
        defaultVariant: 'General'
    },
    'fpone': {
        name: 'Forcepoint ONE',
        variants: [
            { pattern: /Canada\s?Gov\s?Cloud/i, name: 'Canada GovCloud' },
            { pattern: /Gov\s?Cloud/i, name: 'GovCloud' },
            { pattern: /SmartEdge.*Windows/i, name: 'SmartEdge Agent (Windows)' },
            { pattern: /SmartEdge.*macOS/i, name: 'SmartEdge Agent (macOS)' },
            { pattern: /Firewall/i, name: 'Firewall' },
            { pattern: /Mobile/i, name: 'Mobile' },
            { pattern: /SSE/i, name: 'SSE' }
        ],
        defaultVariant: 'General'
    },
    'fponefirewall': {
        name: 'Forcepoint ONE Firewall',
        variants: [],
        defaultVariant: 'General'
    },
    'F1E': {
        name: 'F1E',
        variants: [
            { pattern: /Mac|macOS/i, name: 'macOS' },
            { pattern: /Windows/i, name: 'Windows' },
            { pattern: /Linux/i, name: 'Linux' }
        ],
        defaultVariant: 'General'
    },
    'fpdsc': {
        name: 'Data Security Cloud',
        variants: [],
        defaultVariant: 'General'
    },
    'emailsec': {
        name: 'Email Security',
        variants: [
            { pattern: /Cloud/i, name: 'Cloud' },
            { pattern: /On-prem|On\sPrem/i, name: 'On-prem' }
        ],
        defaultVariant: 'General'
    },
    'websec': {
        name: 'Web Security',
        variants: [
            { pattern: /Cloud/i, name: 'Cloud' },
            { pattern: /On-prem|On\sPrem/i, name: 'On-prem' }
        ],
        defaultVariant: 'General'
    },
    'appliance': {
        name: 'Appliances',
        variants: [
            { pattern: /FSAM|Security\sAppliance\sManager/i, name: 'Security Appliance Manager (FSAM)' },
            { pattern: /V-Series|X-Series|Forcepoint\sAppliances/i, name: 'Forcepoint Appliances (V-Series)' }
        ],
        defaultVariant: 'Forcepoint Appliances (V-Series)'
    },
    'datasecurity': {
        name: 'Data Security',
        variants: [],
        defaultVariant: 'General'
    },
    'dspm': {
        name: 'DSPM',
        variants: [],
        defaultVariant: 'General'
    },
    'frbi': {
        name: 'RBI',
        variants: [],
        defaultVariant: 'General'
    },
    'ngfw': {
        name: 'Next Generation Firewall (NGFW)',
        variants: [],
        defaultVariant: 'General'
    },
    'insights': {
        name: 'Insights',
        variants: [],
        defaultVariant: 'General'
    },
    'dup': {
        name: 'DUP',
        variants: [],
        defaultVariant: 'General'
    },
    'ap-data': {
        name: 'AP-Data',
        variants: [],
        defaultVariant: 'General'
    },
    'bjces': {
        name: 'Boldon James',
        variants: [],
        defaultVariant: 'General'
    },
    'general': {
        name: 'Forcepoint General',
        variants: [],
        defaultVariant: 'General'
    }
};
