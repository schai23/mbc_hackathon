import { ethers } from "hardhat";

/**
 * Deployment script for ViewProfile contract
 * 
 * Usage:
 *   Local testing:  npx hardhat run scripts/deploy.ts
 *   Base Sepolia:   npx hardhat run scripts/deploy.ts --network baseSepolia
 * 
 * Before deploying to Base Sepolia:
 * 1. Create a .env file with: PRIVATE_KEY=your_private_key_here
 * 2. Get Base Sepolia ETH from: https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet
 */
async function main() {
    console.log("╔═══════════════════════════════════════════════════════════╗");
    console.log("║            Morning Desk - Contract Deployment             ║");
    console.log("╚═══════════════════════════════════════════════════════════╝\n");

    // Get deployer account
    const signers = await ethers.getSigners();

    // Check if we have a signer (private key configured)
    if (signers.length === 0) {
        console.error("❌ No deployer account found!\n");
        console.error("To deploy to Base Sepolia, you need to:");
        console.error("1. Create a file: contracts/.env");
        console.error("2. Add your private key: PRIVATE_KEY=your_key_here_without_0x");
        console.error("3. Get testnet ETH from: https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet\n");
        console.error("For local testing, run without --network flag:");
        console.error("   npx hardhat run scripts/deploy.ts\n");
        process.exit(1);
    }

    const deployer = signers[0];
    console.log("Deploying with account:", deployer.address);

    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("Account balance:", ethers.formatEther(balance), "ETH\n");

    // Check if this is a testnet with low balance
    if (balance === 0n) {
        console.log("⚠️  Warning: Account has no ETH balance.");
        console.log("   For Base Sepolia, get testnet ETH from:");
        console.log("   https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet\n");
    }

    // Deploy ViewProfile
    console.log("Deploying ViewProfile contract...");
    const ViewProfile = await ethers.getContractFactory("ViewProfile");
    const viewProfile = await ViewProfile.deploy();

    await viewProfile.waitForDeployment();
    const contractAddress = await viewProfile.getAddress();

    console.log("\n✅ ViewProfile deployed successfully!");
    console.log("   Contract address:", contractAddress);

    // Display next steps
    console.log("\n╔═══════════════════════════════════════════════════════════╗");
    console.log("║                      Next Steps                           ║");
    console.log("╚═══════════════════════════════════════════════════════════╝");

    // Check network
    const network = await ethers.provider.getNetwork();
    if (network.chainId === 84532n) {
        console.log("\n📝 Verify on BaseScan (optional):");
        console.log(`   npx hardhat verify --network baseSepolia ${contractAddress}`);

        console.log("\n🔗 View on BaseScan:");
        console.log(`   https://sepolia.basescan.org/address/${contractAddress}`);
    }

    console.log("\n📋 Add to frontend .env.local:");
    console.log(`   NEXT_PUBLIC_VIEW_PROFILE_ADDRESS=${contractAddress}`);

    console.log("\n");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Deployment failed:", error.message || error);
        process.exit(1);
    });
