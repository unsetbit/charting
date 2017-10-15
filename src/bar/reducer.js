import * as its from 'its'

const reducer = (oldState = {}, action) => {
  switch (action.type) {
    case updateSizeAction.TYPE:
      const newState = Object.assign({}, oldState)
      return updateSizeHandler.call(newState, action);
    default:
      return oldState
  }
}

const updateSizeHandler = (action) => {
  const width = action.width
  const height = action.height

  its.number(width)
  its.number(height)

  this.width = action.width
  this.height = action.height

  return this
}

const updateSizeAction = (width, height) => {
  return {
    type: updateSizeAction.TYPE,
    width: width,
    height: height
  }
}
updateSizeAction.TYPE = 'UPDATE_SIZE'

reducer.action = {
  updateSize: updateSizeAction
}

export default reducer
