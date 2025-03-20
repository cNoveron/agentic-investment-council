import { user } from "../../../../../../lib/ai-agent-sdk/packages/ai-agent-sdk/src/core/base";
import { z } from "zod";
import { assistant } from "../../../../../../lib/ai-agent-sdk/packages/ai-agent-sdk/src/core/base";
import { system } from "../../../../../../lib/ai-agent-sdk/packages/ai-agent-sdk/src/core/base";
import { Agent, getSteps } from "../../../../../../lib/ai-agent-sdk/packages/ai-agent-sdk/src/core/agent";
import { StateFn } from "../../../../../../lib/ai-agent-sdk/packages/ai-agent-sdk/src/core/state";
import { ChatCompletionMessageParam } from "../../../../../../lib/openai-node/src/resources";

export const dramaBuilder = new Agent({
    name: "Drama Builder",
    description: "You are a router that oversees the workflow.",
    model: {
      provider: "OPEN_AI",
      name: "gpt-4o-mini",
    },

    runFn: async (agent: Agent, state: any) => {
      if (state.status === "finished") {
        return state;
      }

      const [workflowRequest, ..._messages] = state.messages;

      const messages = [
        system(`
                Your job is to determine the next interaction between the characters based on the <workflow> and what narrative milestones have been reached so far.

                Rules:
                1. The next interaction should specify the characters involved and the nature of the interaction
                2. Interactions should include a concise description of the current intentions of the characters
                3. Intentions should be based on the narrative milestones that have been reached so far
                4. Intentions should be consistent with the overall goal of the session
                5. You should provide a list of emotions driving the character's intentions and a reasoning for each emotion
                6. Return null when the narrive goal of this session has been achieved
              `),
        assistant("What is the narrive goal of this session?"),
        workflowRequest as ChatCompletionMessageParam,

        ...(_messages.length > 0
          ? [
            assistant("What narrative milestones have been reached so far?"),
            ...getSteps(_messages),
          ]
          : []),

        // ..._messages,
      ];

      const schema = {
        next_interaction: z.object({
          involved_characters: z.string().array().describe(`
            The characters involved in the next interaction.
          `),
          expected_intentions: z.string().describe(`
            The intentions of the characters the characters should feel in the next interaction.
          `),
          expected_emotions: z.string().array().describe(`
            The expected emotion that should driving the character's intentions.
          `),
          expected_reasoning: z.string().array().describe(`
            The reasoning for the next interaction.
          `),
        }),
      };

      const result = await agent.generate(messages, schema);
      console.log("Router result", result);

      try {
        if (result.type !== "next_interaction") {
          throw new Error(
            "Expected next_interaction response, got " + result.type
          );
        }

        if (result.value["involved_characters"].length > 0) {
          const nextState = StateFn.assign(state, [
            ["resource_planner", user(JSON.stringify(result.value))],
          ]);
          return nextState;
        }

        return {
          ...state,
          status: "finished",
        };
      } catch (error) {
        throw new Error(
          `Failed to determine next task because "${error}`
        );
      }
    },
  });