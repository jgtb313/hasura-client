import { setState } from './config'

const configure = ({ baseURL, authorization = 'Authorization' }) => {
  baseURL && setState('baseURL', baseURL)
  authorization && setState('authorization.key', authorization)
}

export default configure
