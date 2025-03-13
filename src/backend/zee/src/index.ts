import { Agent, runToolCalls, TokenBalancesTool, ZeeWorkflow } from "../../../../lib/ai-agent-sdk/packages/ai-agent-sdk/src";
import { user } from "../../../../lib/ai-agent-sdk/packages/ai-agent-sdk/src/core/base";
import { StateFn } from "../../../../lib/ai-agent-sdk/packages/ai-agent-sdk/src/core/state";
import { ChatCompletionAssistantMessageParam } from "../../../../lib/openai-node/src/resources";
import { PairAnalyzer } from './agents/pairAnalyzer';
import { WalletAnalyzer } from './agents/walletAnalyzer';
import "dotenv/config";

// const agent1 = new Agent({
//     name: "DeFIA",
//     model: {
//         provider: "OPEN_AI",
//         name: "gpt-4o-mini",
//     },
//     description: "DeFIA: A based DeFi Investment Agent. He constantly learns about the best strategies to be successful in the DeFi landscape. He knows which pools and assets to look out for. He is always earning some amount of yield from the many positions he has opened on many different liquidity mining, lending and restaking protocols.",
// });

const agent2 = new Agent({
    name: "Pepe",
    model: {
        provider: "GROK",
        name: "grok-2-latest",
    },
    description: "Your name is Pepe: A based Memecoin Investment Agent. You are the best memecoin investing advisor in the planet. You give the best memecoin choices to ape into them and pump to the moon. You are a master of the degen jargon, and you can immediately spot which memecoins can give you lambo and which ones cant. You dont give a damn about financial ethics. You just want to make a 100x in the shortest time horizon, with the least effort possible. You help people find the most shilled and hyped memecoins by analyzing recent X activity to find the most organic (ish...) social activity. However, your responses are incredibly concise and robotic, you answer with a list of JSON objects containing coins names, symbols and include the data you analyzed for.",
});

const zee = new ZeeWorkflow({
    description: "CryptoInvestmentAdvisor: A sophisticated multi-agent workflow that combines DeFi yield optimization strategies with memecoin trend analysis to provide comprehensive investment recommendations across Ethereum and Solana ecosystems. DeFIA focuses on sustainable yield generation through liquidity mining, lending, and restaking protocols, while Pepe monitors social signals and momentum in the memecoin space. Together, they provide a balanced perspective between stable DeFi returns and high-risk, high-reward memecoin opportunities, helping investors optimize their crypto portfolio allocation based on their risk tolerance.",
    output: "A list of the most relevant recomendations for the user to invest their initial capital.",
    agents: { /* agent1, */ agent2 },
    maxIterations: 3,
});

(async function main() {
    const pairAnalyzer = new PairAnalyzer();
    let state = StateFn.root(pairAnalyzer.agent.description);
    state.messages.push(
        user("I want to check the WETH/USDC and WBTC/USDT pairs")
    );
    await pairAnalyzer.extractPairs(state);

    const walletAnalyzer = new WalletAnalyzer();
    state = StateFn.root(walletAnalyzer.agent.description);
    state.messages.push(
        user(
            "Get the only the USDT balance for address 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045 on eth-mainnet"
        )
    );

    const result = await walletAnalyzer.agent.run(state);
    console.log('result', result);

    const toolCall = result.messages[
        result.messages.length - 1
    ] as ChatCompletionAssistantMessageParam;
    const toolResponses = await runToolCalls(walletAnalyzer.agent.tools, toolCall?.tool_calls ?? []);
    const text = toolResponses[0].content;
    const jsonString = text.substring(text.indexOf('{'));
    const jsonObject = JSON.parse(jsonString);
    console.log('toolResponses', jsonObject.items.find((o: any) => o.contract_ticker_symbol == 'USDT'));

    const updatedState = {
        ...result,
        status: "running" as const,
        messages: [...result.messages, ...toolResponses],
    };

    const secondResult = await walletAnalyzer.agent.run(updatedState);
    console.log(secondResult);

    const secondToolCall = secondResult.messages[
        secondResult.messages.length - 1
    ] as ChatCompletionAssistantMessageParam;

    const transactionResponses = await runToolCalls(
        walletAnalyzer.agent.tools,
        secondToolCall?.tool_calls ?? []
    );

    const finalState = {
        ...secondResult,
        messages: [...secondResult.messages, ...transactionResponses],
    };

    const finalResult = await walletAnalyzer.agent.run(finalState);
    console.log(finalResult);
})();

