import { Configuration, OpenAIApi } from "openai";
import { system } from "./system/system";
import { SystemProp } from "./system/system-prop";
import fs from "node:fs/promises";
import { Action, ActionType, ActivepiecesError, BranchAction, ErrorCode, Trigger, TriggerType } from "@activepieces/shared";
import { getPiece, pieces } from "@activepieces/pieces-apps";
import { logger } from "./logger";
import { jsonrepair } from 'jsonrepair'

const configuration = new Configuration({
    apiKey: system.get(SystemProp.OPENAI_KEY),
});

export const flowGuessService = {
    async guessFlow(question: string): Promise<Trigger> {
        try {
            const context = await buildExamples(question);
            const flowPrompt = (await fs.readFile('./packages/backend/src/assets/openai/main_prompt.txt', 'utf8')).replace('{question}', question).replace('{context}', context);
            const openAiResponse = await callOpenAI(flowPrompt);
            logger.info("OpenAI Response: " + JSON.stringify(openAiResponse));
            const flowJson = extractJson(openAiResponse);
            return cleanAndValidateTrigger(flowJson.trigger as any);
        }
        catch (e) {
            logger.error(e);
            throw new ActivepiecesError({
                code: ErrorCode.OPENAI_FAILED,
                params: {}
            }, e);
        }
    }
}

function cleanAndValidateTrigger(step: Trigger): Trigger {
    const basicStep = {
        name: "trigger",
        displayName: step.displayName ?? "Untitled Trigger",
        type: step.type,
        valid: false,
        nextAction: cleanAction(step.nextAction, 1),
    }
    switch (step.type) {
    case TriggerType.PIECE: {
        const pieceName = getPiece(step.settings.pieceName);
        if (!pieceName) {
            return {
                ...basicStep,
                type: TriggerType.WEBHOOK,
                settings: {},
            } as Trigger
            // throw new Error(`Unknown piece ${step.settings.pieceName}`);
        }
        return {
            ...basicStep,
            settings: {
                pieceName: step.settings.pieceName,
                triggerName: step.settings.triggerName,
                pieceVersion: "0.0.1",
                input: {}
            },
        } as Trigger
    }
    case TriggerType.SCHEDULE:
        return {
            ...basicStep,
            settings: {
                cronExpression: step.settings.cronExpression,
            },
        } as Trigger
    case TriggerType.WEBHOOK:
    default:
        return {
            ...basicStep,
            type: TriggerType.WEBHOOK,
            settings: {},
        } as Trigger
    }
}

function cleanAction(step: any, count: number): Action {
    if (step === undefined || step === null) {
        return undefined;
    }
    const basicStep = {
        name: "step-" + count,
        displayName: step.displayName ?? "Untitled Step",
        type: step.type,
        valid: false,
        nextAction: cleanAction(step.nextAction, 3 * count),
    }
    switch (basicStep.type) {
    case ActionType.BRANCH: {
        const failureAction = step.onFailureAction;
        const successAction = step.OnSuccessAction;
        return {
            ...basicStep,
            settings: {
                // TODO support this in the prompt
                conditions: [[{
                    firstValue: "",
                    secondValue: ""
                }]]
            },
            onFailureAction: cleanAction(failureAction, 3 * count + 1),
            onSuccessAction: cleanAction(successAction, 3 * count + 2),
        } as BranchAction
    }
    case ActionType.PIECE: {
        const pieceName = getPiece(step.settings.pieceName);
        if (!pieceName) {
            return {
                ...basicStep,
                type: ActionType.CODE,
                settings: {
                    input: {},
                    artifact: "UEsDBAoAAAAAAIGZWlYSIpQ2PAAAADwAAAAIAAAAaW5kZXgudHNleHBvcnQgY29uc3QgY29kZSA9IGFzeW5jIChwYXJhbXMpID0+IHsKICAgIHJldHVybiB0cnVlOwp9OwpQSwMECgAAAAAAgZlaVhpS0QgcAAAAHAAAAAwAAABwYWNrYWdlLmpzb257CiAgImRlcGVuZGVuY2llcyI6IHsKICB9Cn0KUEsBAhQACgAAAAAAgZlaVhIilDY8AAAAPAAAAAgAAAAAAAAAAAAAAAAAAAAAAGluZGV4LnRzUEsBAhQACgAAAAAAgZlaVhpS0QgcAAAAHAAAAAwAAAAAAAAAAAAAAAAAYgAAAHBhY2thZ2UuanNvblBLBQYAAAAAAgACAHAAAACoAAAAAAA="
                }
            }
            //throw new Error(`Unknown piece ${step.settings.pieceName}`);
        }
        const action = pieceName.getAction(step.settings.actionName);
        if (!action) {
            return {
                ...basicStep,
                type: ActionType.CODE,
                settings: {
                    input: {},
                    artifact: "UEsDBAoAAAAAAIGZWlYSIpQ2PAAAADwAAAAIAAAAaW5kZXgudHNleHBvcnQgY29uc3QgY29kZSA9IGFzeW5jIChwYXJhbXMpID0+IHsKICAgIHJldHVybiB0cnVlOwp9OwpQSwMECgAAAAAAgZlaVhpS0QgcAAAAHAAAAAwAAABwYWNrYWdlLmpzb257CiAgImRlcGVuZGVuY2llcyI6IHsKICB9Cn0KUEsBAhQACgAAAAAAgZlaVhIilDY8AAAAPAAAAAgAAAAAAAAAAAAAAAAAAAAAAGluZGV4LnRzUEsBAhQACgAAAAAAgZlaVhpS0QgcAAAAHAAAAAwAAAAAAAAAAAAAAAAAYgAAAHBhY2thZ2UuanNvblBLBQYAAAAAAgACAHAAAACoAAAAAAA="
                }
            }
            // throw new Error(`Unknown action ${step.settings.actionName} for piece ${step.settings.pieceName}`);
        }
        return {
            ...basicStep,
            displayName: step.displayName ?? snakeToNormal(step.settings.actionName),
            settings: {
                pieceName: step.settings.pieceName,
                // TODO FIX
                pieceVersion: "0.0.1",
                input: {},
                actionName: step.settings.actionName,
            }
        }
    }
    default:
        throw new Error(`Unknown Action type ${step.type}`);
    }
}

