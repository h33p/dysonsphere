import { initializeConnector } from '@web3-react/core'
import { MetaMask } from '@web3-react/metamask'
import { useEffect, useState } from 'react'

export const [metaMask, hooks] = initializeConnector<MetaMask>((actions) => new MetaMask({ actions }))
const { useChainId, useAccounts, useIsActivating, useIsActive, useProvider, useENSNames } = hooks

export function useMetaMaskConnector() {
  const chainId = useChainId()
  const accounts = useAccounts()
  const isActivating = useIsActivating()

  const isActive = useIsActive()

  const provider = useProvider()
  const ENSNames = useENSNames(provider)

  const [error, setError] = useState(undefined)

  const connector = metaMask

  // attempt to connect eagerly on mount
  useEffect(() => {
    void connector.connectEagerly().catch(() => {
      console.debug('Failed to connect eagerly to metamask')
    })
  }, [connector])

  return { connector, chainId, isActivating, isActive, error, setError, accounts, provider, ENSNames }
}
