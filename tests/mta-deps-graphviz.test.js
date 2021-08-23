/* eslint-disable no-console */
const fs = require('fs');
const MtaDeps = require('mta-deps-parser');
const GraphVizRenderer = require('../src/mta-deps-graphviz');

let dot;

beforeAll(async () => {
    const mtaString = fs.readFileSync('./tests/mta.yaml', 'utf8');

    const mtaGraph = MtaDeps.parse(mtaString);
    const renderedGraph = await GraphVizRenderer(mtaGraph);

    dot = renderedGraph.to_dot();
});

test('to_dot return something', async () => {
    expect(dot).toEqual(expect.anything());
});
