# Agent Instructions

## Data Pipeline
1.  **Crawl**: Run `npx ts-node src/crawler.ts` to crawl the documentation site. This saves data to `full_site_data.json`.
    *   The crawler now skips non-HTML files (PDFs, images) and normalizes URLs to avoid duplicates.
2.  **Clean**: Run `npx ts-node src/clean_data.ts` to deduplicate and sanitize `full_site_data.json`.
    *   This fixes empty titles and removes any remaining non-HTML entries.
3.  **Generate D3 Data**: Run `npx ts-node src/generate_d3_data.ts` to create `d3-data.json` for the interactive visualization.
4.  **Generate Mermaid**: Run `npx ts-node src/mapper.ts` to generate `flowchart.mmd` and update `mermaid.html`.

## Visualization
*   **Interactive (Primary)**: `index.html` uses D3.js to render a collapsible tree from `d3-data.json`.
*   **Static (Fallback)**: `mermaid.html` uses Mermaid.js to render the graph defined in `flowchart.mmd`.

## Deployment
*   The site is deployed via Vercel as a static site.
*   Ensure `index.html`, `mermaid.html`, and `d3-data.json` are committed.
