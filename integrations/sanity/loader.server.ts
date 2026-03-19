import { loadQuery, setServerClient } from '@sanity/react-loader'
import { serverClient } from './client'

setServerClient(serverClient)

export { loadQuery }
