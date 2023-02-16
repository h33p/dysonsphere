/* eslint-disable @typescript-eslint/no-var-requires */
import { BigNumber } from '@ethersproject/bignumber'
import type { Web3Provider } from '@ethersproject/providers'
import { Web3ReactHooks } from '@web3-react/core'
import { useTheme } from 'next-themes'
import { useCallback, useEffect, useState } from 'react'

import { useMetaMaskConnector } from '../connectors/metaMask'
import { DUST_ABI, ERC20_ABI, TREASURY_ABI } from '../constants/abis'
import { DYSONSPHERE_ADDR, TREASURY_ADDR, WSTR_ADDR } from '../constants/addrs'
import { DYSONSPHERE_ABI } from '../constants/IDysonSphere'
import { Card } from './Card'

const ethers = require('ethers')
const ob = require('urbit-ob')

interface Star {
  id: number
  patp: string
  costWstr: BigNumber
  feesWstr: BigNumber
}

type SetStars = (stars: Star[]) => void
type UpdateStars = (setStars: SetStars) => Promise<void>

function useStars(provider?: ReturnType<Web3ReactHooks['useProvider']>): [Star[] | undefined, SetStars, UpdateStars] {
  const [stars, setStars] = useState<Star[] | undefined>()

  const updateStars = useCallback(
    async (setStars) => {
      if (provider) {
        const treasury = new ethers.Contract(TREASURY_ADDR, TREASURY_ABI, provider)

        const assets = await treasury.getAllAssets()

        setStars(
          assets
            .slice()
            .reverse()
            .map((id, idx) => {
              return {
                id,
                patp: ob.patp(id),
                costWstr: BigNumber.from(BigInt(1e18)),
                // Explicit 1% additive cost
                feesWstr: BigNumber.from(idx + 1).mul(BigInt(1e16)),
              }
            })
        )
      }
    },
    [provider]
  )

  useEffect(() => {
    if (provider) {
      updateStars(setStars)

      return () => {
        setStars(undefined)
      }
    }
  }, [provider, updateStars])

  return [stars, setStars, updateStars]
}

interface PoolMember {
  stars: number[]
  wstrPooled: BigNumber
}

interface PooledStar {
  star: number
  targetOwner: string
  depth: number
}

type ShopItemClick = (star: Star) => void

interface ShopItemProps {
  idx: number
  star: Star
  gasEstimate: BigNumber
  gasPrice: BigNumber
  click: ShopItemClick
  selected: boolean
  selectedOnChain: boolean
  selectedOnChainByUs: boolean
}

function ShopItem({
  idx,
  star,
  gasEstimate,
  gasPrice,
  selected,
  click,
  selectedOnChain,
  selectedOnChainByUs,
}: ShopItemProps) {
  const gasEstimateText =
    gasEstimate === undefined
      ? ''
      : '+ ' + (gasEstimate ? ethers.utils.formatEther(gasEstimate.mul(gasPrice)) : 'some') + ' ETH gas'

  return (
    <button
      style={{
        display: 'flex',
        width: '90%',
        justifyContent: 'space-between',
        padding: '1rem',
        margin: '1rem',
        overflow: 'auto',
        border: '2px solid',
        borderRadius: '1rem',
        color: selected ? 'green' : selectedOnChainByUs ? 'orange' : selectedOnChain ? 'red' : '',
      }}
      onClick={() => {
        if (!selectedOnChain && !selectedOnChainByUs) click(star)
      }}
    >
      <a style={{ flex: '1%' }}>{idx + 1}</a>
      <b style={{ flex: '30%', textAlign: 'left' }}>{star.patp}</b>
      <a style={{ flex: '50%', textAlign: 'right' }}>
        Individual cost: {ethers.utils.formatEther(star.costWstr.add(star.feesWstr))} WSTR {gasEstimateText}
      </a>
    </button>
  )
}

const driftProtection = BigNumber.from(BigInt(10e15)).mul(5)

type SetNeedUpdateState = (needUpdateState: boolean) => void

