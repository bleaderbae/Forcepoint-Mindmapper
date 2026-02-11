# Agent Instructions

## Data Pipeline
1.  **Crawl**: Run `npx ts-node src/crawler.ts` to crawl the documentation site. This saves data to `full_site_data.json`.
    *   The crawler now skips non-HTML files (PDFs, images) and normalizes URLs to avoid duplicates.
2.  **Clean**: Run `npx ts-node src/clean_data.ts` to deduplicate and sanitize `full_site_data.json`.
    *   This fixes empty titles and removes any remaining non-HTML entries.
3.  **Generate D3 Data**: Run `npx ts-node src/generate_d3_data.ts` to create `d3-data.json` for the interactive visualization.
4.  **Generate Mermaid**: Run `npx ts-node src/mapper.ts` to generate `flowchart.mmd` and update `mermaid.html`.

## Visualization
*   **Interactive Canvas (Primary)**: `index.html` uses D3.js to render a collapsible, searchable tree.
*   **Spatial Intelligence (Phase 1)**:
    *   **Search-to-Focus**: Searching for a term automatically pans and zooms the canvas to center the first match.
    *   **Breadcrumb Navigator**: A persistent, interactive breadcrumb trail at the top-left tracks the "Selection Path" and allows jumping back to ancestors.
    *   **Contextual Zoom (LOD)**: Level of Detail thresholds (`zoom-far`, `zoom-near`) adjust element visibility based on zoom scale to reduce clutter.
    *   **Inline Experience**: Details are rendered directly on the nodes via SVG `foreignObject`, replacing the old sidebar.
    *   **Accordion Logic**: Expanding a branch automatically collapses siblings to maintain focus.
    *   **Security**: Includes a strict Content Security Policy (CSP) and manual HTML entity escaping for all node metadata to prevent XSS.
*   **Product-Centric Hierarchy**: Documentation nodes are redistributed into relevant product branches (`DLP`, `Email Security`, etc.) instead of a loose top-level "Documentation" node.

## Deployment
*   The site is deployed via Vercel as a static site.
*   Ensure `index.html` and `d3-data.json` are committed. `mermaid.html` is optional.