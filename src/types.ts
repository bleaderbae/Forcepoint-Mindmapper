export interface DocNode {
    url: string;
    title: string;
    content?: string;
    breadcrumbs: string[];
    parentUrl?: string;
    nextUrl?: string;
    prevUrl?: string;
    relatedUrls?: string[];
    lastScraped?: string;
}

export interface TreeNode {
    title: string;
    url?: string;
    children: TreeNode[];
    childrenMap?: Map<string, TreeNode>;
    nextUrl?: string;
}
