/* eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }] */

const graphviz = require('graphviz');
const MtaGraph = require('mta-deps-parser');
const theme = require('./theme-default.json');

function renderDestination(node, _nodeAttributes) {
    console.log(node);
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
    graphObject
) {
    if (themeAttributesDefault) {
        Object.entries(themeAttributesDefault).forEach(
            ([attributeName, attributeValue]) => {
                graphObject.set(attributeName, attributeValue);
            }
        );
    }
    if (themeAttributes) {
        Object.entries(themeAttributes).forEach(
            ([attributeName, attributeValue]) => {
                graphObject.set(attributeName, attributeValue);
            }
        );
    }
}

function setEdgeAttributes(link, edge) {
    console.log(link.type);
    copyAttributesFromTheme(theme.links[link.type], theme.links.default, edge);
}
/**
 *
 * @param {graphviz.Graph} digraph
 */
function renderDigraph(digraph) {
    digraph.set('colorscheme', 'greys9');

    digraph.set('fontname', 'helvetica');
    digraph.set('bgcolor', '#e6cfd4');

    digraph.setNodeAttribut('fontname', 'helvetica');
    digraph.setNodeAttribut('fontsize', '10');
    digraph.setNodeAttribut('margin', '0.05');
    digraph.setNodeAttribut('height', '1.0');
    digraph.setNodeAttribut('width', '1.0');
    digraph.setNodeAttribut('style', 'filled, rounded');
    digraph.setNodeAttribut('color', '#737c80');
    digraph.setNodeAttribut('fillcolor', '#bfb9ac');

    digraph.setEdgeAttribut('fontsize', '10');
    digraph.setEdgeAttribut('fontname', 'helvetica');
    digraph.setEdgeAttribut('penwidth', '0.7');
}

function renderMtaCluster(mtaCluster, mtaGraph) {
    mtaCluster.set(
        'label',
        `MTA ID: ${mtaGraph.ID.toUpperCase()} [${mtaGraph.version}]`
    );
    mtaCluster.set('fontname', 'helvetica');
    mtaCluster.set('fontsize', '14');
    mtaCluster.set('bgcolor', 'white');
    mtaCluster.set('labeljust', 'l');
}

function renderCluster(cluster, link) {
    cluster.set('fontsize', '12');
    cluster.set('label', link.cluster);
    cluster.set('bgcolor', '#e6dbcf');
    cluster.set('style', 'filled, dotted');
    cluster.set('labeljust', 'l');
    cluster.setNodeAttribut('style', 'filled, rounded');
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
