import { z } from "zod";
import { assistant, system, user } from "../../../../../../lib/ai-agent-sdk/packages/ai-agent-sdk/src/core/base";
import { Agent, AgentName } from "../../../../../../lib/ai-agent-sdk/packages/ai-agent-sdk/src/core/agent";
import { StateFn } from "../../../../../../lib/ai-agent-sdk/packages/ai-agent-sdk/src/core/state";

export class StylishWriter {
  public agent: Agent;
  private validCharacters: [string, ...string[]];

  constructor(agents: Record<AgentName, Agent>) {
    const characterNames = Object.values(agents).map(agent => agent.name);
    // Ensure at least one character exists
    if (characterNames.length === 0) {
      throw new Error("At least one character is required");
    }
    // Convert to tuple with at least one string
    this.validCharacters = [characterNames[0], ...characterNames.slice(1)] as [string, ...string[]];

    this.agent = new Agent({
      name: "endgame",
      description: "",
      model: {
        provider: "OPEN_AI",
        name: "gpt-4o-mini",
      },

      runFn: async (agent: Agent, state) => {
        const messages = [
          ...state.messages,
          system("maxIterations limit hit"),
          user(
            "Write a paragraph following the style of J.R.R Tolkkien, based on the interactions amongst the characters."
          ),
        ];

        const schema = {
          story: z.object({
            involved_characters: z.array(z.enum(this.validCharacters)).describe(`
              The characters involved in the next interaction. Only the agents in the current workflow can be included.
            `),
            paragraph: z
              .string()
              .describe("The paragraph that summarizes the interactions between characters in a stilish way."),
          }),
        };

        const result = await agent.generate(messages, schema);
        if (!("paragraph" in result.value)) {
          return StateFn.finish(
            state,
            assistant("Failed to get final answer")
          );
        }

        if (result.type !== "story") {
          throw new Error(
            "Expected task_result response, got " + result.type
          );
        }

        return StateFn.finish(
          state,
          assistant(result.value["paragraph"])
        );
      },
    })
  }
}