import { Agent, runToolCalls, TokenBalancesTool, ZeeWorkflow } from "../../../../lib/ai-agent-sdk/packages/ai-agent-sdk/src";
import { MacroAdvisor } from './macroAdvisor';
import "dotenv/config";

const macroAdvisor = new MacroAdvisor();
const zee = new ZeeWorkflow({
    description: "CryptoInvestmentAdvisor: A sophisticated multi-agent workflow that advises the user how much of their initial capital they should they invest in the crypto market, and how much they should keep in stablecoins.",
    output: "A recommendation for the user how much of their initial capital they should they invest in the crypto market, and how much they should keep in stablecoins.",
    agents: { macroAdvisor: macroAdvisor.agent },
    //maxIterations: 3,
});

(async function main() {
    const result = await ZeeWorkflow.run(zee);
    console.log(result);
})();

