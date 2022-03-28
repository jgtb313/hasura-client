import { makeRequest } from './repository'

const multi = (...queries) => {
  const [template] = queries

  const query = queries.map(({ query = '' }) => query).join(' ')
  const parametersKeys = queries.map(({ parametersKeys = '' }) => parametersKeys.slice(1, -1)).join(', ')

  const multiQuery = template.make({ query, parametersKeys: parametersKeys ? `(${parametersKeys})` : '' })
  const multiVariables = queries.reduce((result, { variables }) => ({ ...result, ...variables }), {})

  const multi = queries.map(({ key, single }) => ({ key, single }))

  return makeRequest({
    query: multiQuery,
    variables: multiVariables,
    multi
  })
}

export default multi
