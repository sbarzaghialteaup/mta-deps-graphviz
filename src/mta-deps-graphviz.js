/* eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }] */

const graphviz = require('graphviz');
const MtaGraph = require('mta-deps-parser');
const theme = require('./theme-default.json');

function renderHtml5Repo(node, nodeAttributes) {
    const newAttributes = {};

    if (node.additionalInfo.resource?.parameters?.config?.sizeLimit) {
        newAttributes.label = `${nodeAttributes.label}\n\nSize: ${node.additionalInfo.resource?.parameters?.config?.sizeLimit} MB`;
    }
    return newAttributes;
}

function renderNodeJS(node, nodeAttributes) {
    const newAttributes = {};

    if (node.additionalInfo.module?.parameters?.memory) {
        newAttributes.label = `${nodeAttributes.label}\n\nMemory: ${node.additionalInfo.module.parameters.memory}`;
    }
    return newAttributes;
}

function renderDestination(node, _nodeAttributes) {
    return {
        label: `\\n${node.label}\\n\\n${node.name}`,
    };
}

function renderPropertiesSet(node, _nodeAttributes) {
    return {
        label: `${node.name}\\n`,
    };
}

function renderProperty(node, _nodeAttributes) {
    return {
        label: `\\nName: ${node.name.split(':')[1]}\n\nValue: ${node.value}`,
    };
}

const nodeRenderers = {
    [MtaGraph.nodeType.serviceHtml5Repo]: renderHtml5Repo,
    [MtaGraph.nodeType.nodejs]: renderNodeJS,
    [MtaGraph.nodeType.destination]: renderDestination,
    [MtaGraph.nodeType.propertiesSet]: renderPropertiesSet,
    [MtaGraph.nodeType.property]: renderProperty,
};

function renderDefaultAttributes(node) {
    switch (node.additionalInfo.category) {
        case MtaGraph.nodeCategory.module:
            return {
                label: `\\n${node.label}\\n\\n${node.name}`,
                color: '#737c80',
                fillcolor: '#bfb9ac',
                shape: 'box3d',
            };

        case MtaGraph.nodeCategory.resource:
            return {
                label: `\\n${node.label}\\n\\n${node.name}`,
                color: '#407780',
                fillcolor: '#488791',
                shape: 'record',
            };

        default:
            return {};
    }
}

function getNodeAttributes(node) {
    let nodeAttributes = renderDefaultAttributes(node);

    const renderer = nodeRenderers[node.type];
    if (renderer) {
        nodeAttributes = {
            ...nodeAttributes,
            ...renderer(node, nodeAttributes),
        };
    }

    nodeAttributes = { ...nodeAttributes, ...theme.nodes[node.type] };

    return nodeAttributes;
}

function copyAttributesFromTheme(
    themeAttributes,
    themeAttributesDefault,
    graphObjectSetMethod
) {
    if (themeAttributesDefault) {
        Object.entries(themeAttributesDefault).forEach(
            ([attributeName, attributeValue]) => {
                graphObjectSetMethod(attributeName, attributeValue);
            }
        );
    }
    if (themeAttributes) {
        Object.entries(themeAttributes).forEach(
            ([attributeName, attributeValue]) => {
                graphObjectSetMethod(attributeName, attributeValue);
            }
        );
    }
}

function setEdgeAttributes(link, edge) {
    copyAttributesFromTheme(
        theme.links[link.type],
        theme.links.default,
        edge.set.bind(edge)
    );
}
/**
 *
 * @param {graphviz.Graph} digraph
 */
function renderDigraph(digraph) {
    copyAttributesFromTheme(
        theme.digraph,
        undefined,
        digraph.set.bind(digraph)
    );

    copyAttributesFromTheme(
        theme['default-nodes'],
        undefined,
        digraph.setNodeAttribut.bind(digraph)
    );

    copyAttributesFromTheme(
        theme['default-links'],
        undefined,
        digraph.setEdgeAttribut.bind(digraph)
    );
}

function renderMtaCluster(mtaCluster, mtaGraph) {
    mtaCluster.set(
        'label',
        `MTA ID: ${mtaGraph.ID.toUpperCase()} [${mtaGraph.version}]`
    );
    copyAttributesFromTheme(
        theme.mtaCluster,
        undefined,
        mtaCluster.set.bind(mtaCluster)
    );
}

function renderCluster(cluster, link) {
    cluster.set('label', link.cluster);

    copyAttributesFromTheme(
        theme.cluster,
        undefined,
        cluster.set.bind(cluster)
    );
}

async function render(mtaGraph, customRenderers) {
    if (customRenderers) {
        Object.entries(customRenderers).forEach(([key, renderer]) => {
            nodeRenderers[key] = renderer;
        });
    }

    const mtaGraphViz = graphviz.digraph('MTA');
    const mainCluster = mtaGraphViz.addCluster('cluster_MTA_MAIN');
    const clusters = [];

    renderDigraph(mtaGraphViz);
    renderMtaCluster(mainCluster, mtaGraph);

    mtaGraph.nodes.forEach((node) => {
        mtaGraphViz.addNode(node.name, getNodeAttributes(node));

        node.links?.forEach((link) => {
            let cluster = mainCluster;

            if (link.cluster) {
                const clusterId = `cluster_${link.cluster.replace(/ /g, '_')}`;

                cluster = clusters[clusterId];

                if (!cluster) {
                    cluster = mainCluster.addCluster(clusterId);
                    renderCluster(cluster, link);

                    clusters[clusterId] = cluster;
                }
            }

            const edge = cluster.addEdge(node.name, link.name, {
                label: link.label ? link.label : link.type,
            });

            setEdgeAttributes(link, edge);
        });
    });

    return mtaGraphViz;
}

module.exports = render;
