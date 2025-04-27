import { user } from "../../../../../../lib/ai-agent-sdk/packages/ai-agent-sdk/src/core/base";
import { z } from "zod";
import { assistant, system } from "../../../../../../lib/ai-agent-sdk/packages/ai-agent-sdk/src/core/base";
import { Agent, getSteps } from "../../../../../../lib/ai-agent-sdk/packages/ai-agent-sdk/src/core/agent";
import { StateFn } from "../../../../../../lib/ai-agent-sdk/packages/ai-agent-sdk/src/core/state";
import { ChatCompletionMessageParam } from "../../../../../../lib/openai-node/src/resources";
import { AgentName } from "../../../../../../lib/ai-agent-sdk/packages/ai-agent-sdk/src";

export class DramaBuilder {
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
                ];

                const schema = {
                    next_interaction: z.object({
                        involved_characters: z.array(z.enum(this.validCharacters)).describe(`
                            The characters involved in the next interaction. Only the agents in the current workflow can be included.
                        `),
                        reader: z.object({
                            expected_emotions: z.array(z.string()).describe(`
                                The expected emotions to compell to the reader.
                            `),
                            expected_affinity: z.array(z.string()).describe(`
                                The character with whom the reader is expected to develop affinity.
                            `),
                        })
                    }),
                };

                const result = await agent.generate(messages, schema);
                console.log(`${this.agent.name} result`, result.value);

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
                        `Failed to determine next task because "${error}"`
                    );
                }
            },
        });
    }
}
