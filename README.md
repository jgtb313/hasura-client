# Hasura Client

## Usage

### Full Example

```
import hasuraClient from 'hasura-client'

const User = hasuraClient.repository('user')
 
User.me = User.query('me')
User.login = User.mutation('login')

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

Examples:

client.user.me({}) // options from your action
client.user.login({}) // options from your action
client.user.find({}) // any options from hasura api
client.user.delete({}) // any options from hasura api
client.address.findOne({}) // any options from hasura api
client.product.updateByPk({}) // any options from hasura api
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
const User = hasuraClient.repository('user') // connect to your user table
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

### Subscription

```
const { query, variables } = client.user.find({ ...options }, { subscription: true })
const { query, variables } = client.user.findByPk({ ...options }, { subscription: true })
const { query, variables } = client.user.aggregate({ ...options }, { subscription: true })
```

### Module additional options

```
User.me = User.query('me') // connect to your me action (query)

User.login = User.mutation('login') // connect to your login action (mutation)
```

### Multi

```
const [userData, addressData] = await client.multi([
  client.user.find({}, { multi: true }),
  client.address.find({}, { multi: true })
])
```

### Path

```
client.user.find({
  select: {
    id: true,
    name: true,
    age: {
      path: 'fields.age'
    } // equal for fields(path: "age")
  }
})
```

### Renaming

```
client.user.find({
  select: {
    id: true,
    name: {
      alias: 'nameRenamed'
    }
  }
})
```

### Nested

```
client.user.find({
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
        limit: 5,
        offset: 0
      },
      id: true,
      zipcode: true
    }
  }
})
```

### Execute

```
const { query, variables } = client.user.find({ ...options }, { execute: false })
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
