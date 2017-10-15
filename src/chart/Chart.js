import * as d3 from 'd3'
import { createStore } from 'redux'
import chartReducer from './reducer'

function chainReducers(first, second) {
  return (state, action) => {
    return second(first(state, action), action)
  }
}

const identityReducer = state => state;

class Chart {
  constructor(reducer) {
    if (!reducer) reducer = identityReducer
    const store = createStore(chainReducers(chartReducer, reducer))

    this.getState = () => store.getState()
    this.dispatch = action => store.dispatch(action)
  }

  container(container) {
    if (!arguments.length) return this.getState().container

    this.dispatch({
      type: 'set container',
      container: container
    })
  }

  get height() {
    return this.getState().height
  }

  get width() {
    return this.getState().width
  }

  size(width, height) {
    this.dispatch(chartReducer.action.updateSize(width, height))
  }

  data(data) {
    if (!arguments.length) return this.getState().data

    this.dispatch({
      type: 'update data',
      data: data
    })
  }
}

export default Chart
