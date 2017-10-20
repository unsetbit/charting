import * as d3 from 'd3';
import Chart from './Chart';

export default class BarChart extends Chart {
  constructor(state) {
    super(Object.assign({
      data: [],
      selected: new Set(),
      highlighted: null,
      padding: {
        left: 10,
        right: 10,
        top: 10,
        bottom: 10
      },
      labelAxis: d3.axisLeft(),
      labelAxisWidth: 120,
      labelAxisMargin: 0,
      labelMinScale: 0.6,
      labelScale: d3.scaleBand().padding(0.1),
      valueScale: d3.scaleLinear(),
      labelGetter: d => d.id,
      valueGetter: d => d.value
    }, state), ['selected', 'highlighted']);

    this.addLayer('axes', this.renderAxesLayer);
    this.addLayer('plot', this.renderPlotLayer);

    this.dispatch.on('render', () => {
      this.renderSelected();
      this.renderHighlighted();
    });
  }

  renderSelected() {
    const svg = this.state.svg;
    const state = this.state;
    const selected = state.selected;

    const hasSelection = selected.size;
    svg.attr('class', function () {
      let className = this.className.baseVal;

      if (hasSelection && className.indexOf('has-selection') === -1) {
        className += ' has-selection';
      } else if (!hasSelection && className.indexOf('has-selection') !== -1) {
        className = className.replace(' has-selection', '');
      }

      return className;
    });

    svg.selectAll('g.axes-layer .tick.selected')
      .attr('class', function() {
        return this.className.baseVal.replace(' selected', '');
      });

    svg.selectAll('g.plot-layer .plot-element.selected')
      .attr('class', function() {
        return this.className.baseVal.replace(' selected', '');
      });

    if (hasSelection) {
      svg.selectAll('g.axes-layer .tick')
        .filter(tickId => selected.has(tickId))
        .attr('class', function() {
          return this.className.baseVal + ' selected';
        })

      svg.selectAll('g.plot-layer .plot-element')
        .filter(d => selected.has(d.id))
        .attr('class', function() {
          return this.className.baseVal + ' selected';
        });
    }
  }

  selected (_) {
    if (!arguments.length) return new Set(this.state.selected);
    this.state.selected = _;
    this.renderSelected();
    this.dispatch.call('selected', this, new Set(_));
    return this;
  }

  toggleSelect(id) {
    const selected = this.state.selected;

    if (selected.has(id)) {
      selected.delete(id);
    } else {
      selected.add(id);
    }

    this.dispatch.call('selected', this, new Set(selected));
    this.renderSelected();

    return this;
  }

  renderHighlighted() {
    const svg = this.state.svg;
    const state = this.state;
    const highlighted = state.highlighted;

    svg.selectAll('g.axes-layer .tick.highlighted')
      .attr('class', function() {
        let className = this.className.baseVal;
        return className.replace(' highlighted', '');
      });

    svg.selectAll('g.plot-layer .plot-element.highlighted')
      .attr('class', function() {
        return this.className.baseVal.replace(' highlighted', '');
      });

    if (highlighted !== null) {
      svg.selectAll('g.axes-layer .tick')
        .filter(tickId => tickId === highlighted)
        .attr('class', function() {
          return this.className.baseVal + ' highlighted';
        })

      svg.selectAll('g.plot-layer .plot-element')
        .filter(d => d.id === highlighted)
        .attr('class', function() {
          return this.className.baseVal + ' highlighted';
        });
    }
  }

  highlighted(_) {
    if (!arguments.length) return new this.state.highlighted;
    this.state.highlighted = _;
    this.renderHighlighted();
    this.dispatch.call('highlighted', this, _);
    return this;
  }

  get plotAreaHeight() {
    const state = this.state;
    const padding = state.padding;
    return state.height - padding.top - padding.bottom;
  }

  get plotAreaWidth() {
    const state = this.state;
    const padding = state.padding;
    return state.width - padding.right - padding.left - state.labelAxisWidth - state.labelAxisMargin;
  }

  get plotAreaLeft() {
    const state = this.state;
    const padding = state.padding;
    return padding.left + state.labelAxisWidth + state.labelAxisMargin;
  }

  get plotAreaTop() {
    return this.state.padding.top;
  }

  data(_) {
    if (!arguments.length) return this.state.data;
    this.state.data = _;
    return this;
  }

