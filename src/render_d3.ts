import * as fs from 'fs';
import * as path from 'path';

function run() {
    const dataPath = path.join(process.cwd(), 'd3-data.json');
    if (!fs.existsSync(dataPath)) {
        console.error('d3-data.json not found. Run npm run gen-d3 first.');
        return;
    }

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline' https://d3js.org; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; object-src 'none'; base-uri 'none';">
    <title>Forcepoint Mind Map Canvas</title>
    <script src="https://d3js.org/d3.v7.min.js"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --fp-green: #00af9a; --fp-dark-green: #007565; --fp-navy: #1d252c;
            --fp-gray: #636569; --fp-light: #f5f6f6;
            --bg-color: var(--fp-light); --header-bg: var(--fp-navy);
            --card-bg: #ffffff; --text-primary: var(--fp-navy);
            --text-secondary: var(--fp-gray); --border-color: #e2e8f0;
            --node-bg: #ffffff; --edge-color: #cbd5e0;
            --grid-color: #d1d1d1; --sidebar-width: 320px;
            --shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        }

        body.dark-mode {
            --bg-color: #0f172a; --header-bg: #020617;
            --card-bg: #1e293b; --text-primary: #f1f5f9;
            --text-secondary: #94a3b8; --border-color: #334155;
            --node-bg: #1e293b; --edge-color: #475569;
            --grid-color: #334155;
        }

        * { box-sizing: border-box; }
        body { margin: 0; padding: 0; overflow: hidden; font-family: 'Inter', sans-serif; background-color: var(--bg-color); color: var(--text-primary); display: flex; height: 100vh; }

        header { position: absolute; top: 0; left: 0; right: 0; height: 64px; background-color: var(--header-bg); color: white; display: flex; align-items: center; justify-content: space-between; padding: 0 24px; z-index: 1000; box-shadow: 0 2px 10px rgba(0,0,0,0.3); }
        header h1 { margin: 0; font-size: 1.25rem; font-weight: 600; }

        #global-finder { width: var(--sidebar-width); background: var(--card-bg); border-right: 1px solid var(--border-color); display: flex; flex-direction: column; z-index: 950; transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1); margin-top: 64px; height: calc(100vh - 64px); }
        #global-finder.collapsed { transform: translateX(-100%); position: absolute; }

        .finder-header { padding: 16px; background: var(--fp-green); color: white; font-weight: 800; font-size: 11px; letter-spacing: 1px; text-transform: uppercase; }
        .finder-scroll { flex: 1; overflow-y: auto; padding: 8px 0; }

        .finder-node { display: flex; flex-direction: column; }
        .finder-row { display: flex; align-items: center; padding: 8px 16px; cursor: pointer; font-size: 13px; transition: background 0.2s; border-radius: 4px; margin: 0 8px; color: var(--text-primary); }
        .finder-row:hover { background: var(--fp-light); }
        .dark-mode .finder-row:hover { background: rgba(255,255,255,0.05); }
        .finder-row--active { background: rgba(0, 175, 154, 0.1) !important; color: var(--fp-green) !important; font-weight: 600; }
        .finder-row:focus-visible { outline: 2px solid var(--fp-green); outline-offset: -2px; }

        .finder-children { display: none; padding-left: 12px; border-left: 1px solid var(--border-color); margin-left: 22px; }
        .finder-node.expanded > .finder-children { display: block; }
        
        .toggle-icon { width: 16px; height: 16px; display: flex; align-items: center; justify-content: center; transition: transform 0.2s; opacity: 0.5; margin-right: 4px; }
        .finder-node.expanded > .finder-row .toggle-icon { transform: rotate(90deg); }
        .leaf-dot { width: 6px; height: 6px; background: var(--fp-green); border-radius: 50%; margin-right: 14px; margin-left: 5px; opacity: 0.4; }

        .sidebar-toggle { position: absolute; top: 80px; left: var(--sidebar-width); background: var(--fp-green); color: white; border: none; width: 24px; height: 48px; border-radius: 0 8px 8px 0; cursor: pointer; z-index: 960; display: flex; align-items: center; justify-content: center; transition: left 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
        #global-finder.collapsed + .sidebar-toggle { left: 0; }

        #main-content { flex: 1; position: relative; overflow: hidden; }
        #canvas-container { width: 100%; height: 100%; cursor: grab; background-image: radial-gradient(circle, var(--grid-color) 1.5px, transparent 1.5px); background-size: 48px 48px; }

        .node rect { fill: var(--node-bg); stroke: var(--border-color); stroke-width: 1.5px; rx: 12; ry: 12; transition: all 0.3s ease; }
        .node--selected rect { stroke: var(--fp-green) !important; stroke-width: 3px !important; }
        .node--search-match rect { stroke: #eab308 !important; stroke-width: 3px !important; filter: drop-shadow(0 0 4px rgba(234, 179, 8, 0.4)); }
        .node text { font-size: 13px; font-weight: 600; pointer-events: none; fill: var(--text-primary); transition: fill 0.3s ease; }
        .link { fill: none; stroke: var(--edge-color); stroke-width: 2.5px; transition: all 0.3s ease; }
        .node--compressed { opacity: 0.4; }

        /* Semantic Zooming */
        #canvas-container.zoom-low .node-label { opacity: 0 !important; }
        #canvas-container.zoom-low .node:hover .node-label { opacity: 1 !important; }

        #breadcrumb-navigator { position: absolute; top: 80px; left: 40px; z-index: 900; background: var(--card-bg); padding: 8px 16px; border-radius: 8px; box-shadow: var(--shadow); border: 1px solid var(--border-color); display: flex; align-items: center; gap: 8px; font-size: 12px; opacity: 0; pointer-events: none; transition: opacity 0.3s ease; }
        #breadcrumb-navigator.visible { opacity: 1; pointer-events: auto; }
        .breadcrumb-item { cursor: pointer; color: var(--text-primary); }
        .breadcrumb-item:hover { color: var(--fp-green); text-decoration: underline; }
        .breadcrumb-item:focus-visible { outline: 2px solid var(--fp-green); outline-offset: 2px; border-radius: 2px; }

        /* Rich Knowledge Card Styling */
        .node-details { padding: 20px; display: flex; flex-direction: column; gap: 12px; color: var(--text-primary); width: 100%; height: 100%; overflow: hidden; background: transparent; }
        .detail-title { font-weight: 700; font-size: 15px; line-height: 1.2; color: var(--text-primary); margin-bottom: 2px; }
        .node-summary { font-size: 12px; line-height: 1.5; color: var(--text-secondary); flex: 1; overflow-y: auto; scrollbar-width: thin; padding-right: 4px; margin-bottom: 8px; }
        .node-summary::-webkit-scrollbar { width: 3px; }
        .node-summary::-webkit-scrollbar-thumb { background: var(--fp-green); }

        .related-links { margin-top: auto; padding-top: 10px; border-top: 1px solid var(--border-color); font-size: 11px; }
        .related-links h4 { margin: 0 0 4px; font-size: 11px; text-transform: uppercase; color: var(--text-secondary); }
        .related-links ul { list-style: none; padding: 0; margin: 0; }
        .related-links li { margin-bottom: 2px; }
        .related-links a { color: var(--fp-green); text-decoration: none; }
        .related-links a:hover { text-decoration: underline; }

        .type-tag { display: inline-block; padding: 4px 10px; border-radius: 6px; font-size: 10px; text-transform: uppercase; font-weight: 800; letter-spacing: 1px; width: fit-content; }
        .tag-document { background: #f0fff4; color: #2f855a; }
        .tag-platform { background: var(--fp-navy); color: white; }
        .dark-mode .tag-document { background: #22543d; color: #c6f6d5; }

        .external-link-btn { display: flex; align-items: center; justify-content: center; gap: 8px; background-color: var(--fp-green); color: white; padding: 10px 20px; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 13px; transition: all 0.2s; width: 100%; box-shadow: 0 4px 10px rgba(0, 175, 154, 0.2); margin-top: auto; }
        .external-link-btn:hover { background-color: var(--fp-dark-green); transform: translateY(-2px); }

        .controls { position: absolute; bottom: 32px; left: 32px; display: flex; gap: 12px; z-index: 100; }
        .btn { background: var(--card-bg); border: 1px solid var(--border-color); width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: var(--shadow); font-size: 20px; color: var(--text-primary); transition: all 0.2s; }

        #loading-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: var(--bg-color); display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 2000; transition: opacity 0.5s ease-out; }
        .spinner { width: 40px; height: 40px; border: 4px solid var(--border-color); border-top: 4px solid var(--fp-green); border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 16px; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

        #minimap { position: absolute; bottom: 32px; right: 32px; width: 240px; height: 160px; background: var(--card-bg); border: 1px solid var(--border-color); box-shadow: var(--shadow); border-radius: 8px; z-index: 90; overflow: hidden; }
        #minimap rect.viewport { fill: none; stroke: var(--fp-green); stroke-width: 2px; }
        #minimap circle { fill: var(--fp-gray); opacity: 0.5; }
        #minimap circle.active { fill: var(--fp-green); opacity: 1; }
    </style>
</head>
<body>
    <div id="loading-overlay"><div class="spinner"></div><div style="font-weight: 500;">Building Knowledge Base...</div></div>
    <header><h1>Forcepoint Documentation</h1><div class="header-actions"><input type="text" id="search-input" placeholder="Search..." aria-label="Search documentation"><button class="theme-toggle" id="theme-toggle" aria-label="Toggle Theme">🌓</button></div></header>
    <aside id="global-finder"><div class="finder-header">Documentation Explorer</div><div class="finder-scroll" id="finder-list"></div></aside>
    <button class="sidebar-toggle" id="finder-toggle" onclick="toggleSidebar()" aria-label="Toggle Sidebar">‹</button>
    <main id="main-content"><div id="breadcrumb-navigator"></div><div id="canvas-container"><div class="controls"><button class="btn" onclick="zoomIn()" aria-label="Zoom In" title="Zoom In (+)">+</button><button class="btn" onclick="zoomOut()" aria-label="Zoom Out" title="Zoom Out (-)">-</button><button class="btn" onclick="resetZoom()" aria-label="Reset Zoom" title="Reset Zoom (0)">⟲</button></div><svg id="minimap"></svg></div></main>

    <script>
        const config = { nodeWidth: 320, nodeHeight: 52, expandedHeight: 280, directoryHeight: 360, levelWidth: 450, directoryThreshold: 12 };
        let root, allNodes, svg, g, linkGroup, nodeGroup, zoom, i = 0, selectedNode = null;
        let minimapSvg, minimapScale, minimapTransform;
        const duration = 600;

        function escapeHtml(unsafe) {
            return unsafe
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");
        }

        function toggleSidebar() {
            const isCollapsed = document.getElementById('global-finder').classList.toggle('collapsed');
            document.getElementById('finder-toggle').innerText = isCollapsed ? '›' : '‹';
            setTimeout(() => {
                const w = document.getElementById('canvas-container').clientWidth;
                const h = document.getElementById('canvas-container').clientHeight;
                svg.attr("width", w).attr("height", h);
            }, 300);
        }

        async function init() {
            let data, summariesData;
            try {
                [data, summariesData] = await Promise.all([
                    d3.json('d3-data.json?v=' + new Date().getTime()),
                    d3.json('summaries.json?v=' + new Date().getTime())
                ]);
            } catch (error) { console.error(error); return; }
            window.summaries = summariesData;

            const container = d3.select("#canvas-container");
            svg = container.append("svg").attr("width", "100%").attr("height", "100%").style("overflow", "visible");
            g = svg.append("g"); linkGroup = g.append("g").attr("class", "links"); nodeGroup = g.append("g").attr("class", "nodes");
            zoom = d3.zoom().scaleExtent([0.05, 3]).on("zoom", (event) => {
                g.attr("transform", event.transform);
                container.classed("zoom-low", event.transform.k < 0.4);
                updateMinimapViewport(event.transform);
            });
            svg.call(zoom);

            minimapSvg = d3.select("#minimap");

            root = d3.hierarchy(data, d => d.children);
            root.sort((a, b) => {
                if (a.data.name === 'ONE') return -1;
                if (b.data.name === 'ONE') return 1;
                return a.data.name.localeCompare(b.data.name);
            });

            root.eachAfter(d => {
                d.id = ++i;
                d.value = d.children ? d.children.reduce((sum, c) => sum + c.value, 0) : 1;
                if (d.children && d.children.length > config.directoryThreshold) d.data.isDirectory = true;
            });

            renderFinderRecursive(root, document.getElementById('finder-list'));

            allNodes = root.descendants();

            if (root.children) root.children.forEach(d => { if (d.children) d.children.forEach(collapse); });
            update(root); resetZoom();
            document.getElementById('loading-overlay').style.opacity = '0';
            setTimeout(() => document.getElementById('loading-overlay').remove(), 500);

            d3.select("#search-input").on("input", function() {
                const term = this.value.toLowerCase();
                // Clear previous highlights
                d3.selectAll(".node--search-match").classed("node--search-match", false);

                if (!term) return;

                const matches = allNodes.filter(d => d.data.name.toLowerCase().includes(term));

                // Highlight all matches
                matches.forEach(m => {
                    // We need to find the DOM element for this node if it's visible
                    // But since nodes might be collapsed, we might not see them all.
                    // The requirement implies visual highlighting.
                    // If we just add class to existing nodes:
                    d3.select(\`.node[data-id="\${m.id}"]\`).classed("node--search-match", true);
                });

                // Still jump to the first match
                if (matches.length > 0) window.focusNodeById(matches[0].id);

                // Also update the rendered nodes to ensure class is applied if they appear later?
                // The current update logic re-renders nodes.
                // We should store the search term or matched IDs to apply class during update()
                window.searchMatches = new Set(matches.map(d => d.id));
                update(root);
            });
        }

        function renderFinderRecursive(d, container) {
            if (d.depth === 0) { d.children.forEach(c => renderFinderRecursive(c, container)); return; }
            const nodeDiv = document.createElement('div');
            nodeDiv.className = 'finder-node'; nodeDiv.dataset.id = d.id;

            const row = document.createElement('div');
            row.className = 'finder-row';
            row.tabIndex = 0;
            row.role = 'button';
            row.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    row.click();
                }
            });

            const hasChildren = d.children || d._children;
            if (hasChildren) {
                row.setAttribute('aria-expanded', 'false');
                row.innerHTML = \`<span class="toggle-icon">▶</span> 📁 \`;
                row.appendChild(document.createTextNode(d.data.name));
                row.onclick = (e) => {
                    e.stopPropagation();
                    nodeDiv.classList.toggle('expanded');
                    const isExpanded = nodeDiv.classList.contains('expanded');
                    row.setAttribute('aria-expanded', isExpanded);
                    window.focusNodeById(d.id);
                };
            } else {
                row.innerHTML = \`<span class="leaf-dot"></span> 📄 \`;
                row.appendChild(document.createTextNode(d.data.name));
                row.onclick = (e) => { e.stopPropagation(); window.focusNodeById(d.id); };
            }
            nodeDiv.appendChild(row);
            if (hasChildren) {
                const childContainer = document.createElement('div'); childContainer.className = 'finder-children';
                (d.children || d._children).forEach(c => renderFinderRecursive(c, childContainer));
                nodeDiv.appendChild(childContainer);
            }
            container.appendChild(nodeDiv);
        }

        function collapse(d) { if (d.children) { d._children = d.children; d._children.forEach(collapse); d.children = null; } }

        window.focusNodeById = (id) => {
            const target = allNodes.find(d => String(d.id) === String(id));
            if (!target) return;

            // Accordion Logic: Resolve the expansion path and collapse others
            const ancestors = target.ancestors();
            for (let i = ancestors.length - 1; i >= 0; i--) {
                const nodeOnPath = ancestors[i];
                const parent = ancestors[i+1] || root;
                
                if (parent.children) {
                    parent.children.forEach(sibling => {
                        if (sibling !== nodeOnPath) collapse(sibling);
                    });
                }

                if (nodeOnPath._children) {
                    nodeOnPath.children = nodeOnPath._children;
                    nodeOnPath._children = null;
                }
                
                const sidebarNode = document.querySelector(\`.finder-node[data-id="\${nodeOnPath.id}"]\`);
                if (sidebarNode) {
                    sidebarNode.classList.add('expanded');
                    const row = sidebarNode.querySelector('.finder-row');
                    if (row && row.hasAttribute('aria-expanded')) {
                        row.setAttribute('aria-expanded', 'true');
                    }
                }
            }

            selectNode(target);
            update(target);
            
            document.querySelectorAll('.finder-row').forEach(el => el.classList.remove('finder-row--active'));
            const activeRow = document.querySelector(\`.finder-node[data-id="\${id}"] > .finder-row\`);
            if (activeRow) {
                activeRow.classList.add('finder-row--active');
                activeRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }

            const w = document.getElementById('canvas-container').clientWidth;
            const h = document.getElementById('canvas-container').clientHeight;
            let scale = target.data.type === 'document' ? 1.2 : 0.8;
            svg.transition().duration(750).call(zoom.transform, d3.zoomIdentity.translate(w/3, h/2).scale(scale).translate(-target.y, -target.x));
        };

        function calculateDynamicTree() {
            const layout = d3.tree().nodeSize([160, config.levelWidth]);
            const treeData = layout(root); const nodes = treeData.descendants();
            if (selectedNode) {
                const activePath = new Set(selectedNode.ancestors());
                nodes.sort((a,b) => a.x - b.x);
                nodes.forEach((d, index) => {
                    const isFocus = activePath.has(d) || (selectedNode.parent && activePath.has(d.parent));
                    d.x = index > 0 ? nodes[index-1].x + (isFocus ? 160 : 45) : 0;
                });
            }
            return treeData;
        }

        function update(source) {
            const treeData = calculateDynamicTree();
            const nodes = treeData.descendants(); const links = treeData.links();
            nodes.forEach(d => { d.y = d.depth * config.levelWidth; });
            const node = nodeGroup.selectAll("g.node").data(nodes, d => d.id);
            const nodeEnter = node.enter().append("g")
                .attr("class", d => "node node--" + (d.data.type || 'category'))
                .attr("data-id", d => d.id)
                .attr("transform", d => "translate(" + (source.y0 ?? source.y ?? 0) + "," + (source.x0 ?? source.x ?? 0) + ")")
                .on("click", (event, d) => window.focusNodeById(d.id));

            nodeEnter.append("rect").attr("width", config.nodeWidth).attr("height", config.nodeHeight).attr("y", -config.nodeHeight/2);
            nodeEnter.append("text").attr("class", "node-label").attr("dy", ".35em").attr("x", 16).text(d => d.data.name.length > 35 ? d.data.name.substring(0, 32) + "..." : d.data.name);
            nodeEnter.append("foreignObject").attr("class", "details-container").attr("width", config.nodeWidth).attr("y", -config.expandedHeight/2).style("opacity", 0).style("pointer-events", "none");

            const nodeUpdate = nodeEnter.merge(node);
            const activePath = selectedNode ? new Set(selectedNode.ancestors()) : new Set();
            nodeUpdate.classed("node--selected", d => d === selectedNode)
                      .classed("node--compressed", d => selectedNode && !activePath.has(d) && !(d.parent && activePath.has(d.parent)))
                      .classed("node--search-match", d => window.searchMatches && window.searchMatches.has(d.id));

            nodeUpdate.transition().duration(duration).attr("transform", d => "translate(" + d.y + "," + d.x + ")");
            nodeUpdate.select("rect").transition().duration(duration).attr("height", d => d === selectedNode ? (d.data.isDirectory ? config.directoryHeight : config.expandedHeight) : config.nodeHeight)
                .attr("y", d => { const h = d === selectedNode ? (d.data.isDirectory ? config.directoryHeight : config.expandedHeight) : config.nodeHeight; return -h/2; });

            nodeUpdate.select(".node-label").transition().duration(duration).style("opacity", d => d === selectedNode ? 0 : 1);

            nodeUpdate.each(function(d) {
                const fo = d3.select(this).select(".details-container");
                if (d === selectedNode) {
                    const h = d.data.isDirectory ? config.directoryHeight : config.expandedHeight;
                    fo.attr("height", h).attr("y", -h/2);
                    fo.style("pointer-events", "auto").transition().duration(duration).style("opacity", 1);
                    const safeName = escapeHtml(d.data.name);

                    const summaryData = window.summaries && d.data.url ? window.summaries[d.data.url] : null;
                    const summaryText = summaryData ? summaryData.summary : "No summary content found for this document.";
                    const safeSummary = escapeHtml(summaryText);

                    let relatedLinksHtml = '';
                    if (summaryData && summaryData.relatedLinks && summaryData.relatedLinks.length > 0) {
                        const links = summaryData.relatedLinks
                            .filter(l => /^https?:\\/\\//i.test(l.url))
                            .map(l => \`<li><a href="\${escapeHtml(l.url)}" target="_blank">\${escapeHtml(l.title)}</a></li>\`)
                            .join('');
                        if (links) relatedLinksHtml = \`<div class="related-links"><h4>Related Links</h4><ul>\${links}</ul></div>\`;
                    }

                    const safeUrl = (d.data.url && /^https?:\\/\\//i.test(d.data.url)) ? d.data.url.replace(/"/g, "&quot;") : '';
                    
                    if (d.data.isDirectory) {
                        const items = (d.children || d._children || []).map(c => \`<li class="directory-item" onclick="event.stopPropagation(); window.focusNodeById('\${c.id}')">\${escapeHtml(c.data.name)}</li>\`).join("");
                        fo.html(\`<div class="node-details directory-container" xmlns="http://www.w3.org/1999/xhtml"><div class="directory-header"><span>DIRECTORY</span><span>\${(d.children||d._children).length} items</span></div><div class="detail-title">\${safeName}</div><ul class="directory-list">\${items}</ul></div>\`);
                    } else {
                        fo.html(\`<div class="node-details" xmlns="http://www.w3.org/1999/xhtml"><div class="type-tag tag-\${d.data.type}">\${d.data.type}</div><div class="detail-title">\${safeName}</div><div class="node-summary">\${safeSummary}</div>\${relatedLinksHtml}\${safeUrl ? \`<a href="\${safeUrl}" target="_blank" class="external-link-btn" onclick="event.stopPropagation()">View Official Documentation ↗</a>\` : ''}</div>\`);
                    }
                } else {
                    fo.style("pointer-events", "none").transition().duration(duration).style("opacity", 0);
                }
            });

            node.exit().transition().duration(duration).attr("transform", d => "translate(" + source.y + "," + source.x + ")").remove();
            const link = linkGroup.selectAll("path.link").data(links, d => d.target.id);
            link.enter().insert("path", "g").attr("class", "link").attr("d", d => { const o = { x: source.x0 ?? source.x ?? 0, y: (source.y0 ?? source.y ?? 0) + config.nodeWidth }; return diagonal(o, o); })
                .merge(link).transition().duration(duration).attr("d", d => diagonal({ x: d.source.x, y: d.source.y + config.nodeWidth }, { x: d.target.x, y: d.target.y }))
                .attr("stroke-width", d => Math.max(2, Math.log(d.target.value || 1) * 1.5) + "px")
                .style("opacity", d => activePath.has(d.target) || activePath.has(d.source) ? 1 : 0.2);
            link.exit().remove();
            nodes.forEach(d => { d.x0 = d.x; d.y0 = d.y; });

            updateMinimap(nodes);
        }

        function updateMinimap(nodes) {
            if (!nodes || nodes.length === 0) return;
            // Calculate bounding box of all nodes
            const xExtent = d3.extent(nodes, d => d.y);
            const yExtent = d3.extent(nodes, d => d.x);
            const width = 240, height = 160;
            const padding = 20;

            const xRange = xExtent[1] - xExtent[0] || 1;
            const yRange = yExtent[1] - yExtent[0] || 1;

            // Fit to box
            const scaleX = (width - 2 * padding) / xRange;
            const scaleY = (height - 2 * padding) / yRange;
            minimapScale = Math.min(scaleX, scaleY);

            const tx = padding - xExtent[0] * minimapScale + (width - 2 * padding - xRange * minimapScale) / 2;
            const ty = padding - yExtent[0] * minimapScale + (height - 2 * padding - yRange * minimapScale) / 2;

            minimapTransform = { k: minimapScale, x: tx, y: ty };

            const circles = minimapSvg.selectAll("circle").data(nodes, d => d.id);
            circles.enter().append("circle").attr("r", 2)
                .merge(circles)
                .attr("cx", d => d.y * minimapScale + tx)
                .attr("cy", d => d.x * minimapScale + ty)
                .classed("active", d => d === selectedNode);
            circles.exit().remove();

            // Draw/Update Viewport Rect
            // The viewport rect represents the visible area of the main canvas
            // We need the current transform of the main svg to calculate this
            const transform = d3.zoomTransform(svg.node());
            updateMinimapViewport(transform);
        }

        function updateMinimapViewport(transform) {
            if (!minimapTransform) return;

            // Viewport dimensions
            const container = document.getElementById("canvas-container");
            const vw = container.clientWidth;
            const vh = container.clientHeight;

            // Calculate the visible area in the coordinate space of the graph
            // visible_x = (0 - transform.x) / transform.k
            const vx = -transform.x / transform.k;
            const vy = -transform.y / transform.k;
            const vWidth = vw / transform.k;
            const vHeight = vh / transform.k;

            // Map to minimap coordinates
            const mx = vx * minimapTransform.k + minimapTransform.x;
            const my = vy * minimapTransform.k + minimapTransform.y;
            const mw = vWidth * minimapTransform.k;
            const mh = vHeight * minimapTransform.k;

            let rect = minimapSvg.select("rect.viewport");
            if (rect.empty()) rect = minimapSvg.append("rect").attr("class", "viewport");

            rect.attr("x", mx).attr("y", my).attr("width", mw).attr("height", mh);
        }

        function diagonal(s, d) { return "M" + s.y + "," + s.x + "C" + (s.y + d.y) / 2 + "," + s.x + " " + (s.y + d.y) / 2 + "," + d.x + " " + d.y + "," + d.x; }

        function selectNode(d) {
            selectedNode = d; const nav = d3.select("#breadcrumb-navigator");
            if (!d) return nav.classed("visible", false);
            nav.classed("visible", true).html("");
            d.ancestors().reverse().forEach((a, i) => {
                if (i > 0) nav.append("span").text("›").style("opacity", 0.5).style("margin", "0 4px").attr("aria-hidden", "true");
                nav.append("span")
                    .attr("class", "breadcrumb-item")
                    .attr("tabindex", "0")
                    .attr("role", "button")
                    .attr("aria-label", "Navigate to " + a.data.name)
                    .text(a.data.name)
                    .on("click", (e) => { e.stopPropagation(); window.focusNodeById(a.id); })
                    .on("keydown", (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            e.stopPropagation();
                            window.focusNodeById(a.id);
                        }
                    });
            });
        }

        function zoomIn() { svg.transition().call(zoom.scaleBy, 1.4); }
        function zoomOut() { svg.transition().call(zoom.scaleBy, 0.7); }
        function resetZoom() { 
            const h = document.getElementById('canvas-container').clientHeight;
            svg.transition().duration(750).call(zoom.transform, d3.zoomIdentity.translate(60, h/2).scale(0.7)); 
        }

        document.getElementById('theme-toggle').addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
            localStorage.setItem('theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
        });

        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            if (e.key === '/' || (e.key === 'f' && (e.metaKey || e.ctrlKey))) {
                e.preventDefault();
                document.getElementById('search-input').focus();
            } else if (e.key === '=' || e.key === '+') {
                zoomIn();
            } else if (e.key === '-' || e.key === '_') {
                zoomOut();
            } else if (e.key === '0') {
                resetZoom();
            }
        });

        init();
    </script>
</body>
</html>`;

    fs.writeFileSync(path.join(process.cwd(), 'index.html'), html);
}

run();