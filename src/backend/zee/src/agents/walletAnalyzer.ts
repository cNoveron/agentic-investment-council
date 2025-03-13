import {
    Agent,
    ZeeWorkflow,
    TokenBalancesTool,
    NFTBalancesTool,
    TransactionsTool,
    runToolCalls,
} from "../../../../../lib/ai-agent-sdk/packages/ai-agent-sdk/src";
import "dotenv/config";
import { ChatCompletionAssistantMessageParam, ChatCompletionMessageParam } from "../../../../../lib/openai-node/src/resources";
import z from "zod";
import { StateFn } from "../../../../../lib/ai-agent-sdk/packages/ai-agent-sdk/src/core/state";
import { user } from "../../../../../lib/ai-agent-sdk/packages/ai-agent-sdk/src/core/base";

const tools = {
    tokenBalances: new TokenBalancesTool(process.env.GOLDRUSH_API_KEY),
    // nftBalances: new NFTBalancesTool(process.env.GOLDRUSH_API_KEY),
    // transactions: new TransactionsTool(process.env.GOLDRUSH_API_KEY),
};

const walletAnalyzer = new Agent({
    name: "WalletAnalyzer",
    model: {
        provider: "OPEN_AI",
        name: "gpt-4o-mini",
    },
    description:
        "You are an ETH balance retriever. Never respond with the whole JSON object, parse it and just return the balance value.",
    instructions: [
        "Analyze wallet token balances and provide insights about holdings",
        "Check NFT collections owned by the wallet",
        "Review recent transactions and identify patterns",
        "Provide comprehensive analysis of the wallet's activity",
    ],
    tools,
});

const zee = new ZeeWorkflow({
    description: "A workflow that analyzes onchain wallet activities",
    output: "Comprehensive analysis of wallet activities including token holdings, NFTs, and transactions",
    agents: { walletAnalyzer },
});

const messages: ChatCompletionMessageParam[] = [
    {
        role: "user",
        content: [
            {
                type: "text",
                text: "What's the balance of this address: 0xd8da6bf26964af9d7eed9e03e53415d37aa96045 ?",
            },
        ],
    },
];

const schema = {
    analysis: z.object({
        address: z.string(),
        balance: z.string(),
    }),
};

(async function main() {

    const state = StateFn.root(walletAnalyzer.description);
    state.messages.push(
        user(
            "Get the only the USDT balance for address 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045 on eth-mainnet"
        )
    );

    const result = await walletAnalyzer.run(state);
    console.log('result', result);

    const toolCall = result.messages[
        result.messages.length - 1
    ] as ChatCompletionAssistantMessageParam;
    const toolResponses = await runToolCalls(tools, toolCall?.tool_calls ?? []);
    const text = toolResponses[0].content;
    const jsonString = text.substring(text.indexOf('{'));
    const jsonObject = JSON.parse(jsonString);
    console.log('toolResponses', jsonObject.items.find((o:any) => o.contract_ticker_symbol == 'USDT'));

    // const updatedState = {
    //     ...result,
    //     status: "running" as const,
    //     messages: [...result.messages, ...toolResponses],
    // };

    // const secondResult = await walletAnalyzer.run(updatedState);
    // console.log(secondResult);

    // const secondToolCall = secondResult.messages[
    //     secondResult.messages.length - 1
    // ] as ChatCompletionAssistantMessageParam;

    // const transactionResponses = await runToolCalls(
    //     tools,
    //     secondToolCall?.tool_calls ?? []
    // );

    // const finalState = {
    //     ...secondResult,
    //     messages: [...secondResult.messages, ...transactionResponses],
    // };

    // const finalResult = await walletAnalyzer.run(finalState);
    // console.log(finalResult);
})();

export class WalletAnalyzer {
    agent: Agent = walletAnalyzer;
};