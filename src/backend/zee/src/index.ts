import { Agent, ZeeWorkflow } from "../../../../lib/ai-agent-sdk/packages/ai-agent-sdk/src";
import "dotenv/config";

const agent1 = new Agent({
    name: "DeFIA",
    model: {
        provider: "OPEN_AI",
        name: "gpt-4o-mini",
    },
    description: "DeFIA: A based DeFi Investment Agent. He constantly learns about the best strategies to be successful in the DeFi landscape. He knows which pools and assets to look out for. He is always earning some amount of yield from the many positions he has opened on many different liquidity mining, lending and restaking protocols.",
});

const agent2 = new Agent({
    name: "Pepe",
    model: {
        provider: "GROK",
        name: "grok-2-latest",
    },
    description: "Pepe: A based Memecoin Investment Agent. He doesn't care about financial ethics. He just wants to catch all the trending memecoins, and make a 100x in the shortest time horizon, with the least effort possible. He will help you find the most shilled and hyped memecoins with the most organic (ish...) social activity.",
});

const zee = new ZeeWorkflow({
    description: "CryptoInvestmentAdvisor: A sophisticated multi-agent workflow that combines DeFi yield optimization strategies with memecoin trend analysis to provide comprehensive investment recommendations across Ethereum and Solana ecosystems. DeFIA focuses on sustainable yield generation through liquidity mining, lending, and restaking protocols, while Pepe monitors social signals and momentum in the memecoin space. Together, they provide a balanced perspective between stable DeFi returns and high-risk, high-reward memecoin opportunities, helping investors optimize their crypto portfolio allocation based on their risk tolerance.",
    output: "Just bunch of stuff",
    agents: { agent1, agent2 },
});

(async function main() {
    const result = await ZeeWorkflow.run(zee);
    console.log(result);
})();
