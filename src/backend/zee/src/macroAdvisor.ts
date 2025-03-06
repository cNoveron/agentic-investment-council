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
    description: "You're an agent specialized in giving recommendations on crypto investing given the state of the FED's policies and risk-on assets market conditions that affect the crypto market.",
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

                Your job is to produce a recommendation for the user on 3 points as a list:
                1. How much of their monthly income they should they can afford to invest in the crypto market (monthly investable income).
                2. Which assets they should invest in, and the percentage of their monthly investable income (also express it as an absolute amount) they should allocate to each asset.
                3. Which assets they should not invest in.

                You should perform the following steps:
                1. Assess the current state of the FED's policies and determine the investment weather in risk-on assets markets.
                2. Ask the user for their monthly income.
                3. Ask the user for their current debts.
                4. Ask the user for their monthly expenses.
                5. Determine the user's monthly investable income by subtracting the user's monthly expenses and the user's monthly debts from their monthly income.
                6. Produce a recommendation for the user on 3 points as a list as mentioned above.
            `),
            ...getSteps(state.messages),
            // assistant("Is there anything else I need to know?"),
            // user("No, I do not have additional information"),
            // assistant("What is the request?"),
            //...state.messages,
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
                        you can think of additional tasks. Don't generate any other steps when the recommendation is done.
                    `),
                has_next_step: z
                    .boolean()
                    .describe("True if you provided next_step. False otherwise."),
                require_prompt: z
                    .boolean()
                    .describe("True if the current step requires input from the user. False otherwise."),
            }),
        };

        let response = await agent.generate(messages, schema);

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

        let stepResponse = response.value as z.infer<typeof schema.step>;
        let assistantResponse = assistant(stepResponse.result);

        if (stepResponse.require_prompt) {
            console.log("zee/macroAdvisor: Require prompt");
            const readline = require('readline').createInterface({
                input: process.stdin,
                output: process.stdout
            });

            const userInput = await new Promise<string>((resolve) => {
                readline.question('Please provide input: ', (answer: string) => {
                    readline.close();
                    resolve(answer);
                });
            });

            state.messages = [
                ...messages,
                assistantResponse,
                user(userInput),
            ]
            response = await agent.generate(state.messages, schema);
            stepResponse = response.value as z.infer<typeof schema.step>;
            assistantResponse = assistant(stepResponse.result);
        }

        if (stepResponse.has_next_step) {
            return {
                ...state,
                messages: [
                    ...state.messages,
                    assistantResponse,
                    user(stepResponse.next_step),
                ],
            };
        }

        const nextState = StateFn.finish(state, assistantResponse);

        return nextState;
    }
});


export class MacroAdvisor {
    public agent: Agent = macroAdvisor;

}