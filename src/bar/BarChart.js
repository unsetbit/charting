import * as d3 from 'd3'

export default class BarChart {
  constructor(container) {
    this.container = container

    this.width = 100
    this.height = 100

    this.leftPadding = 10
    this.topPadding = 10
    this.rightPadding = 10
    this.bottomPadding = 10

    this.yAxis = d3.axisLeft()
    this.yScale = d3.scaleBand().padding(0.1)
    this.xScale = d3.scaleLinear()
    this.yValue = d => d.id
    this.xValue = d => d.value
  }

  data(data) {
    this.data = data
  }

  size(width, height) {
    if (!this.svg) return

    this.width = width
    this.height = height
  }

  padding(left, top, right, bottom) {
    this.leftPadding = left
    this.topPadding = top
    this.rightPadding = right
    this.bottomPadding = bottom
  }

  render() {
    const svgSelection = d3.select(this.container).selectAll('svg').data([this])
    this.svg = svgSelection.enter().append('svg').merge(svgSelection)

    this.svg.attr('width', this.width).attr('height', this.height)

    const axesLayer = this.getLayer('axes-layer')
    axesLayer.attr('transform', `translate(${ this.leftPadding }, ${ this.topPadding })`)

    axesLayer.selectAll('g.y.axis').data([this])
      .enter()
        .append('g').attr('class', 'y axis')
          .append('text').attr('class', 'label')

    const plotAreaHeight = this.height - this.topPadding - this.bottomPadding
    const plotAreaWidth = this.width - this.rightPadding - this.leftPadding

    this.yScale.range([plotAreaHeight, 0]).domain(this.data.map(this.yValue))
    this.yAxis.scale(this.yScale)

    const yAxisMargin = 10
    axesLayer.selectAll('g.y.axis')
      .attr('transform', `translate(${ -1 * yAxisMargin }, 0)`)
      .call(this.yAxis)


    const maxAxisWidth = axesLayer.selectAll('.tick text').nodes().reduce((acc, node) => {
      const nodeWidth = node.getBBox().width
      return Math.max(nodeWidth, acc)
    }, 0)

    const wid = axesLayer.select('g.y.axis').node().getBBox().width
    const nonTextWid = wid - maxAxisWidth;

    const scale = Math.min(1, this.leftPadding / (maxAxisWidth + yAxisMargin + 10))
    console.log('scale', scale)
    axesLayer.selectAll('.tick text').attr('transform', `scale(${ scale })`)


    const plotLayer = this.getLayer('plot-layer')
    plotLayer.attr('transform', `translate(${ this.leftPadding }, ${ this.topPadding })`)
      .attr('height', this.height - this.topPadding - this.bottomPadding)
      .attr('width', this.width - this.leftPadding - this.rightPadding)

    this.xScale.range([0, plotAreaWidth])
      .domain(d3.extent(this.data, this.xValue))

    const xMap = d => this.xScale(this.xValue(d))
    const yMap = d => this.yScale(this.yValue(d))

    const bars = plotLayer.selectAll('.plot-element')
      .data(data, this.yValue)

    const newBars = bars.enter().append('g').attr('class', 'plot-element')

    newBars.append('rect')
    newBars.append('text').attr('class', 'value-label')

    newBars.merge(bars).classed('plot-element-property-muted', d => d.isMuted)

    newBars.merge(bars).select('rect')
      .attr('height', this.yScale.bandwidth())
      .attr('x', 0)
      .attr('y', yMap)
      .attr('width', xMap)
      .on('click', d => console.log('click', d, this))

    newBars.merge(bars).select('text')
      .attr('y', d => yMap(d) + this.yScale.bandwidth() / 2 + 4)
      .attr('x', d => {
        if (xMap(d) > plotAreaWidth / 2) {
          return xMap(d) - 10
        } else {
          return xMap(d) + 3
        }
      })
      .classed('invert-text-color', d => xMap(d) > plotAreaWidth / 2)
      .attr('text-anchor', d => {
        if (xMap(d) > plotAreaWidth / 2) {
          return 'end'
        } else {
          return 'start'
        }
      })
      .text(d => this.xValue(d))

    bars.exit().remove()
  }

  getLayer(className) {
    if (!this.svg) return
    const layerSelection = this.svg.selectAll(`g.layer.${ className }`).data([this])
    return layerSelection.enter()
      .append('g')
      .attr('class', `layer ${ className }`)
      .merge(layerSelection)
  }
}

const makeId = (chars) => {
  let text = '';
  const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for (let i = 0; i < chars; i++)
    text += possible.charAt(Math.floor(Math.random() * possible.length));

  return text;
}

const data = []
for (let x = 0; x < 50; x++) {
  data.push({
    id: makeId(20),
    value: Math.floor(Math.random() * 1000)
  })
}

const container = document.querySelector('.container')
const chart = new BarChart(container)
chart.data(data)
chart.render()
chart.size(500, 500)
chart.render()
chart.padding(100, 10, 10, 20)
chart.render()
