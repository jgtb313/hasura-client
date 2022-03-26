import { get, isPlainObject, omit, isString } from 'lodash'
import axios from 'axios'

import { state } from './config'

const withReturning = (action) => {
  const actions = ['insert', 'update', 'delete']
  return actions.includes(action)
}

const withAggregate = (action) => action === 'aggregate'

const mountParameters = (value = {}, callback) => Object.entries(value).reduce((result, [key, value]) => ([
  result,
  callback({ key, value }),
]).join(''), '').slice(0, -2)

const makeKey = ({ action, actionName }) => {
  const key = withReturning(action)
    ? `${actionName}.returning`
    : withAggregate(action)
      ? `${actionName}.aggregate`
      : actionName

  return key
}

const makeValue = ({ data, key }) => {
  const value = get(data, key)

  return value === null
    ? undefined
    : value
}

const makeRequest = async ({ query, variables }) => {
  const { data } = await axios.request(state.baseURL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      [state.authorization.key]: state.authorization.value
    },
    data: JSON.stringify({
      query,
      variables,
    })
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
  deleteByPk: `delete_${module}_by_pk`,
  aggregate: `${module}_aggregate`
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
    _prepend: `${module}_prepend_input!`,
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

const makePath = (key, { path: value }) => {
  const [field, ...paths] = value.split('.')

  const path = paths.join('.')

  return {
    key,
    value: `${field}(path: "${path}")`
  }
}

const makeRename = (key, { alias }) => ({
  key: alias,
  value: key
})

const makeReturning = ({ action, select }) => {
  const returning = (props, { parentIsNested = false } = {}) => {
    const fields = Object.entries(props).filter(([key, value]) => key !== 'nested' && !!value)

    return fields.reduce((result, [key, value]) => {
      const isNested = value.hasOwnProperty('nested')
      const isValueObject = isPlainObject(value)
      const isPath = isValueObject && value.hasOwnProperty('path')
      const isRename = isValueObject && value.hasOwnProperty('alias')
      const isObject = isValueObject && !isPath && !isRename
      const isSimple = !isNested && !isValueObject && !isPath && !isRename

      const path = isPath && makePath(key, value)
      const rename = isRename && makeRename(key, value)

      const nestedParameters = isNested && returning(value.nested, { parentIsNested: true })
      const nested = isNested && `(${nestedParameters.substring(2, nestedParameters.length - 2)})`

      let formatted = ''

      if (isPath) {
        formatted = `${path.key}: ${path.value}`
      } else if (isRename) {
        formatted = `${rename.key}: ${rename.value}`
      } else if (isNested) {
        formatted = `${key}${nested}`
      } else if (isSimple) {
        formatted = parentIsNested ? `${key}: ${isString(value) ? `"${value}"` : value}` : `${key} `
      } else if (isObject) {
        formatted = parentIsNested ? `${key}:` : key
      }

      return [
        result,
        isObject ? formatted : '',
        isObject ? returning(value, { parentIsNested }) : formatted,
      ].join('')
    }, '{ ').concat(' }')
  }

  return withReturning(action)
    ? `{ returning ${returning(select)} }`
    : returning(select)
}

const makeQuery = (module) => (method) => (action) => ({ select = { id: true }, aggregate, ...variables } = {}, { queryOnly = false } = {}) => {
  const params = {
    module,
    method,
    action,
    select: {
      ...(aggregate ? omit(select, 'id') : select),
      aggregate
    },
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

  const key = makeKey({ action, actionName })

  const value = makeValue({ data, key })

  return value
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

  const key = makeKey({ action, actionName })

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
  const findOne = (props, options = {}) => options.queryOnly
    ? multiQueryOne({ handler: find, props, options })
    : singleQueryOne({ handler: find, props, options })

  const update = mutation('update')
  const updateOne = (props, options = {}) => options.queryOnly
    ? multiQueryOne({ handler: update, props, options })
    : singleQueryOne({ handler: update, props, options })

  const asDelete = mutation('delete')
  const deleteOne = (props, options = {}) => options.queryOnly
    ? multiQueryOne({ handler: asDelete, props, options })
    : singleQueryOne({ handler: asDelete, props, options })

  const aggregate = query('aggregate')

  return {
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
    deleteByPk: mutation('deleteByPk'),
    aggregate
  }
}

export { makeVariables, makeRequest, makeValue }

export default makeRepository