interface PoolProps {
  stars: Star[]
  selected: Set<number>
  selfData: PoolMember | undefined
  deposited: BigNumber
  wstrPerStar: BigNumber
  pooledStars: PooledStar[]
  pooledStarSet: Set<number>
  ourMissingStars: number[]
  ourOnChainStars: Set<number>
  setNeedUpdateState: SetNeedUpdateState
  accounts: string[]
  provider: Web3Provider | undefined
}

function Pool({
  stars,
  selected,
  selfData,
  deposited,
  wstrPerStar,
  pooledStars,
  pooledStarSet,
  ourMissingStars,
  ourOnChainStars,
  setNeedUpdateState,
  accounts,
  provider,
}: PoolProps) {
  const maxFee = stars?.filter((star) => selected.has(star.id)).at(-1)?.feesWstr ?? BigNumber.from(0)
  const starCost =
    stars
      ?.filter((star) => selected.has(star.id))
      .map((star) => star.costWstr)
      .reduce((a, b) => a.add(b), BigNumber.from(0)) ?? BigNumber.from(0)
  const totalCost = maxFee.add(starCost).add(starCost == BigNumber.from(0) ? 0 : driftProtection)

  const kickPool = async () => {
    if (provider && accounts?.length && selfData.wstrPooled.gt(0)) {
      const signer = provider.getSigner(0)
      const dysonSphere = new ethers.Contract(DYSONSPHERE_ADDR, DYSONSPHERE_ABI, signer)

      const { stars, maxDepth } = await dysonSphere.pooledStars()
      await dysonSphere.kickPoolFast(stars, maxDepth)

      setNeedUpdateState(true)
    }
  }

  const addToPool = async () => {
    if (provider && accounts?.length && totalCost.gt(0) && selected?.size) {
      const signer = provider.getSigner(0)
      const dysonSphere = new ethers.Contract(DYSONSPHERE_ADDR, DYSONSPHERE_ABI, signer)
      const wstr = new ethers.Contract(WSTR_ADDR, DUST_ABI, signer)

      const balance = await wstr.balanceOf(accounts[0])
      const allowance = await wstr.allowance(accounts[0], DYSONSPHERE_ADDR)

      if (balance.lt(totalCost)) {
        console.log('Total balance not enough! ' + balance + ' < ' + totalCost)
        return
      }

      // Approve extra
      if (allowance.lt(totalCost)) {
        await wstr.approve(DYSONSPHERE_ADDR, totalCost)
      }
      await dysonSphere.enterPool(totalCost, Array.from(selected))

      setNeedUpdateState(true)
    }
  }

  const buyIndividually = async () => {
    if (provider && accounts?.length && totalCost.gt(0) && selected?.size) {
      const signer = provider.getSigner(0)
      const dysonSphere = new ethers.Contract(DYSONSPHERE_ADDR, DYSONSPHERE_ABI, signer)
      const wstr = new ethers.Contract(WSTR_ADDR, DUST_ABI, signer)

      const balance = wstr.balanceOf(accounts[0])
      const allowance = await wstr.allowance(accounts[0], DYSONSPHERE_ADDR)

      if (balance.lt(totalCost)) {
        console.log('Total balance not enough! ' + balance + ' < ' + totalCost)
        return
      }

      // Approve extra
      if (allowance.lt(totalCost)) {
        await wstr.approve(DYSONSPHERE_ADDR, totalCost)
      }

      const selectedArr = stars
        ?.map((star, idx) => {
          return {
            star: star.id,
            targetOwner: accounts[0],
            depth: idx + 1,
          }
        })
        .filter((star) => selected.has(star.star))

      const maxDepth = selectedArr.at(-1).depth
      await dysonSphere.buyIndividually(totalCost, selectedArr, maxDepth)

      setNeedUpdateState(true)
    }
  }

  const leavePool = async () => {
    if (provider && accounts?.length && (selfData?.wstrPooled ?? BigNumber.from(0)).gt(0)) {
      const dysonSphere = new ethers.Contract(DYSONSPHERE_ADDR, DYSONSPHERE_ABI, provider.getSigner(0))
      await dysonSphere.exitPool()

      setNeedUpdateState(true)
    }
  }

  const yourPosition = (selfData?.wstrPooled ?? BigNumber.from(0)).gte(BigNumber.from(0)) ? (
    <>
      <a>WSTR deposited: {ethers.utils.formatEther(selfData?.wstrPooled ?? BigNumber.from(0))} WSTR</a>
      <a>Stars selected on-chain:</a>
      {ourMissingStars?.map((star) => (
        <i key={star} style={{ color: 'red' }}>
          {ob.patp(star)} (not in the treasury)
        </i>
      ))}
      {stars
        ?.filter((star) => ourOnChainStars.has(star.id))
        .map((star) => (
          <i key={star.id}>{star.patp}</i>
        ))}
      <button onClick={leavePool}>Exit pool</button>
    </>
  ) : (
    <a>Not in pool</a>
  )

  return (
    <div>
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
        <b>Global pool state:</b>
        <a>Users: {new Set(pooledStars.map((star) => star.targetOwner)).size}</a>
        <a>WSTR deposited: {ethers.utils.formatEther(deposited ?? BigNumber.from(0))} WSTR</a>
        <a>WSTR to pay per star: {ethers.utils.formatEther(wstrPerStar ?? BigNumber.from(0))} WSTR</a>
        <a>
          WSTR surplus:{' '}
          {ethers.utils.formatEther(
            (deposited ?? BigNumber.from(0)).sub((wstrPerStar ?? BigNumber.from(0)).mul(pooledStars?.length ?? 0))
          )}
        </a>
        <a>Stars selected on-chain: ({pooledStars?.length})</a>
        {stars
          ?.filter((star) => pooledStarSet.has(star.id))
          .map((star) => (
            <i key={star.id}>{star.patp}</i>
          ))}
        <button onClick={kickPool}>Kick pool</button>
      </div>
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
        <b>Your position:</b>
        {yourPosition}
      </div>
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
        <b>Current selection:</b>
        <a>Stars selected:</a>
        {stars
          ?.filter((star) => selected.has(star.id))
          .map((star) => (
            <i key={star.id}>{star.patp}</i>
          ))}
        <a>Max extraction fee: {ethers.utils.formatEther(maxFee)}</a>
        <a>Drift protection: {ethers.utils.formatEther(driftProtection)}</a>
        <a>Star cost: {ethers.utils.formatEther(starCost)}</a>
        <a>To deposit: {ethers.utils.formatEther(totalCost)}</a>
        <button onClick={buyIndividually}>Buy now</button>
        <button onClick={addToPool}>Deposit to pool</button>
      </div>
    </div>
  )
}

