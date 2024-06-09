import { it, describe, vi, expect } from 'vitest';
import { interactiveMode } from './interactive-mode';
import { gray } from 'kolorist';
import { success } from './test';


const mocks = vi.hoisted(() => {
  return {
    glob: vi.fn(),
    getConfig: vi.fn(),
    setConfigs: vi.fn(),
    readFile: vi.fn(),
    writeFile: vi.fn(),
    exitOnCancel: vi.fn(),
    intro: vi.fn(),
    text: vi.fn(),
    logInfo: vi.fn(),
    logError: vi.fn(),
    logSuccess: vi.fn(),
    logStep: vi.fn(),
    spinner: vi.fn(),
    getSimpleCompletion: vi.fn(),
    runAll: vi.fn(),
  };
});

vi.mock('glob', () => {
  return {
    glob: mocks.glob
  };
});

vi.mock('./config', () => {
  return {
    getConfig: mocks.getConfig,
    setConfigs: mocks.setConfigs,
  };
});

vi.mock('fs/promises', () => {
  return {
    readFile: mocks.readFile,
    writeFile: mocks.writeFile,
  };
});

vi.mock('@clack/prompts', () => {
  return {
    intro: mocks.intro,
    log: {
      info: mocks.logInfo,
      error: mocks.logError,
      success: mocks.logSuccess,
      step: mocks.logStep,
    },
    spinner: mocks.spinner,
    text: mocks.text,
  };
});

vi.mock('./llm', () => {
  return {
    getSimpleCompletion: mocks.getSimpleCompletion,
  };
});

vi.mock('./run', () => {
  return {
    runAll: mocks.runAll,
  };
});


describe('interactiveMode', () => {

  it('should ask for the OpenAI key if it is not set', async () => {
    // Mock the dependencies and inputs
    const mockConfig = {
      OPENAI_KEY: '',
    };
    const myOpenaiKey = 'my-openai-key';

    mocks.getConfig.mockResolvedValueOnce(mockConfig);
    mocks.setConfigs.mockResolvedValueOnce(undefined);
    mocks.text.mockResolvedValueOnce(myOpenaiKey)
              .mockResolvedValueOnce('a function that...')
              .mockResolvedValueOnce('good');
    mocks.glob.mockResolvedValueOnce([
      'file1.js',
      'file2.js',
      'file3.js',
    ]);
    mocks.readFile.mockResolvedValue('file content');
    mocks.getSimpleCompletion.mockResolvedValue('generated content');

    await interactiveMode({
      outputFile: 'something.js',
    });

    expect(mocks.text).toHaveBeenCalledWith({
      message: `Welcome newcomer! What is your OpenAI key? ${gray(
        '(this is kept private)'
      )}`,
    });

    expect(mocks.setConfigs).toHaveBeenCalledWith([['OPENAI_KEY', myOpenaiKey]]);

  });
    

});