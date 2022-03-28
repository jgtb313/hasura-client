import { find, isArray, isUndefined } from 'lodash'

import hasuraClient from '../src'

const BASE_URL = 'https://example.hasura.app/v1/graphql'
const AUTHORIZATION = 'x-hasura-admin-secret'
const TOKEN = '123123123123'

const REPOSITORY_DEFAULT_METHODS = [
  'query',
  'mutation',
  'find',
  'findOne',
  'findByPk',
  'insert',
  'insertOne',
  'update',
  'updateOne',
  'updateByPk',
  'delete',
  'deleteOne',
  'deleteByPk',
  'aggregate'
]

const CLIENT_DEFAULT_METHODS = [
  'state',
  'multi',
  'custom',
  'configure',
  'authenticate'
]

test('repository must have default methods', async () => {
  const repository = hasuraClient.repository('user')

  const repositoryMethods = Object.keys(repository)

  expect(repositoryMethods.sort()).toEqual(REPOSITORY_DEFAULT_METHODS.sort())
})

test('query must add an method to repository', async () => {
  const User = hasuraClient.repository('user')

  User.login = User.query('login')

  const userMethods = Object.keys(User)

  expect(userMethods.sort()).toEqual(['login', ...REPOSITORY_DEFAULT_METHODS].sort())
})

test('mutation must add an method to repository', async () => {
  const User = hasuraClient.repository('user')

  User.login = User.mutation('login')

  const userMethods = Object.keys(User)

  expect(userMethods.sort()).toEqual(['login', ...REPOSITORY_DEFAULT_METHODS].sort())
})

test('client must have repositories plus default methods', async () => {
  const User = hasuraClient.repository('user')

  const client = hasuraClient.register({ User })

  const clientMethods = Object.keys(client)

  expect(clientMethods.sort()).toEqual(['user', ...CLIENT_DEFAULT_METHODS].sort())
})

test('configure must set baseURL and authorization.key', async () => {
  const User = hasuraClient.repository('user')

  const client = hasuraClient.register({ User })

  const config = {
    baseURL: BASE_URL,
    authorization: AUTHORIZATION
  }

  client.configure({
    baseURL: config.baseURL,
    authorization: config.authorization
  })

  expect(config.baseURL).toEqual(client.state.baseURL)
  expect(config.authorization).toEqual(client.state.authorization.key)
})

test('authenticate must set authorization.value', async () => {
  const User = hasuraClient.repository('user')

  const client = hasuraClient.register({ User })

  const config = {
    token: TOKEN
  }

  client.authenticate(config.token)

  expect(config.token).toEqual(client.state.authorization.value)
})
