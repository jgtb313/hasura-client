import { get, isString, isPlainObject } from 'lodash'
import axios from 'axios'

import config from './config'

const useReturning = (action) => {
  const actions = ['insert', 'update', 'delete']
  return actions.includes(action)
}

const mountParameters = (value = {}, callback) => Object.entries(value).reduce((result, [key, value]) => ([
  result,
  callback({ key, value }),
]).join(''), '').slice(0, -2)

const makeRequest = async ({ query, variables }) => {
  const { data } = await axios.request(config.state.baseURL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      [config.state.authorization.key]: config.state.authorization.value
    },
    data: JSON.stringify({
      query,
      variables,
    }),
  })

  if (data.errors) {
    throw new Error(data.errors[0].message)
  }

  return data.data
}

const makeActionName = ({ module, action }) => (({
  find: module,
  findByPk: `${module}_by_pk`,
  insert: `insert_${module}`,
  insertOne: `insert_${module}_one`,
  update: `update_${module}`,
  updateByPk: `update_${module}_by_pk`,
  delete: `delete_${module}`,
  deleteByPk: `delete_${module}_by_pk`
})[action] || action)

const makeParameters = ({ module, variables }) => {
  const parameters = {
    id: 'uuid!',
    pk_columns: `${module}_pk_columns_input!`,
    object: `${module}_insert_input!`,
    objects: `[${module}_insert_input!]!`,
    where: `${module}_bool_exp!`,
    _set: `${module}_set_input!`,
    _append: `${module}_append_input!`,
    _inc: `${module}_inc_input!`,
    order_by: `[${module}_order_by!]`,
    limit: 'Int!',
    offset: 'Int!'
  }

  const parametersKeys = mountParameters(variables, ({ key }) => `$${key}${module.toUpperCase()}: ${parameters[key]}, `)
  const parametersValues = mountParameters(variables, ({ key }) => `${key}: $${key}${module.toUpperCase()}, `)

  return {
    parametersKeys: parametersKeys ? `(${parametersKeys})` : '',
    parametersValues: parametersValues ? `(${parametersValues})` : ''
  }
}

const makeVariables = ({ module, variables }) => Object.fromEntries(
  Object
    .entries(variables)
    .map(([key, value]) => ([`${key}${module.toUpperCase()}`, value]))
)

const makePath = (value) => {
  const [field, ...paths] = value.split('.')

  if (!paths.length) {
    return field
  }

  const path = paths.join('.')

  return `${field}(path: "${path}")`
}

const makeReturning = ({ action, select }) => {
  const returning = (props) => {
    const fields = Object.entries(props).filter(([key, value]) => key !== 'nested' && !!value)

    return fields.reduce((result, [key, value], index) => {
      const isNested = value.hasOwnProperty('nested')
      const isPath = isString(value)
      const isObject = isPlainObject(value)
      const isLast = fields.length === index + 1

      const nestedParameters = `(${mountParameters(value.nested, ({ key, value }) => `${key}: ${value}, `)})`

      const keyFormat = !isObject && isLast
        ? isPath ? `${key}: ${makePath(value)}` : isNested ? `${key}${nestedParameters}` : key
        : isPath ? `${key}: ${makePath(value)} ` : isNested ? `${key}${nestedParameters} ` : `${key} `

      return [
        result,
        isObject ? keyFormat : '',
        isObject ? returning(value) : keyFormat,
      ].join('')
    }, '{ ').concat(' }')
  }

  return useReturning(action)
    ? `{ returning ${returning(select)} }`
    : returning(select)
}

const makeQuery = (module) => (method) => (action) => ({ select = { id: 1 }, ...variables } = {}, { queryOnly = false } = {}) => {
  const params = {
    module,
    method,
    action,
    select,
    variables
  }

  const handler = queryOnly
    ? multiQuery
    : singleQuery

  return handler(params)
}

const singleQuery = async ({ module, method, action, select, variables }) => {
  const actionName = makeActionName({ module, action })
  const { parametersKeys, parametersValues } = makeParameters({ module, variables })
  const returning = makeReturning({ action, select })

  const query = `
    ${method} Query${parametersKeys} {
      ${actionName}${parametersValues}${returning}
    }
  `

  console.log(query)

  const data = await makeRequest({
    query,
    variables: makeVariables({ module, variables })
  })

  const key = useReturning(action)
    ? `${actionName}.returning`
    : actionName

  return get(data, key)
}

const multiQuery = ({ module, method, action, select, variables }) => {
  const actionName = makeActionName({ module, action })
  const { parametersKeys, parametersValues } = makeParameters({ module, variables })
  const returning = makeReturning({ action, select })

  const query = `${actionName}${parametersValues}${returning}`

  const makeTemplate = ({ query, parametersKeys }) => `
    ${method} Query${parametersKeys} {
      ${query}
    }
  `

  const key = useReturning(action)
    ? `${actionName}.returning`
    : actionName

  return {
    module,
    parametersKeys,
    query,
    variables,
    key,
    makeTemplate
  }
}

const singleQueryOne = async ({ handler, props, options }) => {
  const [response] = await handler(props, options)
  return response
}

const multiQueryOne = ({ handler, props, options }) => handler(props, options)

const makeRepository = (module) => {             
  const moduleQuery = makeQuery(module)

  const query = moduleQuery('query')
  const mutation = moduleQuery('mutation')

  const find = query('find')
  const findOne = (props, options) => options.queryOnly
    ? multiQueryOne({ handler: find, props, options })
    : singleQueryOne({ handler: find, props, options })

  const update = mutation('update')
  const updateOne = (props, options) => options.queryOnly
    ? multiQueryOne({ handler: update, props, options })
    : singleQueryOne({ handler: update, props, options })

  const asDelete = mutation('delete')
  const deleteOne = (props, options) => options.queryOnly
    ? multiQueryOne({ handler: asDelete, props, options })
    : singleQueryOne({ handler: asDelete, props, options })

  return {
    module,
    query,
    mutation,
    find,
    findOne,
    findByPk: query('findByPk'),
    insert: mutation('insert'),
    insertOne: mutation('insertOne'),
    update,
    updateOne,
    updateByPk: mutation('updateByPk'),
    delete: asDelete,
    deleteOne,
    deleteByPk: mutation('deleteByPk')
  }
}

makeRepository.makeService = ({ module, query, mutation, ...service }) => {
  config.addService({ module, service })
  
  return service
}

export {
  makeVariables,
  makeRequest
}

export default makeRepository
