import { makeRequest } from './repository'

const custom = ({ query, variables }) => makeRequest({ query, variables, custom: true })

export default custom
