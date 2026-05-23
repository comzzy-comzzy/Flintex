const RPC_URL = process.env.RPC_URL || ''

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: '0.8.24',
    settings: {
      viaIR: true,
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    arcTestnet: {
      url: RPC_URL,
      chainId: 5042002,
      accounts: 'remote',
    },
  },
}
