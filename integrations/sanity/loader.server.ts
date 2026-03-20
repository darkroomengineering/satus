import { loadQuery, setServerClient } from '@sanity/react-loader'
import { serverClient } from './client.server'

setServerClient(serverClient)

export { loadQuery }
