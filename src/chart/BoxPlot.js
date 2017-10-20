import * as d3 from 'd3';
import Chart from './Chart';

export default class BoxPlot extends Chart {
  constructor(state) {
    super(Object.assign({
      data: [],
      selected: new Set(),
      highlighted: null,
      padding: {
        left: 20,
        right: 30,
        top: 10,
        bottom: 10
      },
      domain: [0, 1000],
      barMargin: 5,
      barMaxHeight: 20,
      valueAxisHeight: 20,
      valueAxisMargin: 5,
      labelAxis: d3.axisLeft(),
      labelAxisWidth: 120,
      labelAxisMargin: 5,
      labelMinScale: 0.6,
      labelScale: d3.scaleBand().padding(0.1),
      labelGetter: d => d.id,
      valueAxis: d3.axisBottom(),
      valueScale: d3.scaleLinear(),
      valueGetter: d => d.values
    }, state), ['selected']);

    this.dispatch.on('render', () => {
      this.recompute();

      const axesLayer = this.getLayer('axes');
      this.renderAxesLayer(axesLayer);

      const plotLayer = this.getLayer('plot');
      this.renderPlotLayer(plotLayer);
    });
  }

  get plotAreaHeight() {
    const state = this.state;
    const padding = state.padding;
    return state.height - padding.top - padding.bottom - state.valueAxisHeight - state.valueAxisMargin;
  }

  get plotAreaWidth() {
    const state = this.state;
    const padding = state.padding;
    return state.width - padding.right - padding.left - state.labelAxisWidth - state.labelAxisMargin;
  }

  get plotAreaLeft() {
    const state = this.state;
    return this.state.padding.left + state.labelAxisWidth + state.labelAxisMargin;
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
  }

  renderAxesLayer(layer) {
    const state = this.state;
    const height = this.plotAreaHeight;
    const width = this.plotAreaWidth;
    const left = this.plotAreaLeft;
    const top = this.plotAreaTop;
    const padding = state.padding;
    const barWidth = state.barWidth;

    layer.selectAll('g.value.axis').data([this])
      .enter()
        .append('g')
        .attr('class', 'value axis');

    const valueAxis = state.valueAxis;
    const valueScale = state.valueScale;
    valueScale.rangeRound([0, width]);
    valueScale.domain(state.domain);

    valueAxis.scale(valueScale);

    const valueAxisTop = this.plotAreaTop + this.plotAreaHeight + state.valueAxisMargin;

    layer.selectAll('g.value.axis')
      .attr('transform', `translate(${ left }, ${ valueAxisTop })`)
      .call(valueAxis);




    const data = state.data;
    const labelAxisWidth = state.labelAxisWidth;
    const labelAxisRight = padding.left + labelAxisWidth;
    const labelAxisTop = padding.top;

    layer.selectAll('g.label.axis').data([this])
      .enter()
        .append('g').attr('class', 'label axis')
          .append('text').attr('class', 'label')

    const labelGetter = state.labelGetter
    const labelScale = state.labelScale
    const labelAxis = state.labelAxis
    labelScale.range([this.plotAreaHeight, 0]).domain(data.map(labelGetter))
    labelAxis.scale(labelScale)

    const labelAxisMargin = state.labelAxisMargin;
    layer.selectAll('g.label.axis')
      .attr('transform', `translate(${ labelAxisWidth + padding.left }, ${ top })`)
      .call(labelAxis)

    const maxLabelWidth = layer.selectAll('.tick text').nodes().reduce((acc, node) => {
      const nodeWidth = node.getBBox().width
      return Math.max(nodeWidth, acc)
    }, 0)

    const tickWidth = layer.select('.tick line').node().getBBox().width;
    const availableLabelWidth = labelAxisWidth - tickWidth;
    const scaledLabelWidth = availableLabelWidth / maxLabelWidth;
    const scale = Math.max(Math.min(1, scaledLabelWidth), state.labelMinScale);

    layer.selectAll('g.label.axis .tick text')
      .attr('transform', `scale(${ scale })`)
      .on('mouseenter', id => this.highlighted(id))
      .on('mouseleave', () => this.highlighted(null))
      .on('click', id => this.toggleSelect(id));

  }

