import { makeVariables, makeRequest, makeValue } from './repository'

const multi = async (...queries) => {
  const [template] = queries

  const query = queries.map(({ query = '' }) => query).join(' ')
  const parametersKeys = queries.map(({ parametersKeys = '' }) => parametersKeys.slice(1, -1)).join(', ')

  const multiQuery = template.make({ query, parametersKeys: parametersKeys ? `(${parametersKeys})` : '' })
  const multiVariables = queries.reduce((result, { module, variables }) => ({ ...result, ...makeVariables({ module, variables }) }), {})

  const data = await makeRequest({
    query: multiQuery,
    variables: multiVariables
  })

  return Object.keys(data).map((_, index) => {
    const { key } = queries[index]
    const value = makeValue({ data, key })
    return value
  }, [])
}

export default multi