  renderAxesLayer(layer) {
    const state = this.state;
    const data = state.data;
    const padding = state.padding;
    const labelAxisWidth = state.labelAxisWidth;
    const labelAxisRight = padding.left + labelAxisWidth;
    const labelAxisTop = padding.top;
    layer.attr('transform', `translate(${ labelAxisRight }, ${ labelAxisTop })`);

    layer.selectAll('g.y.axis').data([this])
      .enter()
        .append('g').attr('class', 'y axis')
          .append('text').attr('class', 'label')

    const labelGetter = state.labelGetter
    const labelScale = state.labelScale
    const labelAxis = state.labelAxis
    labelScale.range([this.plotAreaHeight, 0]).domain(data.map(labelGetter))
    labelAxis.scale(labelScale)

    const labelAxisMargin = state.labelAxisMargin;
    layer.selectAll('g.y.axis')
      .attr('transform', `translate(${ -1 * labelAxisMargin }, 0)`)
      .call(labelAxis)

    const maxLabelWidth = layer.selectAll('.tick text').nodes().reduce((acc, node) => {
      const nodeWidth = node.getBBox().width
      return Math.max(nodeWidth, acc)
    }, 0)

    const tickWidth = layer.select('.tick line').node().getBBox().width;
    const availableLabelWidth = labelAxisWidth - tickWidth;
    const scaledLabelWidth = availableLabelWidth / maxLabelWidth;
    const scale = Math.max(Math.min(1, scaledLabelWidth), state.labelMinScale);

    layer.selectAll('.tick text')
      .attr('transform', `scale(${ scale })`)
      .on('mouseenter', id => this.highlighted(id))
      .on('mouseleave', () => this.highlighted(null))
      .on('click', id => this.toggleSelect(id));
  }

  renderPlotLayer(layer) {
    const state = this.state;
    const data = state.data;

    layer.attr('transform', `translate(${ this.plotAreaLeft }, ${ this.plotAreaTop })`)
      .attr('height', this.plotAreaHeight)
      .attr('width', this.plotAreaWidth)

    const valueScale = state.valueScale
    const valueGetter = state.valueGetter
    const maxValue = d3.max(data, valueGetter);
    valueScale.range([0, this.plotAreaWidth])
      .domain([0, maxValue])

    const labelGetter = state.labelGetter
    const labelScale = state.labelScale

    const valueMapper = d => valueScale(valueGetter(d))
    const labelMapper = d => labelScale(labelGetter(d))

    const bars = layer.selectAll('.plot-element')
      .data(data, labelGetter)

    const newBars = bars.enter().append('g').attr('class', 'plot-element')

    newBars.append('rect').attr('class', 'plot-value')
    newBars.append('rect').attr('class', 'plot-click-target')
    newBars.append('text').attr('class', 'value-label')

    newBars.merge(bars).select('rect.plot-click-target')
      .attr('height', labelScale.bandwidth())
      .attr('x', 0)
      .attr('y', labelMapper)
      .attr('width', valueScale(maxValue))
      .attr('opacity', 0)
      .on('mouseenter', d => this.highlighted(d.id))
      .on('mouseleave', () => this.highlighted(null))
      .on('click', d => this.toggleSelect(d.id))

    newBars.merge(bars).select('rect.plot-value')
      .attr('height', labelScale.bandwidth())
      .attr('x', 0)
      .attr('y', labelMapper)
      .attr('width', valueMapper)

    newBars.merge(bars).select('text')
      .attr('y', d => labelMapper(d) + labelScale.bandwidth() / 2 + 4)
      .attr('x', d => {
        if (valueMapper(d) > this.plotAreaWidth / 2) {
          return valueMapper(d) - 10
        } else {
          return valueMapper(d) + 3
        }
      })
      .classed('invert-text-color', d => valueMapper(d) > this.plotAreaWidth / 2)
      .attr('text-anchor', d => {
        if (valueMapper(d) > this.plotAreaWidth / 2) {
          return 'end'
        } else {
          return 'start'
        }
      })
      .text(d => valueGetter(d))
      .on('mouseenter', d => this.highlighted(d.id))
      .on('mouseleave', () => this.highlighted(null))
      .on('click', d => this.toggleSelect(d.id))

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
  for (let x = 0; x < 20; x++) {
    data.push({
      id: makeId(20),
      value: Math.floor(Math.random() * 1000)
    })
  }

  const container = document.querySelector('.container')

  const chart = new BarChart()
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
  }, 2000);

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
  }, 2000);
  window.chart = chart;
  window.BarChart = BarChart;
})()
