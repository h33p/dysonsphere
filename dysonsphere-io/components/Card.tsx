import { CoinbaseWallet } from '@web3-react/coinbase-wallet'
import { Web3ReactHooks } from '@web3-react/core'
import { GnosisSafe } from '@web3-react/gnosis-safe'
import { MetaMask } from '@web3-react/metamask'
import { Network } from '@web3-react/network'
import { WalletConnect } from '@web3-react/walletconnect'

import { Accounts } from './Accounts'
import { Chain } from './Chain'
import { ConnectWithSelect } from './ConnectWithSelect'
import { Status } from './Status'

interface ConnectorReturn {
  connector: MetaMask | WalletConnect | CoinbaseWallet | Network | GnosisSafe
  chainId: ReturnType<Web3ReactHooks['useChainId']>
  isActivating: ReturnType<Web3ReactHooks['useIsActivating']>
  isActive: ReturnType<Web3ReactHooks['useIsActive']>
  error: Error | undefined
  setError: (error: Error | undefined) => void
  ENSNames: ReturnType<Web3ReactHooks['useENSNames']>
  provider?: ReturnType<Web3ReactHooks['useProvider']>
  accounts?: string[]
}

interface ConnectorInfo {
  func: () => ConnectorReturn
  name: string
}

interface Props {
  connectorData: ConnectorReturn
  connectors: ConnectorInfo[]
  connectorId: number
  setConnectorId: (number) => void
}

export function Card({ connectorData, connectors, connectorId, setConnectorId }: Props) {
  const { connector, chainId, isActivating, isActive, error, setError, ENSNames, accounts, provider } = connectorData

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        width: '20rem',
        padding: '1rem',
        margin: '1rem',
        overflow: 'auto',
        border: '1px solid',
        borderRadius: '1rem',
      }}
    >
      <select
        value={connectorId}
        onChange={(event) => {
          setConnectorId(Number(event.target.value))
        }}
      >
        {connectors.map((conn, id) => (
          <option key={id} value={id}>
            {conn.name}
          </option>
        ))}
      </select>

      <div style={{ marginBottom: '1rem' }}>
        <Status isActivating={isActivating} isActive={isActive} error={error} />
      </div>
      <Chain chainId={chainId} />
      <div style={{ marginBottom: '1rem' }}>
        <Accounts accounts={accounts} provider={provider} ENSNames={ENSNames} />
      </div>
      <ConnectWithSelect
        connector={connector}
        chainId={chainId}
        isActivating={isActivating}
        isActive={isActive}
        error={error}
        setError={setError}
      />
    </div>
  )
}
