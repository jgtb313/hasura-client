import { setState } from './config'

const configure = ({ baseURL, authorization = 'Authorization' }) => {
  setState('baseURL', baseURL)
  setState('authorization.key', authorization)
}

export default configure