  renderPlotLayer(layer) {
    const state = this.state;
    const data = state.data;
    if (!data.length) return;
    const height = this.plotAreaHeight;
    const width = this.plotAreaWidth;
    const left = this.plotAreaLeft;
    const top = this.plotAreaTop;
    layer.attr('transform', `translate(${ left }, ${ top })`)
      .attr('height', height)
      .attr('width', width);

    const valueScale = state.valueScale;

    const values = state.values;
    const barWidth = state.barWidth;

    const bars = layer.selectAll('.plot-element')
      .data(data)

    const newBars = bars.enter()
      .append('g')
      .attr('class', 'plot-element');

    newBars.append('rect').attr('class', 'plot-body')
    newBars.append('line').attr('class', 'plot-median')
    newBars.append('line').attr('class', 'plot-bottom-whisker')
    newBars.append('line').attr('class', 'plot-top-whisker')
    newBars.append('text').attr('class', 'value-label')
    newBars.append('line').attr('class', 'plot-bottom-whisker-connector')
    newBars.append('line').attr('class', 'plot-top-whisker-connector')

    const allBars = newBars.merge(bars);
    const labelScale = state.labelScale

    const barMargin = state.barMargin;
    const barHalfMargin = barMargin / 2;
    const availableHeight = labelScale(data[0].id) - labelScale(data[1].id);
    const barHeight = Math.min(state.barMaxHeight, availableHeight - barMargin);
    const emptySpace = availableHeight - barHeight;

    allBars.attr('transform', d => `translate(0, ${ labelScale(d.id) + emptySpace / 2 })`);
    allBars.selectAll('rect.plot-body')
      .attr('width', d => {
        return valueScale(d.firstQuartile) - valueScale(d.thirdQuartile);
      })
      .attr('height', barHeight)
      .attr('y', 0)
      .attr('x', d => valueScale(d.thirdQuartile));

    allBars.selectAll('line.plot-median')
      .attr('x1', d => valueScale(d.secondQuartile))
      .attr('x2', d => valueScale(d.secondQuartile))
      .attr('y1', 0)
      .attr('y2', barHeight)
      .attr('stroke', 'black')

    allBars.selectAll('line.plot-bottom-whisker-connector')
      .attr('x1', d => valueScale(d.bottomWhisker))
      .attr('x2', d => valueScale(d.firstQuartile))
      .attr('y1', barHeight / 2 + 0.5)
      .attr('y2', barHeight / 2 + 0.5)
      .attr('stroke', 'black')

    allBars.selectAll('line.plot-bottom-whisker')
      .attr('x1', d => valueScale(d.bottomWhisker))
      .attr('x2', d => valueScale(d.bottomWhisker))
      .attr('y1', 0)
      .attr('y2', barHeight)
      .attr('stroke', 'black')

    allBars.selectAll('line.plot-top-whisker')
      .attr('x1', d => valueScale(d.topWhisker))
      .attr('x2', d => valueScale(d.topWhisker))
      .attr('y1', 0)
      .attr('y2', barHeight)
      .attr('stroke', 'black')

    allBars.selectAll('line.plot-top-whisker-connector')
      .attr('x1', d => valueScale(d.topWhisker))
      .attr('x2', d => valueScale(d.thirdQuartile))
      .attr('y1', barHeight / 2 + 0.5)
      .attr('y2', barHeight / 2 + 0.5)
      .attr('stroke', 'black')

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
  for (let x = 0; x < 5; x++) {

    let values = d3.range(1000).map(d3.randomBates(Math.ceil(Math.random() * 10))).map(d => d * 1000).sort((a, b) => b - a);

    const bottomWhisker = d3.quantile(values, 0.02);
    const firstQuartile = d3.quantile(values, 0.25);
    const secondQuartile = d3.quantile(values, 0.5);
    const thirdQuartile = d3.quantile(values, 0.75);
    const topWhisker = d3.quantile(values, 0.98);

    data.push({
      id: makeId(20),
      values,
      bottomWhisker,
      firstQuartile,
      secondQuartile,
      thirdQuartile,
      topWhisker
    });
  }

  const container = document.querySelector('.container')

  const chart = new BoxPlot()
    .container(container)
    .data(data)
    .render()
    .render()
    .on('selected', selected => {
      console.log('selected', selected);
    })

  const doit = 0;

  setTimeout(function () {
//chart.container(document.querySelector('.container2'));
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
  window.BoxPlot = BoxPlot;
})()
