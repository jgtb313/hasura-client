import { set } from 'lodash'

import state from './state'

const setState = (key, value) => {
  set(state, key, value)
}

export default setState
