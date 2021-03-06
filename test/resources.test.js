import { isArray, isUndefined } from 'lodash'

import hasuraClient from '../src'

const BASE_URL = 'https://fresh-pelican-11.hasura.app/v1/graphql'
const AUTHORIZATION = 'x-hasura-admin-secret'
const TOKEN = '4O7QePPK7ZnsPsGdIfgy2fvXEmnOVg90RBMeRjuW8oWJj71oMvu4pgAics8Nb2Eq'

const makeClient = () => {
  const User = hasuraClient.repository('user')
  const Address = hasuraClient.repository('address')

  const client = hasuraClient.register({
    User,
    Address
  })

  const config = {
    baseURL: BASE_URL,
    authorization: AUTHORIZATION,
    token: TOKEN
  }

  client.configure({
    baseURL: config.baseURL,
    authorization: config.authorization
  })

  client.authenticate(config.token)

  return client
}

const clearDatabase = async () => {
  const client = makeClient()

  await client.user.delete({ where: {} })
  await client.address.delete({ where: {} })
}

jest.setTimeout(90000)

beforeEach(async () => {
  await clearDatabase()
})

test('find must return an array', async () => {
  const client = makeClient()

  const users = await client.user.find({})

  console.log(users)

  expect(isArray(users)).toBe(true)
})

test('find:where must return ...', async () => {
  const client = makeClient()
  
  const objects = [
    {
      name: 'ABC'
    },
    {
      name: 'EDF'
    }
  ]

  await client.user.insert({ objects })

  const users = await client.user.find({
    where: {
      name: {
        _eq: 'ABC'
      }
    },
    select: {
      name: true
    }
  })

  const [user] = users

  expect(users.length).toBe(1)
  expect(user.name).toBe('ABC')

  await clearDatabase()
})

test('find:limit;offset must return ...', async () => {
  const client = makeClient()
  
  const objects = [
    {
      name: 'ABC'
    },
    {
      name: 'EDF'
    },
    {
      name: 'ZXC'
    },
    {
      name: 'BNM'
    }
  ]

  await client.user.insert({ objects })

  const users = await client.user.find({
    limit: 2,
    offset: 1,
    select: {
      name: true
    }
  })

  const [EDF, ZXC] = users

  expect(users.length).toBe(2)
  expect(EDF.name).toBe('EDF')
  expect(ZXC.name).toBe('ZXC')
})

test('find:order_by must return ...', async () => {
  const client = makeClient()
  
  const objects = [
    {
      name: 'ZXC'
    },
    {
      name: 'BNM'
    },
    {
      name: 'ABC'
    },
    {
      name: 'VBN'
    }
  ]

  await client.user.insert({ objects })

  const users = await client.user.find({
    order_by: {
      name: 'asc'
    },
    select: {
      name: true
    }
  })
  const [ABC] = users

  expect(ABC.name).toBe('ABC')
})

test('find:select must return only name', async () => {
  const client = makeClient()
  
  const objects = [
    {
      name: 'ABC'
    }
  ]

  await client.user.insert({ objects })

  const users = await client.user.find({
    select: {
      name: true
    }
  })
  const [user] = users

  expect(Object.keys(user)).toStrictEqual(['name'])
})

test('findOne must return ...', async () => {
  const client = makeClient()

  const objects = [
    {
      name: 'ABC'
    },
    {
      name: 'ZXC'
    },
    {
      name: 'QWE'
    }
  ]

  await client.user.insert({ objects })

  const user = await client.user.findOne({
    where: {
      name: {
        _eq: 'ZXC'
      }
    },
    select: {
      name: true
    }
  })
  
  expect(user.name).toBe('ZXC')
})

test('findOne must return an undefined when non-existent', async () => {
  const client = makeClient()

  const user = await client.user.findOne({ where: { name: { _eq: 'non-existent name' } } })

  expect(isUndefined(user)).toBe(true)
})

test('findByPk must return ...', async () => {
  const client = makeClient()

  const object = {
    name: 'ABC'
  }

  const { id } = await client.user.insertOne({ object })

  const user = await client.user.findByPk({ id, select: { name: true } })

  expect(user.name).toBe('ABC')
})

test('findByPk must return an undefined when non-existent', async () => {
  const client = makeClient()

  const user = await client.user.findByPk({ id: '4fe246f1-5dab-4e98-956d-fb43fac768c5' })

  expect(isUndefined(user)).toBe(true)
})

test('insert must return ...', async () => {
  const client = makeClient()

  const objects = [
    {
      name: 'ABC'
    },
    {
      name: 'ZXC'
    }
  ]

  const users = await client.user.insert({
    objects,
    select: {
      name: true
    }
  })

  expect(objects.length).toBe(users.length)
  expect(objects.sort()).toEqual(users.sort())
})

