// Generated using dysonsphere/contract/scripts/gen_abi.js
export const DYSONSPHERE_ABI = [
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'approvedWstr',
        type: 'uint256',
      },
      {
        components: [
          {
            internalType: 'uint16',
            name: 'star',
            type: 'uint16',
          },
          {
            internalType: 'address',
            name: 'targetOwner',
            type: 'address',
          },
          {
            internalType: 'uint256',
            name: 'depth',
            type: 'uint256',
          },
        ],
        internalType: 'struct IDysonSphere.Star[]',
        name: 'stars',
        type: 'tuple[]',
      },
      {
        internalType: 'uint256',
        name: 'maxDepth',
        type: 'uint256',
      },
    ],
    name: 'buyIndividually',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'wstrToPool',
        type: 'uint256',
      },
      {
        internalType: 'uint16[]',
        name: 'stars',
        type: 'uint16[]',
      },
    ],
    name: 'enterPool',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'wstrToPool',
        type: 'uint256',
      },
      {
        components: [
          {
            internalType: 'uint16',
            name: 'star',
            type: 'uint16',
          },
          {
            internalType: 'address',
            name: 'targetOwner',
            type: 'address',
          },
          {
            internalType: 'uint256',
            name: 'depth',
            type: 'uint256',
          },
        ],
        internalType: 'struct IDysonSphere.Star[]',
        name: 'stars',
        type: 'tuple[]',
      },
      {
        internalType: 'uint256',
        name: 'maxDepth',
        type: 'uint256',
      },
    ],
    name: 'enterPoolAndKick',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'exitPool',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'member',
        type: 'address',
      },
    ],
    name: 'kickFromPool',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'member',
        type: 'address',
      },
    ],
    name: 'kickFromPoolOnPenaltyBasis',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        components: [
          {
            internalType: 'uint16',
            name: 'star',
            type: 'uint16',
          },
          {
            internalType: 'address',
            name: 'targetOwner',
            type: 'address',
          },
          {
            internalType: 'uint256',
            name: 'depth',
            type: 'uint256',
          },
        ],
        internalType: 'struct IDysonSphere.Star[]',
        name: 'stars',
        type: 'tuple[]',
      },
      {
        internalType: 'uint256',
        name: 'maxDepth',
        type: 'uint256',
      },
    ],
    name: 'kickPoolFast',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'addr',
        type: 'address',
      },
    ],
    name: 'poolMember',
    outputs: [
      {
        components: [
          {
            internalType: 'uint256',
            name: 'wstrPooled',
            type: 'uint256',
          },
          {
            internalType: 'uint16[]',
            name: 'stars',
            type: 'uint16[]',
          },
        ],
        internalType: 'struct IDysonSphere.PoolMember',
        name: 'member',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'pooledStars',
    outputs: [
      {
        components: [
          {
            internalType: 'uint16',
            name: 'star',
            type: 'uint16',
          },
          {
            internalType: 'address',
            name: 'targetOwner',
            type: 'address',
          },
          {
            internalType: 'uint256',
            name: 'depth',
            type: 'uint256',
          },
        ],
        internalType: 'struct IDysonSphere.Star[]',
        name: 'stars',
        type: 'tuple[]',
      },
      {
        internalType: 'uint256',
        name: 'maxDepth',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
]
