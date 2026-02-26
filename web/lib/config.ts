import { STACKS_DEVNET, STACKS_TESTNET, STACKS_MAINNET, StacksNetwork } from "@stacks/network";

// Network selection via env var or default to mainnet
type NetworkMode = "devnet" | "testnet" | "mainnet";
const NETWORK_MODE_RAW = (process.env.NEXT_PUBLIC_NETWORK_MODE || "mainnet") as NetworkMode;

export function getStacksNetwork(mode: NetworkMode): StacksNetwork {
    switch (mode) {
        case "mainnet": return STACKS_MAINNET;
        case "testnet": return STACKS_TESTNET;
        default: return STACKS_DEVNET;
    }
}

// Returns the deployer principal address (without contract name)
export function getContractDeployer(mode: NetworkMode): string {
    switch (mode) {
        case "mainnet": return "SP1TN1ERKXEM2H9TKKWGPGZVNVNEKS92M7M3CKVJJ";
        case "testnet": return "ST1TN1ERKXEM2H9TKKWGPGZVNVNEKS92M7MAMP23P";
        default: return "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"; // Devnet deployer
    }
}

export function getContractName(mode: NetworkMode): string {
    switch (mode) {
        case "mainnet": return "gm-on-stacks-v6";
        case "testnet": return "gm-on-stacks-v6";
        default: return "gm-on-stacks";
    }
}

export const NETWORK_MODE = NETWORK_MODE_RAW;
export const STACKS_NETWORK = getStacksNetwork(NETWORK_MODE_RAW);

// CONTRACT_ADDRESS is the deployer principal (for API calls)
export const CONTRACT_ADDRESS = getContractDeployer(NETWORK_MODE_RAW);
// CONTRACT_NAME is the name of the contract
export const CONTRACT_NAME = getContractName(NETWORK_MODE_RAW);

// Full contract identifier for reference (address.name)
export const CONTRACT_IDENTIFIER = `${CONTRACT_ADDRESS}.${CONTRACT_NAME}`;

export const APP_DETAILS = {
    name: "GM on Stacks",
    icon: "https://cryptologos.cc/logos/stacks-stx-logo.png",
};

// Reown Project ID - Get yours at https://cloud.reown.com
export const REOWN_PROJECT_ID = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID || "demo-project-id";

// GM Fee in microSTX (0.1 STX = 100,000 microSTX)
export const GM_FEE = 100000;

// NFT Fees in microSTX
export const NFT_FEE_STREAK = 1000000;    // 1 STX (21+ day streak)
export const NFT_FEE_NORMAL = 33000000;   // 33 STX (no streak / <21 days)

// Legacy NFT fee (for backwards compatibility)
export const NFT_FEE = NFT_FEE_NORMAL;

// Streak threshold for NFT discount
export const STREAK_THRESHOLD = 21;
