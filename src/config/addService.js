import setState from './setState'

const addService = ({ module, service }) => {
  setState('services', module, service)
}

export default addService
