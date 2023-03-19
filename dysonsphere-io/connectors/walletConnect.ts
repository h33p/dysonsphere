import { initializeConnector } from '@web3-react/core'
import { WalletConnect } from '@web3-react/walletconnect'
import { useEffect, useState } from 'react'

import { URLS } from '../chains'

export const [walletConnect, hooks] = initializeConnector<WalletConnect>(
  (actions) =>
    new WalletConnect({
      actions,
      options: {
        rpc: URLS,
      },
    })
)
const { useChainId, useAccounts, useIsActivating, useIsActive, useProvider, useENSNames } = hooks

export function useWalletConnectConnector() {
  const chainId = useChainId()
  const accounts = useAccounts()
  const isActivating = useIsActivating()

  const isActive = useIsActive()

  const provider = useProvider()
  const ENSNames = useENSNames(provider)

  const [error, setError] = useState(undefined)

  const connector = walletConnect

  // log URI when available
  /*useEffect(() => {
	connector.events.on(URI_AVAILABLE, (uri: string) => {
      console.log(`uri: ${uri}`)
    })
  }, [])*/

  // attempt to connect eagerly on mount
  useEffect(() => {
    void connector.connectEagerly().catch(() => {
      console.debug('Failed to connect eagerly to WalletConnect')
    })
  }, [connector])

  return { connector, chainId, isActivating, isActive, error, setError, accounts, provider, ENSNames }
}
