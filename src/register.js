import { camelCase, omit } from 'lodash'

import { state } from './config'
import multi from './multi'
import custom from './custom'
import configure from './configure'
import authenticate from './authenticate'

const register = (repositories) => {
  const base = Object.fromEntries(
    Object
      .entries(repositories)
      .reduce((result, [key, value]) => ([
        ...result,
        [camelCase(key), omit(value, 'query', 'mutation')]
      ]), [])
  )

  return {
    ...base,
    state,
    multi,
    custom,
    configure,
    authenticate
  }
}

export default register
