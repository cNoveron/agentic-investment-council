import { ethers } from 'ethers';
import { z } from 'zod';

import { Agent, getSteps, ZeeWorkflow } from "../../../../lib/ai-agent-sdk/packages/ai-agent-sdk/src";
import { StateFn, ZeeWorkflowState } from "../../../../lib/ai-agent-sdk/packages/ai-agent-sdk/src/core/state";
import { assistant, system, user } from "../../../../lib/ai-agent-sdk/packages/ai-agent-sdk/src/core/base";
import { ParsedFunctionToolCall } from '../../../../lib/openai-node/src/resources/beta/chat/completions';

const macroAdvisor = new Agent({
    name: "MacroAdvisor",
    model: {
        provider: "OPEN_AI",
        name: "gpt-4o-mini",
    },
    description: "Your'e an agent specialized in assessing the state of the macroeconomic conditions that impact the crypto market. You're given a list of questions and you need to answer them based on the current state of the macroeconomic conditions:",
    instructions: [
        "Are we in a recession?",
        "If we're not in a recession, are we likely to enter one within the next 12 months?",
        "Is the FED's attitude hawkish or dovish?",
        "Has the FED achieved its inflation target for the current period?",
        "Is the FED likely to achieve its inflation target for the next period?",
        "Has the FED achieved its disemployment target for the current period?",
        "Is the FED likely to achieve its disemployment target for the next period?",
        "Are we in a stocks bull market?",
        "Are we in a stocks bear market?",
        "Are we in a crypto bull market?",
        "Are we in a crypto bear market?",
        "Are we in a crypto winter?",
    ],
    runFn: async (
        agent: Agent,
        state: ZeeWorkflowState
    ): Promise<ZeeWorkflowState> => {
        const messages = [
            system(`
                ${agent.description}
                Your job is to respond to the assigned questions.
                You should generate a response for each question.
                Each response should be a single sentence.
                You should return the responses in a comma separated list.
                You should return the responses in the following format:
                <questionId>: <response>,
                <questionId>: <response>,
                ...
                These are the questions:
                ${macroAdvisor.instructions?.join('\n')}
            `),
            assistant(`
                Based on the current state of the macroeconomic conditions,
                would you say that is advisable to expose to the risk of the crypto market?
            `),
            ...getSteps(state.messages),
            // assistant("Is there anything else I need to know?"),
            // user("No, I do not have additional information"),
            // assistant("What is the request?"),
            ...state.messages,
        ];

        const schema = {
            step: z.object({
                name: z
                    .string()
                    .describe("Name of the current step or action being performed"),
                result: z
                    .string()
                    .describe(
                        "The output of this step. Include all relevant details and information."
                    ),
                reasoning: z
                    .string()
                    .describe("The reasoning for performing this step."),
                next_step: z.string().describe(`
                        The next step ONLY if required by the original request.
                        Return empty string if you have fully answered the current request, even if
                        you can think of additional tasks.
                    `),
                has_next_step: z
                    .boolean()
                    .describe("True if you provided next_step. False otherwise."),
                require_prompt: z
                    .boolean()
                    .describe("True if the current step requires input from the user. False otherwise."),
            }),
        };

        const response = await agent.generate(messages, schema);

        if (response.type === "tool_call") {
            return {
                ...state,
                status: "paused",
                messages: [
                    ...state.messages,
                    {
                        role: "assistant",
                        content: "",
                        tool_calls: response.value as ParsedFunctionToolCall[],
                    },
                ],
            };
        }

        const stepResponse = response.value as z.infer<typeof schema.step>;
        const agentResponse = assistant(stepResponse.result);

        if (stepResponse.has_next_step) {
            stepResponse.require_prompt && console.log("zee/macroAdvisor: Require prompt");
            return {
                ...state,
                status: stepResponse.require_prompt ? "require_prompt" : "running",
                messages: [
                    ...state.messages,
                    agentResponse,
                    user(stepResponse.next_step),
                ],
            };
        }

        const nextState = StateFn.finish(state, agentResponse);

        return nextState;
    }
});


export class MacroAdvisor {
    public agent: Agent = macroAdvisor;

}