import { setState } from './config'

const authenticate = (value) => {
  setState('authorization.value', value)
}

export default authenticate
