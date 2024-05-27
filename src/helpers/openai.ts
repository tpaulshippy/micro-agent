import OpenAI from 'openai';
import { getConfig } from './config';
import { KnownError } from './error';
import { commandName } from './constants';
import { systemPrompt } from './generate';
import { RunCreateParams } from 'openai/resources/beta/threads/runs/runs';
import { RunOptions } from './run';

const defaultModel = 'gpt-4o';
export const USE_ASSISTANT = true;
const assistantIdentifierMetadataKey = '_id';
const assistantIdentifierMetadataValue = '@builder.io/micro-agent';

export const getOpenAi = async function () {
  const { OPENAI_KEY: openaiKey, OPENAI_API_ENDPOINT: endpoint } =
    await getConfig();
  if (!openaiKey) {
    throw new KnownError(
      `Missing OpenAI key. Use \`${commandName} config\` to set it.`
    );
  }
  const openai = new OpenAI({
    apiKey: openaiKey,
    baseURL: endpoint,
  });
  return openai;
};

export const getCompletion = async function (options: {
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[];
  options: RunOptions;
}) {
  const { MODEL: model } = await getConfig();
  const openai = await getOpenAi();
  const useModel = model || defaultModel;

  if (USE_ASSISTANT) {
    let assistantId: string;
    const assistants = await openai.beta.assistants.list({
      limit: 100,
    });
    const assistant = assistants.data.find(
      (assistant) =>
        (assistant.metadata as any)?.[assistantIdentifierMetadataKey] ===
        assistantIdentifierMetadataValue
    );
    if (assistant) {
      assistantId = assistant.id;
    } else {
      const assistant = await openai.beta.assistants.create({
        name: 'Micro Agent',
        model: useModel,
        metadata: {
          [assistantIdentifierMetadataKey]: assistantIdentifierMetadataValue,
        },
      });
      assistantId = assistant.id;
    }
    let threadId = options.options.threadId;
    if (!threadId) {
      const thread = await openai.beta.threads.create();
      threadId = thread.id;
    }
    options.options.threadId = threadId;

    let result = '';
    return new Promise<string>((resolve) => {
      openai.beta.threads.runs
        .stream(threadId, {
          instructions: systemPrompt,
          assistant_id: assistantId,
          additional_messages: options.messages.filter(
            (message) => message.role !== 'system'
          ) as RunCreateParams.AdditionalMessage[],
        })
        .on('textDelta', (textDelta) => (result += textDelta.value))
        .on('textDone', () => resolve(result));
    });
  } else {
    const completion = await openai.chat.completions.create({
      model: model || defaultModel,
      messages: options.messages,
    });
    return completion.choices[0].message.content;
  }
};