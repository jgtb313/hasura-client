import { makeRequest } from './repository'

const custom = ({ query, variables }) => makeRequest({ query, variables })

export default custom
