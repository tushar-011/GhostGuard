/**
 * Mind-Map Graph Formatter for GhostGuard
 * Converts scored and stored accounts into a hierarchical Node & Edge graph representation
 * compatible with both D3.js and React Flow mind maps.
 */

/**
 * Creates a clean slug from string for element identifiers
 * @param {string} str
 * @returns {string}
 */
function slugify(str = '') {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'general';
}

/**
 * Transforms an array of scored accounts into a node-edge mind-map graph
 *
 * @param {Array<object>} accounts
 * @param {string} [userEmail='Your Digital Footprint']
 * @returns {{ nodes: Array<object>, edges: Array<object>, meta: object }}
 */
function generateMindMapGraph(accounts = [], userEmail = 'Your Digital Footprint') {
  const nodes = [];
  const edges = [];

  // Group accounts by category
  const categoriesMap = new Map();

  for (const account of accounts) {
    const cat = account.category || 'General Service';
    if (!categoriesMap.has(cat)) {
      categoriesMap.set(cat, []);
    }
    categoriesMap.get(cat).push(account);
  }

  const categoryCount = categoriesMap.size;
  const rootX = 600;
  const rootY = 50;

  // 1. Central Root Node
  nodes.push({
    id: 'root',
    label: userEmail || 'Your Digital Footprint',
    type: 'user',
    position: { x: rootX, y: rootY },
    data: {
      label: userEmail || 'Your Digital Footprint',
      type: 'user',
      totalServices: accounts.length
    }
  });

  // Calculate layout spacing for categories
  const categorySpacing = 300;
  const totalCatWidth = (categoryCount - 1) * categorySpacing;
  let startX = rootX - totalCatWidth / 2;

  let catIndex = 0;
  for (const [category, serviceList] of categoriesMap.entries()) {
    const catSlug = slugify(category);
    const catNodeId = `cat-${catSlug}`;
    const catX = startX + catIndex * categorySpacing;
    const catY = 220;

    // 2. Category Node
    nodes.push({
      id: catNodeId,
      label: category,
      type: 'category',
      category,
      position: { x: catX, y: catY },
      data: {
        label: category,
        category,
        count: serviceList.length
      }
    });

    // Edge: Root -> Category
    edges.push({
      id: `edge-root-${catNodeId}`,
      source: 'root',
      target: catNodeId,
      type: 'smoothstep',
      animated: true,
      data: {
        type: 'root-to-category'
      }
    });

    // 3. Leaf Nodes (Services under this category)
    serviceList.forEach((service, serviceIndex) => {
      const serviceNodeId = service.domain;
      const leafX = catX + (serviceIndex % 2 === 0 ? -70 : 70);
      const leafY = catY + 140 + serviceIndex * 110;

      const riskLevel = service.riskLevel || 'Low';
      const ghostScore = typeof service.ghostScore === 'number' ? service.ghostScore : 0;
      const status = service.status || 'UNREVIEWED';
      const serviceName = service.serviceName || service.domain;

      nodes.push({
        id: serviceNodeId,
        label: serviceName,
        type: 'service',
        category,
        domain: service.domain,
        riskLevel,
        ghostScore,
        status,
        isDormant: Boolean(service.isDormant),
        position: { x: leafX, y: leafY },
        data: {
          label: serviceName,
          serviceName,
          domain: service.domain,
          category,
          riskLevel,
          ghostScore,
          status,
          flag: service.flag || (service.isDormant ? 'Dormant / Ghost Candidate' : 'Active / Recent'),
          isDormant: Boolean(service.isDormant),
          remediationTip: service.remediationTip || '',
          snippet: service.snippet || '',
          detectedDate: service.detectedDate || '',
          ageInMonths: service.ageInMonths || 0
        }
      });

      // Edge: Category -> Leaf Service
      edges.push({
        id: `edge-${catNodeId}-${serviceNodeId}`,
        source: catNodeId,
        target: serviceNodeId,
        type: 'default',
        data: {
          riskLevel,
          ghostScore
        }
      });
    });

    catIndex++;
  }

  return {
    nodes,
    edges,
    meta: {
      totalNodes: nodes.length,
      totalEdges: edges.length,
      totalServices: accounts.length,
      totalCategories: categoryCount
    }
  };
}

module.exports = {
  generateMindMapGraph
};

