import * as d3 from 'd3';
import Chart from './Chart';

export default class Histogram extends Chart {
  constructor(state) {
    super(Object.assign({
      data: [],
      selected: new Set(),
      highlighted: null,
      padding: {
        left: 20,
        right: 20,
        top: 10,
        bottom: 10
      },
      snapSelectionToBins: true,
      binStart: 0,
      binEnd: 1,
      binCount: 20,
      xAxis: d3.axisBottom(),
      xScale: d3.scaleLinear(),
      xAxisHeight: 10,
      valueScale: d3.scaleLinear(),
      valueGetter: d => d.value
    }, state), ['selected']);

    this.dispatch.on('render', () => {
      this.recompute();

      const axesLayer = this.getLayer('axes');
      this.renderAxesLayer(axesLayer);

      const plotLayer = this.getLayer('plot');
      this.renderPlotLayer(plotLayer);

      const brushLayer = this.getLayer('brush');
      this.renderBrushLayer(brushLayer);

      this.renderSelection();
    });
  }

  get plotAreaHeight() {
    const state = this.state;
    const padding = state.padding;
    return state.height - padding.top - padding.bottom - state.xAxisHeight - 10;
  }

  get plotAreaWidth() {
    const state = this.state;
    const padding = state.padding;
    return state.width - padding.right - padding.left;
  }

  get plotAreaLeft() {
    return this.state.padding.left;
  }

  get plotAreaTop() {
    return this.state.padding.top;
  }

  data(_) {
    if (!arguments.length) return this.state.data;
    this.state.data = _;
    return this;
  }

  recompute() {
    const state = this.state;
    const data = state.data.map(state.valueGetter);

    const xScale = state.xScale;

    xScale.domain([state.binStart, state.binEnd]);

    const bins = d3.histogram()
      .domain(xScale.domain())
      .thresholds(state.binCount)
      (data);

    state.bins = bins;
  }

  select(start, end) {
    const state = this.state;
    if (!arguments.length) return state.selection;

    const snapSelectionToBins = state.snapSelectionToBins;

    if (snapSelectionToBins) {
      const bins = state.bins;
      let startBoundary, endBoundary;

      const binWidth = bins[0].x1 - bins[0].x0;
      const halfBinWidth = binWidth / 2;

      for (let i = 0; i < bins.length; i++) {
        let bin = bins[i];
        if (start >= bin.x0 && start <= bin.x1) {
          if (start < bin.x0 + halfBinWidth) {
            start = bin.x0;
          } else {
            start = bin.x1;
          }
        }

        if (end >= bin.x0 && end <= bin.x1) {
          if (end < bin.x0 + halfBinWidth) {
            end = bin.x0;
          } else {
            end = bin.x1;
          }
        }
      }
    }

    state.selection = [start, end];
    this.renderSelection();
    return this;
  }

  renderSelection() {
    const state = this.state;
    const xScale = state.xScale;
    const selection = state.selection || [];
    const brush = state.brush;

    this.getLayer('brush').selectAll('g.brush')
      .transition()
      .call(brush.move, selection.map(xScale));
  }

  renderBrushLayer(layer) {
    const state = this.state;
    const width = this.plotAreaWidth;
    const padding = state.padding;
    const height = this.plotAreaHeight;
    const xScale = state.xScale;

    const left = this.plotAreaLeft;
    const top = this.plotAreaTop;
    layer.attr('transform', `translate(${ left }, ${ top })`);

    const brush = d3.brushX()
        .extent([[0, 0], [width, height]])
        .on('end', () => {
          if (!d3.event.sourceEvent) return; // Only transition after input.
          if (!d3.event.selection) return; // Ignore empty selections.
          const selection = d3.event.selection.map(xScale.invert);
          this.select(selection[0], selection[1]);
        });

    this.state.brush = brush;

    layer.selectAll('g.brush').data([this])
      .enter()
        .append('g')
        .attr('class', 'brush');

    layer.selectAll('g.brush')
      .call(brush);
  }

  renderAxesLayer(layer) {
    const state = this.state;
    const height = state.height;
    const width = this.plotAreaWidth;
    const left = this.plotAreaLeft;
    const padding = state.padding;
    layer.attr('transform', `translate(${ left }, ${ height - padding.top - padding.bottom - state.xAxisHeight })`);

    layer.selectAll('g.x.axis').data([this])
      .enter()
        .append('g')
        .attr('class', 'x axis');

    const xAxis = state.xAxis;
    const xScale = state.xScale;

    xScale.rangeRound([0, width]);

    xAxis.scale(xScale);

    layer.selectAll('g.x.axis')
      .call(xAxis);
  }

  renderPlotLayer(layer) {
    const state = this.state;
    const data = state.data;

    const height = this.plotAreaHeight;
    const width = this.plotAreaWidth;
    const left = this.plotAreaLeft;
    const top = this.plotAreaTop;
    layer.attr('transform', `translate(${ left }, ${ top })`)
      .attr('height', height)
      .attr('width', width);

    const valueScale = state.valueScale;
    const xScale = state.xScale;

    const bins = state.bins;
    valueScale.domain([0, d3.max(bins, d => d.length)])
      .range([height, 0]);

    const bars = layer.selectAll('.plot-element')
      .data(bins)

    const newBars = bars.enter()
      .append('g')
      .attr('class', 'plot-element');

    newBars.append('rect').attr('class', 'plot-value')
    newBars.append('text').attr('class', 'value-label')

    newBars.merge(bars)
      .attr('transform', d => `translate(${ xScale(d.x0) }, ${ valueScale(d.length) })`);

    const barWidth = xScale(bins[0].x1) - xScale(bins[0].x0) - 1;
    newBars.merge(bars).select('rect.plot-value')
      .attr('height', d => height - valueScale(d.length))
      .attr('width', barWidth)
      .attr('x', 1);

    newBars.merge(bars).select('text')
      .attr('y', d => {
        if (height - valueScale(d.length) < 15) {
          return -10;
        } else {
          return 6;
        }
      })
      .classed('invert-text-color', d => height - valueScale(d.length) >= 15)
      .attr('dy', '.75em')
      .attr('x', (xScale(bins[0].x1) - xScale(bins[0].x0)) / 2)
      .attr('text-anchor', 'middle')
      .text(d => d.length)

    bars.exit().remove()
  }
}

(function () {
  return;
  const makeId = (chars) => {
    let text = '';
    const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for (let i = 0; i < chars; i++)
      text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
  }

  let data = []
  for (let x = 0; x < 200; x++) {
    data.push({
      id: makeId(20),
      value: Math.floor(Math.random() * 1000)
    })
  }

  const container = document.querySelector('.container')

  const chart = new Histogram({
      binStart: 0,
      binEnd: 1000,
      binCount: 20
    })
    .container(container)
    .data(data)
    .render()
    .render()
    .on('selected', selected => {
      console.log('selected', selected);
    })

  const doit = 1;

  setTimeout(function () {
    chart.container(document.querySelector('.container2'));
  }, 20000);

  setInterval(function () {
    if (doit !== 1) return;
    data.forEach(function (d) {
      d.value = Math.floor(Math.random() * 1000);
    })
    chart.data(data)
    chart.render()
  }, 2000);

  setInterval(function () {
    if (doit !== 2) return;
    let data = []
    let mag = Math.random() * 20;
    for (let x = 0; x < 30; x++) {
      data.push({
        id: makeId(5 + Math.random() * mag),
        value: Math.floor(Math.random() * 1000)
      })
    }
    chart.data(data)
    chart.render()
  }, 20000);
  window.chart = chart;
  window.Histogram = Histogram;
})()
