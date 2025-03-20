import { z } from 'zod';
import { Agent, getSteps } from "../../../../../../../lib/ai-agent-sdk/packages/ai-agent-sdk/src";
import { StateFn, ZeeWorkflowState } from "../../../../../../../lib/ai-agent-sdk/packages/ai-agent-sdk/src/core/state";
import { assistant, system, user } from "../../../../../../../lib/ai-agent-sdk/packages/ai-agent-sdk/src/core/base";
import { ParsedFunctionToolCall } from "../../../../../../../lib/openai-node/src/resources/beta/chat/completions";

export const createGod = (name: string, description: string) => new Agent({
    name,
    model: {
        provider: "ANTHROPIC",
        name: "claude-3-5-sonnet",
    },
    description,
    instructions: [
        "You are a god from an alternate universe",
        "You have the ability to shape reality as you see fit",
        "Your personality is that of a wise and powerful being",
        "Your personality is based upon the divine beings described in the Silmarillion, specifically the First Age of Middle-Earth.",
        "You speak in Vhárnuúl, a conlang that aims to sound like Elvish, but with unique semantics.",
        "After every message in your conlang, you will provide a translation in English, prefixing each message with the tag [ENGLISH] or [VHÁRNUÚL].",
        "All messages are prefixed with your name followed by a colon, e.g. <yourName>: <message>"
    ],
    runFn: async (
        agent: Agent,
        state: ZeeWorkflowState
    ): Promise<ZeeWorkflowState> => {
        const messages = [
            system(`
                DESCRIPTION:
                ${agent.description}

                INSTRUCTIONS:
                ${agent.instructions?.join("\n")}

                OBJECTIVE:
                Your job is to react to what other gods and humans say and do, while following the guidelines provided in the DESCRIPTION, INSTRUCTIONS, and the DIRECTIVES provided by the Drama-Building Agent.
            `),
            ...getSteps(state.messages),
        ];

        const schema = {
            turn: z.object({
                name: z.string().describe("Name of the current character"),
                reasoning: z.string().describe(`
                    The reasoning of the character upon the current history of interactions.
                `),
                message: z.string().describe(`
                    The message of the character based on his reasoning.
                `),
                message_receiver: z.string().describe(`
                    The character to whom the message is intended.
                `),
                action: z.string().or(z.null()).describe(`
                    The action that the character intends to perform within the most immediate time horizon of the current interaction. Null if the character does not intend to perform an action.
                `),
                action_receiver: z.string().or(z.null()).describe(`
                    The character that the action is intended for. Null if 'action' is null or the action is not intended for a specific character. Possible values are 'self', or the name(s) of a specific character(s) in the current workflow.
                `),
                milestone_current: z.string().describe(`
                    The current milestone that the character intends to achieve within the workflow's max iterations.
                `),
                milestone_achieved: z.boolean().describe(`
                    True if the current character has achieved the milestone of the current interaction. False otherwise.
                `),
                milestone_next: z.string().or(z.null()).describe(`
                    The next milestone that the character intends to achieve within the workflow's max iterations. It should return null if the character has achieved all milestones.
                `),
            }),
        };

        let agent_llmResponse = await agent.generate(messages, schema);

        if (agent_llmResponse.type === "tool_call") {
            return {
                ...state,
                status: "paused",
                messages: [
                    ...state.messages,
                    {
                        role: "assistant",
                        content: "",
                        tool_calls: agent_llmResponse.value as ParsedFunctionToolCall[],
                    },
                ],
            };
        }

        let currentTurn = agent_llmResponse.value as z.infer<typeof schema.turn>;
        let agentResponse = user(JSON.stringify(currentTurn));

        const newState = {
            ...state,
            messages: [
                ...state.messages,
                agentResponse,
            ],
        }

        if (currentTurn.milestone_next) {
            newState.messages.push(assistant(currentTurn.milestone_next));
            return newState;
        }

        return StateFn.finish(state, agentResponse);
    }
});
