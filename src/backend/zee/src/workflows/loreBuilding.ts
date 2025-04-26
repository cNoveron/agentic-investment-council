import { Agent, runToolCalls, TokenBalancesTool, ZeeWorkflow } from "../../../../../lib/ai-agent-sdk/packages/ai-agent-sdk/src";
import { DóömaMon, MáäHisa, YëolInür } from '../agents/characters/Yeel\'Inur';
import { DramaBuilder } from "src/agents/routers/dramaBuilder";
import { StylishWriter } from "src/agents/endgame/stylishWriter";
import "dotenv/config";

const yëolInür = new YëolInür();
const máäHisa = new MáäHisa();
const dóömaMon = new DóömaMon();

const agents = { yeelInur: yëolInür.agent, máäHisa: máäHisa.agent, dóömaMon: dóömaMon.agent };
const zee = new ZeeWorkflow({
    description: "LoreBuildingWorkflow: A multi-agent workflow that builds the lore for a high-fantasy fictional universe.",
    output: `
        A short compelling piece of narrative that achieves a specific narrative goal within a broader narrative arc.
    `,
    agents,
    maxIterations: 3,
    router: new DramaBuilder(agents).agent,
    endgame: new StylishWriter(agents).agent,
});

(async function main() {
    const result = await ZeeWorkflow.run(zee);
    console.log(result);
})();

