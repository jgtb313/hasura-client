# Hasura Client

## Usage

### Full Example

```
import hasuraClient from 'hasura-client'

const User = hasuraClient.repository('user')
const Address = hasuraClient.repository('address')
const Product = hasuraClient.repository('product')

const client = hasuraClient.register({
  User,
  Address,
  Product
})

client.configure({
  baseURL: '...', // hasura instance
  authorization: 'x-hasura-admin-secret' // authorization key
})

const token = await client.user.login({
  username: '...',
  password: '...'
})

client.authenticate(token) // authorization value

Now you can do:

client.user.find({}) // any option from hasura api
client.user.delete({}) // any option from hasura api
client.address.findOne({}) // any option from hasura api
client.product.updateByPk({}) // any option from hasura api
```

### Configure

```
client.configure({
  baseURL: '...',
  authorization: 'x-hasura-admin-secret'
})
```

### Authenticate

```
const token = await client.user.login({
  username: '...',
  password: '...'
})

client.authenticate(token)
```

### Creating a module

```
const User = client.repository('user') // connect to your user table
```

### Module default options

```
User.find({
  where: {},
  limit: 10,
  offset: 10,
  order_by: {},
  select: {
    id: true
  }
})

User.findOne({
  where: {},
  select: {
    id: true
  }
})

User.findByPk({
  id: '',
  select: {
    id: true
  }
})

User.insert({
  objects: [],
  select: {
    id: true
  }
})

User.insertOne({
  object: {},
  select: {
    id: true
  }
})

User.update({
  where: {},
  _set: {},
  _append: {},
  _prepend: {},
  _inc: {},
  select: {
    id: true
  }
})

User.updateOne({
  where: {},
  _set: {},
  _append: {},
  _prepend: {},
  _inc: {},
  select: {
    id: true
  }
})

User.updateByPk({
  pk_columns: {
    id: ''
  },
  _set: {},
  _append: {},
  _prepend: {},
  _inc: {},
  select: {
    id: true
  }
})

User.delete({
  where: {},
  select: {
    id: true
  }
})

User.deleteOne({
  where: {},
  select: {
    id: true
  }
})

User.deleteByPk({
  id: '',
  select: {
    id: true
  }
})

// only count; sum; avg tested;
User.aggregate({
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
```

### Module additional options

```
User.profile = User.query('profile') // connect to your profile action (query)

User.login = User.mutation('login') // connect to your login action (mutation)
```

### Multi

```
const [userData, addressData] = await client.multi([
  client.user.find({}, { queryOnly: true }),
  client.address.find({}, { queryOnly: true })
])
```

### Path

```
client.user.find({
  select: {
    id: true,
    name: true,
    age: 'fields.age' // equal for fields(path: "age")
  }
}),
```

### Renaming

```
client.user.find({
  select: {
    id: true,
    nameRenamed: 'name'
  }
}),
```

### Custom

```
client.custom({
  query: `
    query Query {
      user {
        id
      }
    }
  `,
  variables: {}
})
```