test('insertOne must return ...', async () => {
  const client = makeClient()

  const object = {
    name: 'ABC'
  }
  
  const user = await client.user.insertOne({
    object,
    select: {
      name: true
    }
  })

  expect(object).toStrictEqual(user)
})

test('aggregate must return ...', async () => {
  const client = makeClient()

  const objects = [
    {
      name: 'ABC',
      value: 15
    },
    {
      name: 'ASD',
      value: 5
    },
    {
      name: 'ZXC',
      value: 20
    },
    {
      name: 'BNM',
      value: 30
    }
  ]

  await client.user.insert({ objects })

  const aggregate = await client.user.aggregate({
    aggregate: {
      count: true,
      sum: {
        value: true
      },
      avg: {
        value: true
      }
    }
  })

  expect(aggregate.count).toBe(4)
  expect(aggregate.sum.value).toBe(70)
  expect(aggregate.avg.value).toBe(17.5)
})

test('update must return ...', async () => {
  const client = makeClient()

  const update = {
    value: 30
  }

  const objects = [
    {
      name: '1',
      value: 15
    },
    {
      name: '2',
      value: 5
    },
    {
      name: '3',
      value: 20
    },
    {
      name: '4',
      value: 30
    }
  ]

  await client.user.insert({ objects })

  const users = await client.user.update({
    where: {},
    _set: update,
    select: {
      value: true
    }
  })

  expect(users.map(user => user.value)).toStrictEqual([30, 30, 30, 30])
})

test('update:append must return ...', async () => {
  const client = makeClient()

  const append = {
    fields: {
      email: 'email@example.com'
    }
  }

  const object = {
    name: 'ABC',
    fields: {
      phone: '99999-9999'
    }
  }

  const { id } = await client.user.insertOne({ object })

  const user = await client.user.updateByPk({
    pk_columns: {
      id
    },
    _append: append,
    select: {
      fields: true
    }
  })

  expect(Object.keys(user.fields)).toStrictEqual(['email', 'phone'])
})

test('update:prepend must return ...', async () => {
  const client = makeClient()

  const prepend = {
    fields: {
      name: 'ABC'
    }
  }

  const object = {
    name: 'ABC',
    fields: {
      phone: '99999-9999'
    }
  }

  const { id } = await client.user.insertOne({ object })

  const user = await client.user.updateByPk({
    pk_columns: {
      id
    },
    _prepend: prepend,
    select: {
      fields: true
    }
  })

  expect(Object.keys(user.fields)).toStrictEqual(['name', 'phone'])
})

test('updateOne must return ...', async () => {
  const client = makeClient()

  const update = {
    value: 100
  }

  const objects = [
    {
      name: 'ABC',
      value: 15
    }
  ]

  await client.user.insert({ objects })

  const user = await client.user.updateOne({
    where: {
      name: {
        _eq: 'ABC'
      }
    },
    _set: update,
    select: {
      value: true
    }
  })

  expect(user.value).toBe(100)
})

test('updateOne must return an undefined when non-existent', async () => {
  const client = makeClient()

  const update = {
    name: 'ABC'
  }

  const user = await client.user.updateOne({
    where: {
      name: {
        _eq: 'non-existent name'
      }
    },
    _set: update,
    select: {
      name: true
    }
  })

  expect(isUndefined(user)).toBe(true)
})

test('updateByPk must return ...', async () => {
  const client = makeClient()

  const update = {
    name: 'ZXC'
  }

  const object = {
    name: 'ABC'
  }

  const { id } = await client.user.insertOne({ object })

  const user = await client.user.updateByPk({
    pk_columns: {
      id
    },
    _set: update,
    select: {
      name: true
    }
  })

  expect(update).toStrictEqual(user)
})

test('updateByPk must return an undefined when non-existent', async () => {
  const client = makeClient()

  const update = {
    name: 'ZXC'
  }

  const user = await client.user.updateByPk({
    pk_columns: {
      id: '4fe246f1-5dab-4e98-956d-fb43fac768c5'
    },
    _set: update,
    select: {
      id: true
    }
  })

  expect(isUndefined(user)).toBe(true)
})

test('delete must ...', async () => {
  const client = makeClient()

  const objects = [
    {
      name: 'ABC',
      value: 10
    },
    {
      name: 'ZXC',
      value: 10
    },
    {
      name: 'QWE',
      value: 50
    }
  ]

  await client.user.insert({ objects })

  await client.user.delete({
    where: {
      value: {
        _eq: 10
      }
    }
  })

  const users = await client.user.find({})

  expect(users.length).toBe(1)
})

