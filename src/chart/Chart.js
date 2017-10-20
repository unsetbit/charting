import * as d3 from 'd3'

export default class Chart {
  constructor(state = {}, eventTypes = []) {
    this.state = Object.assign({ container: null }, state);
    this.layers = [];

    eventTypes.push('render');
    this.dispatch = d3.dispatch(...eventTypes);
  }

  on() {
    this.dispatch.on.apply(this.dispatch, Array.from(arguments));
    return this;
  }

  container(_) {
    if (!arguments.length) return this.state.container;

    const state = this.state;
    const container = _;

    if (state.container && state.container !== container) {
      state.container.removeChild(state.svg.node());
      container.appendChild(state.svg.node());
    }

    state.container = container;
    this.render();

    return this;
  }

  api() {
    return {
      render: this.render.bind(this),
      container: this.container.bind(this)
    };
  }
  render() {
    const state = this.state;
    const container = state.container;
    const svgSelection = d3.select(container).selectAll('svg').data([container]);

    const { width, height } = container.getBoundingClientRect();
    state.width = width;
    state.height = height;

    state.svg = svgSelection
      .enter()
        .append('svg')
      .merge(svgSelection)
        .attr('width', state.width)
        .attr('height', state.height);

    this.layers.forEach(layer => {
      layer.renderer.call(this, this.getLayer(layer.name))
    });

    this.dispatch.call('render', this, state.svg);

    return this;
  }

  addLayer(name, renderer) {
    this.layers.push({name, renderer});
  }

  getLayer(name) {
    const svg = this.state.svg;

    if (!svg) return;

    const layerSelection = svg.selectAll(`g.layer.${ name }-layer`).data([svg]);
    return layerSelection.enter()
      .append('g')
      .attr('class', `layer ${ name }-layer`)
      .merge(layerSelection);
  }
}
