import { Agent, runToolCalls, TokenBalancesTool, ZeeWorkflow } from "../../../../../lib/ai-agent-sdk/packages/ai-agent-sdk/src";
import { YeelInur } from '../agents/characters/Yeel\'Inur';
import { dramaBuilder } from "src/agents/routers/dramaBuilder";
import "dotenv/config";

const yeelInur = new YeelInur();
const zee = new ZeeWorkflow({
    description: "LoreBuildingWorkflow: A multi-agent workflow that builds the lore for a high-fantasy fictional universe.",
    output: `
        A short compelling piece of narrative that achieves a specific narrative goal within a broader narrative arc.
    `,
    agents: { yeelInur: yeelInur.agent },
    maxIterations: 3,
    router: dramaBuilder,
});

(async function main() {
    const result = await ZeeWorkflow.run(zee);
    console.log(result);
})();