function snakeToNormal(str: string): string {
    return str.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}


async function buildExamples(userQuestion: string): Promise<string> {
    const context = [];
    for (const piece of pieces) {
        const actions = Object.keys(piece.metadata().actions);
        const triggers = Object.keys(piece.metadata().triggers);
        context.push({
            pieceName: piece.metadata().name,
            actions: actions,
            triggers: triggers,
        })
    }
    const flowPrompt = (await fs.readFile('./packages/backend/src/assets/openai/find_examples_prompt.txt', 'utf8')).replace('{question}', userQuestion).replace('{context}', context.join("\n"));
    const openAiResponse = await callOpenAI(flowPrompt);
    logger.info("Examples to Provide " + JSON.stringify(openAiResponse));
    const flowExamples = [];
    const examplesOutput = JSON.parse(openAiResponse);
    for (let i = 0; i < examplesOutput.length; i++) {
        const pieceName = examplesOutput[i].pieceName;
        for (let j = 0; j < (examplesOutput[i].triggers ?? []).length; j++) {
            const triggerName = examplesOutput[i].triggers[j];
            flowExamples.push("Example: Flow triggered by " + pieceName + " " + triggerName);
            flowExamples.push(`{"trigger":{"type":"PIECE_TRIGGER","settings":{"pieceName":"${pieceName}", "trigerName": "${triggerName}"},"displayName":"Every 5 Min"}}`);
        }
        for (let j = 0; j < (examplesOutput[i].actions ?? []).length; j++) {
            const actionName = examplesOutput[i].actions[j];
            flowExamples.push("Example: every 5 minutes run " + pieceName + " " + actionName);
            flowExamples.push(`{ "trigger": { "type": "SCHEDULE", "settings": { "cronExpression": "0/5 * * * *" }, "displayName": "Every 5 Min", "nextAction": { "type": "PIECE", "settings": { "pieceName": "${pieceName}", "actionName": "${actionName}" } } } `);
        }
    }
    return flowExamples.join("\n");
}

function extractJson(text: string): { trigger: any } {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    const jsonStr = text.substring(start, end + 1).replace(/'/g, '"');
    const jsonArray = JSON.parse(jsonrepair(jsonStr));
    return jsonArray;
}

async function callOpenAI(prompt: string): Promise<string> {
    const openai = new OpenAIApi(configuration);
    const response = await openai.createChatCompletion({
        model: 'gpt-3.5-turbo',
        messages: [
            {
                role: "user",
                content: prompt
            }],
        temperature: 0.3,
        top_p: 1,
        frequency_penalty: 0,
    });
    return response.data.choices[0].message!.content;
}


