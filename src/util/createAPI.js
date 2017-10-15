import { createStore } from 'redux'

console.log(createStore)

export default function createAPI(internal, external) {
  const externalProperties = Object.keys(external)

  internal.externalUpdate = d3.dispatch.apply(d3.dispatch, externalProperties)

  function debug() {
    if (!external.debug) return

    console.log.apply(console, Array.from(arguments))
  }

  const api = {}

  // Add a function to the api object such that every external property has a
  // getter/setter function on the api
  externalProperties.forEach(property => {
    api[property] = _ => {
      // If no arguments provided, treat as a get call
      if (!arguments.length) return external[property]

      // If the update value is the same as current value, disregard
      const oldValue = external[property]
      if (oldValue === _) return

      // update external property state
      external[property] = _

      debug(`${ property } set to ${ _ } (was ${ oldValue })`)

      // call update listeners
      internal.externalUpdate.call(property)
    }
  })

  return api
}
