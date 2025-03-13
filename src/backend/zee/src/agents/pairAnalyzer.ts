import { ethers } from 'ethers';

import { Agent, ZeeWorkflow } from "../../../../../lib/ai-agent-sdk/packages/ai-agent-sdk/src";
import { StateFn } from "../../../../../lib/ai-agent-sdk/packages/ai-agent-sdk/src/core/state";
import { user } from "../../../../../lib/ai-agent-sdk/packages/ai-agent-sdk/src/core/base";

// Uniswap V3 Factory Address on Ethereum Mainnet
const UNISWAP_V3_FACTORY = '0x1F98431c8aD98523631AE4a59f267346ea31F984';

// Factory ABI (minimal for getting pool addresses)
const FACTORY_ABI = [
    'function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool)'
];

// Common token addresses on Ethereum Mainnet
const TOKEN_ADDRESSES = {
    'WETH': '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    'USDC': '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    'USDT': '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    'WBTC': '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
    // Add more tokens as needed
};

const pairAnalyzer = new Agent({
    name: "PairAnalyzer",
    model: {
        provider: "OPEN_AI",
        name: "gpt-4o-mini",
    },
    description: "An agent specialized in parsing token pair queries and identifying trading pairs from natural language input. Returns only valid token pairs found in the text.",
    instructions: [
        "Extract token pair combinations from user input",
        "Return pairs in a standardized format like 'WETH/USDC, WBTC/USDT'",
        "Only consider known token symbols",
        "Ignore irrelevant text and focus on token symbols",
    ],
});


export class PairAnalyzer {
    public agent: Agent = pairAnalyzer;
    private validTokens: Set<string>;

    constructor() {
        this.validTokens = new Set(Object.keys(TOKEN_ADDRESSES));
    }

    private parseWithRegex(input: string): string[] {
        // Match patterns like "TOKEN1/TOKEN2" or "TOKEN1-TOKEN2" or "TOKEN1 TOKEN2"
        const pairRegex = /\b([A-Z0-9]{2,10})[\s/\-]([A-Z0-9]{2,10})\b/g;
        const matches = [...input.matchAll(pairRegex)];

        const validPairs = matches
            .map(match => {
                const token1 = match[1].toUpperCase();
                const token2 = match[2].toUpperCase();

                // Only return pairs where both tokens are valid
                if (this.validTokens.has(token1) && this.validTokens.has(token2)) {
                    return `${token1}/${token2}`;
                }
                return null;
            })
            .filter((pair): pair is string => pair !== null);

        return validPairs;
    }

    async extractPairs(state: any) {
        const userMessage = state.messages[state.messages.length - 1].content as string;

        // First try regex parsing
        const regexPairs = this.parseWithRegex(userMessage);

        // If regex found valid pairs, use those
        if (regexPairs.length > 0) {
            console.log("Pairs found using regex:", regexPairs);
            return this.getPoolAddresses(regexPairs);
        }

        // Fall back to AI parsing if regex didn't find valid pairs
        console.log("No pairs found with regex, falling back to AI parsing...");
        const result = await pairAnalyzer.run(state);
        const content = result.messages[result.messages.length - 1].content as string;
        const aiPairs = content.split(',').map(pair => pair.trim());

        return this.getPoolAddresses(aiPairs);
    }

    private async getPoolAddresses(pairs: string[]) {
        let poolAddresses: { [key: string]: string } = {};

        for (const pair of pairs) {
            const [token0, token1] = pair.split('/');
            if (TOKEN_ADDRESSES[token0 as keyof typeof TOKEN_ADDRESSES] &&
                TOKEN_ADDRESSES[token1 as keyof typeof TOKEN_ADDRESSES]) {
                const poolAddress = await this.getPoolAddressFromEthers(
                    TOKEN_ADDRESSES[token0 as keyof typeof TOKEN_ADDRESSES],
                    TOKEN_ADDRESSES[token1 as keyof typeof TOKEN_ADDRESSES]
                );
                console.log(`Pool address for ${pair}:`, poolAddress);
                if (poolAddress) {
                    poolAddresses[pair] = poolAddress;
                }
            } else {
                console.log(`Could not find addresses for pair ${pair}`);
            }
        }
        return poolAddresses;
    }

    private async getPoolAddressFromEthers(tokenA: string, tokenB: string): Promise<string | null> {
        const provider = new ethers.providers.JsonRpcProvider(process.env.ETH_RPC_URL);
        const factory = new ethers.Contract(UNISWAP_V3_FACTORY, FACTORY_ABI, provider);

        // Try different fee tiers (0.05%, 0.3%, 1%)
        const feeTiers = [500, 3000, 10000];

        for (const fee of feeTiers) {
            try {
                const poolAddress = await factory.getPool(tokenA, tokenB, fee);
                if (poolAddress !== ethers.constants.AddressZero) {
                    return poolAddress;
                }
            } catch (error) {
                console.error(`Error checking fee tier ${fee}:`, error);
            }
        }

        return null;
    }
}