export default function Page() {
  const { connector, chainId, isActivating, isActive, error, setError, accounts, provider, ENSNames } =
    useMetaMaskConnector()

  const [stars, setStars, updateStars] = useStars(provider)
  const starsInTreasury = new Set(stars?.map((star) => star.id) ?? [])

  const [selected, setSelected] = useState<Set<number>>(new Set())

  const [gasPrice, setGasPrice] = useState<BigNumber>(BigNumber.from(19).mul(BigInt(10e8)))

  const [needUpdateState, setNeedUpdateState] = useState<boolean>(true)
  const [stateUpdating, setStateUpdating] = useState<boolean>(false)

  // Self state
  const [selfData, setSelfData] = useState<PoolMember | undefined>()

  const ourMissingStars = selfData?.stars.filter((star) => !starsInTreasury.has(star))
  const ourOnChainStars = new Set(selfData?.stars)

  // Pool state
  const [pooledStars, setPooledStars] = useState<PooledStar[]>([])
  const [deposited, setDeposited] = useState<BigNumber | undefined>()
  const [wstrPerStar, setWstrPerStar] = useState<BigNumber | undefined>()
  const pooledStarSet = new Set(pooledStars.map((star) => star.star))

  // Deselect stars that have been pooled
  const starsToDeselect = new Set(Array.from(pooledStarSet).filter((star) => selected.has(star)))

  if (starsToDeselect.size) {
    const newSelected = new Set(Array.from(selected).filter((star) => !starsToDeselect.has(star)))
    setSelected(newSelected)
  }

  // Per-depth gas estimation
  const [gasEstimate, setGasEstimate] = useState<BigNumber[]>([])
  const [doGasEstimate, setDoGasEstimate] = useState<boolean>(false)
  const [estimatingGas, setEstimatingGas] = useState<boolean>(false)

  useEffect(() => {
    const estimateGas = async (_stars, _doGasEstimate, forceAllowance) => {
      if (estimatingGas) return

      if (!_doGasEstimate || !provider || !accounts?.length) return

      const wstr = new ethers.Contract(WSTR_ADDR, DUST_ABI, provider)

      const balance = await wstr.balanceOf(accounts[0])
      const allowance = await wstr.allowance(accounts[0], DYSONSPHERE_ADDR)

      if (
        !_stars?.length ||
        gasEstimate.length >= _stars.length ||
        !(gasEstimate.length == 0 || gasEstimate[gasEstimate.length - 1].lte(BigNumber.from(30e6)))
      )
        return

      const maxFee = _stars[gasEstimate.length].feesWstr
      const starCost = _stars[gasEstimate.length].costWstr
      const totalCost = maxFee.add(starCost).add(BigNumber.from(driftProtection))

      if (BigNumber.from(balance).lt(totalCost) || (allowance.lt(totalCost) && !forceAllowance)) return

      // Second return point in case the other one fails
      if (estimatingGas) return

      setEstimatingGas(true)

      const signer = provider.getSigner(0)
      const dysonSphere = new ethers.Contract(DYSONSPHERE_ADDR, DYSONSPHERE_ABI, signer)

      const { stars } = await dysonSphere.pooledStars()

      const starsLeft = []
      const starsRight = []

      stars.forEach((star) => {
        if (star.depth <= gasEstimate.length + 1) {
          starsLeft.push(star)
        } else {
          starsRight.push(star)
        }
      })

      if (starsLeft.length == 0 || starsLeft[starsLeft.length - 1].depth != gasEstimate.length + 1) {
        starsLeft.push({
          star: _stars[gasEstimate.length].id,
          targetOwner: '0x0000000000000000000000000000000000000000',
          depth: BigNumber.from(gasEstimate.length + 1),
        })
      }

      const newStars = starsLeft.concat(starsRight)

      console.log('Run estimation', gasEstimate.length)

      if (gasEstimate.length + 1 != newStars[newStars.length - 1].depth) {
        // Push zero estimate if there is a member in pool
        const newGasEstimate = gasEstimate.slice()
        newGasEstimate.push(BigNumber.from(0))
        setGasEstimate(newGasEstimate)
      } else {
        try {
          const gas = await dysonSphere.estimateGas.enterPoolAndKick(
            totalCost,
            newStars,
            BigNumber.from(gasEstimate.length + 1)
          )

          console.log(gasEstimate.length, 'Gas estimate:', BigNumber.from(gas))

          const newGasEstimate = gasEstimate.slice()
          newGasEstimate.push(gas)
          setGasEstimate(newGasEstimate)
        } catch (e) {
          console.log(e)
        }
      }

      setEstimatingGas(false)
    }

    estimateGas(stars, doGasEstimate, false)
  }, [gasEstimate, doGasEstimate, estimatingGas, provider, stars, accounts])

  const allowLargeSpendingLimit = async () => {
    if (provider && accounts?.length) {
      const signer = provider.getSigner(0)
      const wstr = new ethers.Contract(WSTR_ADDR, ERC20_ABI, signer)

      // 10000 wstr
      await wstr.approve(DYSONSPHERE_ADDR, BigNumber.from(BigInt(10e21)))

      setNeedUpdateState(true)
    }
  }

  // Intentionally not put deposited as a dependency, because deposited is being set by one of the state updates
  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    const loadGasPrice = async (setGasPrice) => {
      if (provider) {
        const newGasPrice: BigNumber = await provider.getGasPrice()
        setGasPrice(BigNumber.from(newGasPrice))
      }
    }

    const loadBalance = async () => {
      if (provider) {
        const wstr = new ethers.Contract(WSTR_ADDR, ERC20_ABI, provider)
        const balance = await wstr.balanceOf(DYSONSPHERE_ADDR)
        setDeposited(BigNumber.from(balance))
      }
    }

    const loadAccount = async () => {
      if (provider && accounts?.length) {
        const dysonSphere = new ethers.Contract(DYSONSPHERE_ADDR, DYSONSPHERE_ABI, provider)
        const ret = await dysonSphere.poolMember(accounts[0])
        setSelfData(ret)
      }
    }

    const updatePooledStars = async (setPooledStars, setWstrPerStar) => {
      if (provider) {
        const dysonSphere = new ethers.Contract(DYSONSPHERE_ADDR, DYSONSPHERE_ABI, provider)
        const { stars, maxDepth } = await dysonSphere.pooledStars()

        // Calculate WSTR cost per star
        const wstrNeeded = BigNumber.from(maxDepth)
          .mul(BigNumber.from(BigInt(1e18)))
          .sub(deposited ?? BigNumber.from(0))
        const toFlash = wstrNeeded.gt(BigNumber.from(0)) ? wstrNeeded : BigNumber.from(0)
        const fees = toFlash.div(BigNumber.from(1000))

        setWstrPerStar(BigNumber.from(BigInt(1e18)).add(fees))

        setPooledStars(stars)
      }
    }

    let stale = false

    const updateState = async () => {
      setStateUpdating(true)
      await Promise.all([
        updateStars(setStars),
        loadGasPrice(setGasPrice),
        loadBalance(),
        loadAccount(),
        updatePooledStars(setPooledStars, setWstrPerStar),
      ])
      setStateUpdating(false)
      setNeedUpdateState(false)
      if (stale) setNeedUpdateState(true)
    }

    updateState()

    return () => {
      stale = true
    }
  }, [provider, accounts, needUpdateState, setStars, updateStars])

  useEffect(() => {
    const id = setInterval(async () => {
      if (!stateUpdating) setNeedUpdateState(true)
    }, 5000)
    return () => clearInterval(id)
  }, [provider, accounts, stateUpdating])

  const starClick = (star) => {
    const newSelected = new Set(selected)

    if (selected.has(star.id)) {
      newSelected.delete(star.id)
    } else {
      newSelected.add(star.id)
    }

    setSelected(newSelected)
  }

  const rows = []

  stars?.forEach((star, idx) =>
    rows.push(
      <ShopItem
        key={star.id}
        idx={idx}
        star={star}
        gasEstimate={gasEstimate.length > idx ? gasEstimate[idx] : undefined}
        gasPrice={gasPrice}
        selected={selected.has(star.id)}
        selectedOnChain={pooledStarSet.has(star.id)}
        selectedOnChainByUs={ourOnChainStars.has(star.id)}
        click={starClick}
      />
    )
  )

  console.log('Redraw')

  const { theme, setTheme } = useTheme()

  return (
    <div style={{ display: 'flex', flexFlow: 'wrap', fontFamily: 'sans-serif' }}>
      <div style={{ flex: 0.6, alignItems: 'center' }}>
        <div
          style={{
            display: 'flex',
            width: '90%',
            justifyContent: 'space-between',
            padding: '1rem',
            margin: '1rem',
            overflow: 'auto',
            borderRadius: '1rem',
          }}
        >
          <div>
            <h1>DysonSphere</h1>
            <h4>
              <i>Hoover up 100% of the stardust energy.</i>
            </h4>
            <h4>
              <button
                aria-label="Toggle Dark Mode"
                type="button"
                className="p-3 h-12 w-12 order-2 md:order-3"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              >
                Site Theme
              </button>{' '}
              <a href="https://github.com/h33p/dysonsphere">GitHub</a>
            </h4>

            <a>DysonSphere is a dapp allowing users to pick and choose stars on the </a>
            <a href="https://star.market">star market</a>
            <a>
              {' '}
              at relatively low prices. There are 2 modes: individual and collective (pool). The collective approach is
              cheaper, but not robust with large amount of users, so use it at your own risk!
            </a>
            <br />
            <br />
            <a>Individual flow:</a>
            <br />
            <br />
            <a>1. Select a number of stars to buy.</a>
            <br />
            <a>2. Buy the stars. Shown amount of WSTR will be deposited to the contract.</a>
            <br />
            <a>
              3. The contract will perform Uniswap flash swap, take as many stars as needed from star treasury, send
              them to you, return the rest back to treasury.
            </a>
            <br />
            <a>
              4. The contract will pay back Uniswap fees from deposited funds, and pay unused WSTR back to you. 0.01
              WSTR per star is kept by the contract as a fee.
            </a>
            <br />
            <br />
            <br />
            <a>Collective flow:</a>
            <br />
            <br />
            <a>1. Select a number of stars to buy.</a>
            <br />
            <a>2. Make a claim with a transaction. Shown amount of WSTR will be deposited to the contract.</a>
            <br />
            <a>3. At any point, &quot;kick&quot; the pool to make the contract actually go and buy the stars.</a>
            <br />
            <a>
              4. The contract will perform Uniswap flash swap, take as many stars as needed from star treasury, send
              them to pool members, return the rest.
            </a>
            <br />
            <a>
              5. The contract will pay back Uniswap fees from deposited funds, and pay unused WSTR back to users. 0.01
              WSTR per star is kept by the contract as a fee.
            </a>
            <br />
            <a>6. Remaining WSTR will be sent to the fee collector address.</a>
            <br />
            <br />
            <br />
            <a>Pool risks:</a>
            <br />
            <br />
            <a>
              1. If any of your chosen stars becomes unavailable, users may forcefully kick you out of the pool with a
              penalty of 0.2 WSTR applied (0.15 is sent to the kicker, 0.05 is kept by the contract).
            </a>
            <br />
            <br />
            <a>
              2. If your funds become insufficient to cover for the stars chosen (too large number of new stars is added
              to the stardust treasury), users may choose to kick you out as well.
            </a>
            <br />
            <br />
            <i>
              Note that 1. blocks the whole pool and is more likely to happen than 2., because both actions use up
              around 3 million gas, and 2. case is a pessimistic case that does not imply that the pool as a whole would
              fail. The more members have pooled up together, the cheaper it becomes to buy a star. See WSTR surplus in
              the global pool to see the leeway. In addition, you may leave the pool at any point without penalty.
            </i>
            <br />
            <br />
            <a>
              3. Taking N-th star from the treasury has complexity in the order of O(N), thus only top ~50 stars in the
              treasury are available for grabs. Picking a star that is too deep can result in blocking the whole pool.
            </a>
            <br />
            <br />
            <a>
              4. Fee collector address is authorized to kick you out of the pool without reason. No penalties are
              applied.
            </a>
            <br />
          </div>
        </div>
        <div>{rows}</div>
      </div>
      <div style={{ flex: 0.01 }}>
        <Card
          connector={connector}
          chainId={chainId}
          isActivating={isActivating}
          isActive={isActive}
          error={error}
          setError={setError}
          accounts={accounts}
          provider={provider}
          ENSNames={ENSNames}
        />
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
          <b>Detailed gas estimation:</b>
          <a>Current gas price: {ethers.utils.formatUnits(gasPrice, 'gwei')}</a>
          <button onClick={allowLargeSpendingLimit}>Allow WSTR spending</button>
          <button onClick={() => setDoGasEstimate(!doGasEstimate)}>
            {doGasEstimate ? 'Disable' : 'Enable'} gas estimation
          </button>
        </div>
        <Pool
          stars={stars}
          selected={selected}
          deposited={deposited}
          wstrPerStar={wstrPerStar}
          selfData={selfData}
          ourOnChainStars={ourOnChainStars}
          ourMissingStars={ourMissingStars}
          setNeedUpdateState={setNeedUpdateState}
          pooledStars={pooledStars}
          pooledStarSet={pooledStarSet}
          accounts={accounts}
          provider={provider}
        />
      </div>
    </div>
  )
}
