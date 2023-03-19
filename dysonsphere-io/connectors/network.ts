import { initializeConnector } from '@web3-react/core'
import { Network } from '@web3-react/network'
import { useEffect, useState } from 'react'

import { URLS } from '../chains'

export const [network, hooks] = initializeConnector<Network>((actions) => new Network({ actions, urlMap: URLS }))

const { useChainId, useAccounts, useIsActivating, useIsActive, useProvider, useENSNames } = hooks

export function useNetworkConnector() {
  const chainId = useChainId()
  const accounts = useAccounts()
  const isActivating = useIsActivating()

  const isActive = useIsActive()

  const provider = useProvider()
  const ENSNames = useENSNames(provider)

  const [error, setError] = useState(undefined)

  const connector = network

  // attempt to connect eagerly on mount
  useEffect(() => {
    void connector.activate().catch(() => {
      console.debug('Failed to connect to Network')
    })
  }, [connector])

  return { connector, chainId, isActivating, isActive, error, setError, accounts, provider, ENSNames }
}
