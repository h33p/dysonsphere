require("@nomicfoundation/hardhat-toolbox");

require('dotenv').config();

const { API_URL_GOERLI, PRIVATE_KEY_GOERLI, API_URL_FORK, PRIVATE_KEY_FORK, API_URL_MAINNET, PRIVATE_KEY_MAINNET } = process.env;

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.7.6",
    optimizer: {
      enabled: true,
      runs: 100000
    }
  },
  defaultNetwork: "fork",
  networks: {
    hardhat: {
      chainId: 1
    },
    fork: {
      url: API_URL_FORK,
      accounts: [`0x${PRIVATE_KEY_FORK}`],
      timeout: 800000,
      chainId: 1
    },
    /*mainnet: {
      url: API_URL_MAINNET,
      accounts: [`0x${PRIVATE_KEY_MAINNET}`],
    },*/
    goerli: {
      url: API_URL_GOERLI,
      accounts: [`0x${PRIVATE_KEY_GOERLI}`]
    }
  },
};
