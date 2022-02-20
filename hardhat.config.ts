// hardhat.config.ts

import "dotenv/config"
import "@nomiclabs/hardhat-etherscan"
import "@nomiclabs/hardhat-solhint"
import "@tenderly/hardhat-tenderly"
import "hardhat-abi-exporter"
import "hardhat-deploy"

import "hardhat-gas-reporter"
import "hardhat-spdx-license-identifier"
import "hardhat-watcher"
import "solidity-coverage"

import '@typechain/hardhat'
import '@nomiclabs/hardhat-ethers'
import "@nomiclabs/hardhat-waffle"


import { HardhatUserConfig } from "hardhat/types"
import { removeConsoleLog } from "hardhat-preprocessor"


export const privateKeys = [
  "0xf2f48ee19680706196e2e339e5da3491186e0c4c5030670656b0e0164837257d",
  "0x5d862464fe9303452126c8bc94274b8c5f9874cbd219789b3eb2128075a76f72",
  "0xdf02719c4df8b9b8ac7f551fcb5d9ef48fa27eef7a66453879f4d8fdc6e78fb1",
  "0xff12e391b79415e941a94de3bf3a9aee577aed0731e297d5cfa0b8a1e02fa1d0",
  "0x752dd9cf65e68cfaba7d60225cbdbc1f4729dd5e5507def72815ed0d8abc6249",
  "0xefb595a0178eb79a8df953f87c5148402a224cdf725e88c0146727c6aceadccd",
  "0x83c6d2cc5ddcf9711a6d59b417dc20eb48afd58d45290099e5987e3d768f328f",
  "0xbb2d3f7c9583780a7d3904a2f55d792707c345f21de1bacb2d389934d82796b2",
  "0xb2fd4d29c1390b71b8795ae81196bfd60293adf99f9d32a0aff06288fcdac55f",
];

function getHardhatPrivateKeys() {
  return privateKeys.map(key => {
    const ONE_MILLION_ETH = "1000000000000000000000000";
    return {
      privateKey: key,
      balance: ONE_MILLION_ETH,
    };
  });
}

const config: HardhatUserConfig = {
  abiExporter: {
    path: "./abi",
    clear: false,
    flat: true,
    // only: [],
    // except: []
  },
  defaultNetwork: "hardhat",
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
  gasReporter: {
    coinmarketcap: process.env.COINMARKETCAP_API_KEY,
    currency: "USD",
    enabled: process.env.REPORT_GAS === "true",
    excludeContracts: ["contracts/mocks/", "contracts/libraries/"],
  },
  mocha: {
    timeout: 20000,
  },
  namedAccounts: {
    deployer: {
      default: 0,
    },
    lender: {
      default: 1,
    },
    borrower1: {
      default: 2,
    },
    borrower2: {
      default: 3,
    }
  },
  networks: {
    //mainnet: {
    //  url: `https://mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`,
    //  accounts: [`0x${process.env.PRODUCTION_MAINNET_DEPLOY_PRIVATE_KEY}`],
    //  gasPrice: 73 * 1000000000,
    //  chainId: 1,
    //},
    localhost: {
      live: false,
      saveDeployments: true,
      tags: ["local"],
    },
    // hardhat: {
    //   forking: {
    //     enabled: process.env.FORKING === "true",
    //     url: `https://eth-mainnet.alchemyapi.io/v2/${process.env.ALCHEMY_API_KEY}`,
    //   },
    //   live: false,
    //   saveDeployments: true,
    //   tags: ["test", "local"],
    // },
    hardhat: {
      hardfork: "istanbul",
      accounts: getHardhatPrivateKeys(),
    },
    /*
    ropsten: {
      url: `https://ropsten.infura.io/v3/${process.env.INFURA_API_KEY}`,
      accounts,
      chainId: 3,
      live: true,
      saveDeployments: true,
      tags: ["staging"],
      gasPrice: 5000000000,
      gasMultiplier: 2,
    },
    
    rinkeby: {
      url: `https://rinkeby.infura.io/v3/${process.env.INFURA_API_KEY}`,
      accounts,
      chainId: 4,
      live: true,
      saveDeployments: true,
      tags: ["staging"],
      gasPrice: 5000000000,
      gasMultiplier: 2,
    },
    goerli: {
      url: `https://goerli.infura.io/v3/${process.env.INFURA_API_KEY}`,
      accounts,
      chainId: 5,
      live: true,
      saveDeployments: true,
      tags: ["staging"],
      gasPrice: 5000000000,
      gasMultiplier: 2,
    },*/
    kovan: {
     url: `https://kovan.infura.io/v3/${process.env.INFURA_API_KEY}`,
     accounts: [`0x${process.env.KOVAN_DEPLOY_PRIVATE_KEY}`],
     chainId: 42,
     live: true,
     saveDeployments: true,
     tags: ["staging"],
     gasPrice: 20000000000,
     gasMultiplier: 2,
    },
    /*
    matic: {
      url: "https://rpc-mainnet.maticvigil.com",
      accounts,
      chainId: 137,
      live: true,
      saveDeployments: true,
    },
    mumbai: {
      url: "https://rpc-mumbai.maticvigil.com/",
      accounts,
      chainId: 80001,
      live: true,
      saveDeployments: true,
      tags: ["staging"],
      gasMultiplier: 2,
    },
    avalanche: {
      url: "https://api.avax.network/ext/bc/C/rpc",
      accounts,
      chainId: 43114,
      live: true,
      saveDeployments: true,
      gasPrice: 470000000000,
    },
    arbitrum: {
      url: "https://arb1.arbitrum.io/rpc",
      accounts,
      chainId: 42161,
      live: true,
      saveDeployments: true,
      blockGasLimit: 700000,
    },*/
    "arbitrum-testnet": {
      url: "https://rinkeby.arbitrum.io/rpc",
      accounts: [`0x${process.env.KOVAN_DEPLOY_PRIVATE_KEY}`],
      chainId: 421611,
      live: true,
      saveDeployments: true,
      tags: ["staging"],
      gasMultiplier: 2,
    },
  },
  paths: {
    artifacts: "artifacts",
    cache: "cache",
    deploy: "deploy",
    deployments: "deployments",
    imports: "imports",
    sources: "contracts",
    tests: "test",
  },
  preprocess: {
    eachLine: removeConsoleLog((bre) => bre.network.name !== "hardhat" && bre.network.name !== "localhost"),
  },
  solidity: {
    compilers: [
      {
        version: "0.6.10",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },
  spdxLicenseIdentifier: {
    overwrite: false,
    runOnCompile: true,
  },
  tenderly: {
    project: process.env.TENDERLY_PROJECT!,
    username: process.env.TENDERLY_USERNAME!,
  },
  //typechain: {
  // outDir: "typechain",
  // target: "ethers-v5",
  // externalArtifacts: ["external/**/*.json"],
  //},
  watcher: {
    compile: {
      tasks: ["compile"],
      files: ["./contracts"],
      verbose: true,
    },
  },
}



export default config
