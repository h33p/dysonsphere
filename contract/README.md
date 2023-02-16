# DysonSphere contract

This is the core contract of DysonSphere.

Generate ABI for the contract using the following script:

```shell
npx hardhat run scripts/gen_abi.js
```

Deploy the contract:

```shell
npx hardhat run scripts/deploy.js --network <network>
```

You may want to setup an alchemy account and fork the mainnet (put credentials in .env file). Note reading data of forked mainnet is slow, thus first operations with the contract are normal to be slow, until hardhat is able to cache up enough data locally.
