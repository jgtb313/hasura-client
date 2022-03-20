import { get } from 'lodash'

import { makeVariables, makeRequest } from './repository'

const multi = async (...queries) => {
  const [template] = queries

  const query = queries.map(({ query = '' }) => query).join(' ')
  const parametersKeys = queries.map(({ parametersKeys = '' }) => parametersKeys.slice(1, -1)).join(', ')

  const multiQuery = template.makeTemplate({ query, parametersKeys: parametersKeys ? `(${parametersKeys})` : '' })
  const multiVariables = queries.reduce((result, { module, variables }) => ({ ...result, ...makeVariables({ module, variables }) }), {})

  const data = await makeRequest({
    query: multiQuery,
    variables: multiVariables
  })

  return Object.keys(data).map((_, index) => {
    const { key } = queries[index]
    
    const value = get(data, key)

    return value === null
      ? undefined
      : value
  }, [])
}

export default multi