test('deleteOne must ...', async () => {
  const client = makeClient()

  const objects = [
    {
      name: 'ABC'
    },
    {
      name: 'ZXC'
    },
    {
      name: 'QWE'
    }
  ]

  await client.user.insert({ objects })

  await client.user.delete({
    where: {
      name: {
        _eq: 'ZXC'
      }
    }
  })

  const user = await client.user.findOne({
    where: {
      name: {
        _eq: 'ZXC'
      }
    }
  })

  expect(isUndefined(user)).toBe(true)
})

test('deleteOne must return an undefined when non-existent', async () => {
  const client = makeClient()

  const user = await client.user.deleteOne({
    where: {
      name: {
        _eq: 'non-existent'
      }
    }
  })

  expect(isUndefined(user)).toBe(true)
})

test('deleteByPk must ...', async () => {
  const client = makeClient()

  const objects = [
    {
      name: 'ABC'
    },
    {
      name: 'ZXC'
    },
    {
      name: 'QWE'
    }
  ]

  const [{ id }] = await client.user.insert({ objects })

  const user = await client.user.deleteByPk({
    id,
    select: {
      name: true
    }
  })

  expect(user.name).toBe('ABC')
})

test('deleteByPk must return an undefined when non-existent', async () => {
  const client = makeClient()

  const user = await client.user.deleteByPk({
    id: '4fe246f1-5dab-4e98-956d-fb43fac768c5',
    select: {
      id: true
    }
  })

  expect(isUndefined(user)).toBe(true)
})

test('path ...', async () => {
  const client = makeClient()

  const objects = [
    {
      name: 'ABC',
      fields: {
        email: 'abc@example.com'
      }
    }
  ]

  const [{ id }] = await client.user.insert({ objects })

  const user = await client.user.findByPk({
    id,
    select: {
      email: {
        path: 'fields.email'
      }
    }
  })

  expect(user.email).toBe('abc@example.com')
})

test('renaming ...', async () => {
  const client = makeClient()

  const objects = [
    {
      name: 'ABC'
    }
  ]

  const [{ id }] = await client.user.insert({ objects })

  const user = await client.user.findByPk({
    id,
    select: {
      name: {
        alias: 'nameRenamed'
      }
    }
  })

  expect(user.nameRenamed).toBe('ABC')
})

test('nested ...', async () => {
  const client = makeClient()

  const userObject = {
    name: 'ABC'
  }

  const user = await client.user.insertOne({ object: userObject })

  const addressesObjects = [
    {
      zipcode: '99999-999',
      user_id: user.id
    },
    {
      zipcode: '88888-888',
      user_id: user.id
    }
  ]

  await client.address.insert({ objects: addressesObjects })

  const userWithAddresses = await client.user.findByPk({
    id: user.id,
    select: {
      id: true,
      name: true,
      addresses: {
        nested: {
          where: {
            zipcode: {
              _eq: '99999-999'
            }
          },
          limit: 5
        },
        zipcode: true
      }
    }
  })

  const [address] = userWithAddresses.addresses

  expect(userWithAddresses.addresses.length).toBe(1)
  expect(address.zipcode).toBe('99999-999')
})

test('multi ...', async () => {
  const client = makeClient()

  const objects = [
    {
      name: 'ABC'
    },
    {
      name: 'ZXC'
    }
  ]

  const [{ id }] = await client.user.insert({ objects })

  console.log({ id })

  const [users, user] = await client.multi(
    client.user.find({}, { multi: true }),
    client.user.findByPk({ id, select: { name: true } }, { multi: true })
  )

  console.log({ users, user })

  expect(users.length).toBe(2)
  expect(user.name).toBe('ABC')
})

test('custom ...', async () => {
  const client = makeClient()
  
  const response = await client.custom({
    query: `
      query Query {
        user {
          id
          name
          value
        }
      }
    `
  })

  expect(isArray(response.user)).toBe(true)
})

test('subscription ...', async () => {
  const client = makeClient()

  const objects = [
    {
      name: 'ABC',
      value: 15
    },
    {
      name: 'ZXC',
      value: 50
    }
  ]

  const [{ id }] = await client.user.insert({ objects })
  
  const { query: queryUser } = client.user.find({
    where: {
      name: {
        _eq: 'ZXC'
      }
    }
  }, { subscription: true })

  const { query: queryUserByPk } = client.user.findByPk({
    id,
    select: {
      id: true
    }
  }, { subscription: true })

  const { query: queryAggregate } = client.user.aggregate({
    where: {
      name: {
        _eq: 'ABC'
      }
    },
    aggregate: {
      count: true,
      sum: {
        value: true
      },
      avg: {
        value: true
      }
    }
  }, { subscription: true })

  expect(queryUser.includes('subscription')).toBe(true)
  expect(queryUserByPk.includes('subscription')).toBe(true)
  expect(queryAggregate.includes('subscription')).toBe(true)
})
