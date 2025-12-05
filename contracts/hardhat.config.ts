import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

// ============================================================================
// HARDHAT CONFIGURATION
// ============================================================================
// 
// This config is ready for local development and testing.
// 
// TODO: To deploy to Base Sepolia:
// 1. Create a .env file with your private key:
//    PRIVATE_KEY=your_private_key_here_without_0x_prefix
// 
// 2. Optionally add a custom RPC URL:
//    BASE_SEPOLIA_RPC_URL=https://your-rpc-url
//
// 3. Run: npx hardhat run scripts/deploy.ts --network baseSepolia
// ============================================================================

// Load environment variables if dotenv is available
try {
  require("dotenv").config();
} catch {
  // dotenv not installed, using defaults
}

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    // Local Hardhat network (default for testing)
    hardhat: {
      chainId: 31337,
    },

    // Base Sepolia Testnet
    // TODO: Configure when ready to deploy
    baseSepolia: {
      url: process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org",
      // Only add accounts if PRIVATE_KEY is configured
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 84532,
    },
  },

  // Etherscan verification (optional)
  // TODO: Add BASESCAN_API_KEY to .env for contract verification
  etherscan: {
    apiKey: {
      baseSepolia: process.env.BASESCAN_API_KEY || "",
    },
    customChains: [
      {
        network: "baseSepolia",
        chainId: 84532,
        urls: {
          apiURL: "https://api-sepolia.basescan.org/api",
          browserURL: "https://sepolia.basescan.org",
        },
      },
    ],
  },
};

export default config;
