import { get, isPlainObject, omit, isString, first } from 'lodash'
import axios from 'axios'

import { state } from './config'

const isFalsy = (value) => value === false

const withReturning = (action) => {
  const actions = ['insert', 'update', 'delete']
  return actions.includes(action)
}

const withAggregate = (action) => action === 'aggregate'

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

const makeRequest = async ({ query, variables, key, single = false, multi = false, custom = false }) => {
  console.log(query)

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

  const value = data.data

  if (custom) {
    return value
  }

  if (multi) {
    return Object.keys(value).map((_, index) => {
      const { key } = multi[index]
      return makeValue({ data: value, key })
    })
  }

  if (single) {
    return first(
      makeValue({ data: value, key })
    )
  }

  return makeValue({ data: value, key })
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

  const mount = (callback) => Object.entries(variables).reduce((result, [key, value]) => ([
    result,
    callback({ key, value }),
  ]).join(''), '').slice(0, -2)

  const parametersKeys = mount(({ key }) => `$${key}${module.toUpperCase()}: ${parameters[key]}, `)
  const parametersValues = mount(({ key }) => `${key}: $${key}${module.toUpperCase()}, `)

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

const makeMethod = ({ method, subscription }) => subscription ? 'subscription' : method

const makeQuery = (module) => (method) => (action) => ({ select = { id: true }, aggregate, ...variables } = {}, options = {}) => {
  const formattedMethod = makeMethod({ method, subscription: options.subscription })
  const formattedSelect = {
    ...(aggregate ? omit(select, 'id') : select),
    aggregate
  }
  const formattedVariables = makeVariables({ module, variables })
  const actionName = makeActionName({ module, action })
  const { parametersKeys, parametersValues } = makeParameters({ module, variables })
  const returning = makeReturning({ action, select: formattedSelect })
  const key = makeKey({ action, actionName })

  const baseQuery = `${actionName}${parametersValues}${returning}`
  const fullQuery = `
    ${formattedMethod} Query${parametersKeys} {
      ${baseQuery}
    }
  `

  if (options.multi) {
    const make = ({ query, parametersKeys }) => `
      ${method} Query${parametersKeys} {
        ${query}
      }
    `

    return {
      query: baseQuery,
      variables: formattedVariables,
      parametersKeys,
      key,
      make,
      single: options.single
    }
  }

  if (options.subscription || isFalsy(options.execute)) {
    return {
      query: fullQuery,
      variables: formattedVariables
    }
  }

  return makeRequest({
    query: fullQuery,
    variables: formattedVariables,
    key,
    single: options.single
  })
}

const makeRepository = (module) => {             
  const moduleQuery = makeQuery(module)

  const query = moduleQuery('query')
  const mutation = moduleQuery('mutation')

  const find = query('find')
  const findOne = (props, options = {}) => find(props, { ...options, single: true })

  const update = mutation('update')
  const updateOne = (props, options = {}) => update(props, { ...options, single: true })

  const asDelete = mutation('delete')
  const deleteOne = (props, options = {}) => asDelete(props, { ...options, single: true })

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

export { makeRequest }

export default makeRepository
