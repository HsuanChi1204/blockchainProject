require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.24",
  networks: {
    // 本地開發網絡
    hardhat: {
      chainId: 31337
    },
    cardona: {
      url: process.env.CARDONA_RPC_URL || "https://rpc.cardona.zkevm-rpc.com",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 2442,
      confirmations: 2,
      gas: 2100000,
      gasPrice: "auto",
      timeout: 60000
    },
    // Polygon Amoy 測試網
    amoy: {
      url: process.env.ALCHEMY_AMOY_URL || "https://rpc.polygon-amoy.g.alchemy.com",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 80002,
      // 確保有足夠的確認區塊
      confirmations: 2,
      // Gas 設置
      gas: 2100000,
      gasPrice: "auto",
      // 網絡設置
      timeout: 60000
    }
  },
  etherscan: {
    apiKey: {
      polygonAmoy: process.env.POLYGONSCAN_API_KEY,
      polygonZkEVMTestnet: process.env.POLYGONSCAN_API_KEY
    },
    customChains: [
      {
        network: "polygonAmoy",
        chainId: 80002,
        urls: {
          apiURL: "https://api-amoy.polygonscan.com/api",
          browserURL: "https://www.oklink.com/amoy"
        }
      },
      {
        network: "polygonZkEVMTestnet",
        chainId: 2442,
        urls: {
          apiURL: "https://api-cardona.polygonscan.com/api",
          browserURL: "https://cardona-zkevm.polygonscan.com"
        }
      }
    ]
  }
};
