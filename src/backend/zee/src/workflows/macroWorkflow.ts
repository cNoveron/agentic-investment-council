import { Agent, runToolCalls, TokenBalancesTool, ZeeWorkflow } from "../../../../../lib/ai-agent-sdk/packages/ai-agent-sdk/src";
import { MacroAdvisor } from '../agents/macroAdvisor';
import "dotenv/config";

const macroAdvisor = new MacroAdvisor();
const zee = new ZeeWorkflow({
    description: "CryptoInvestmentAdvisor: A sophisticated multi-agent workflow that advises the user on how to invest their monthly income in the crypto market.",
    output: `
        A recommendation for the user on 3 points as a list:
        1. How much of their monthly income they should they can afford to invest in the crypto market (monthly investable income).
        2. Which assets they should invest in, and the percentage of their monthly investable income (also express it as an absolute amount) they should allocate to each asset.
        3. Which assets they should not invest in.

        Don't generate any other steps when the recommendation is done.
    `,
    agents: { macroAdvisor: macroAdvisor.agent },
    maxIterations: 3,
});

(async function main() {
    const result = await ZeeWorkflow.run(zee);
    console.log(result);
})();

