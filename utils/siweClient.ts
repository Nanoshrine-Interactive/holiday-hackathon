import { configureClientSIWE } from 'connectkit-next-siwe'

export const siweClient = configureClientSIWE({
  apiRoutePrefix: '/api/siwe',
  statement: 'Sign in with Ethereum to use Lens Protocol'
})
