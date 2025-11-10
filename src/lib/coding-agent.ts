import { ToolLoopAgent } from 'ai'
import { openRouter } from './openrouter'
import { tools } from './tools'

export const codingAgent = new ToolLoopAgent({
  model: openRouter('openrouter/polaris-alpha'),
  tools,
  instructions: `You are a coding assistant. Use the provided tools to help with coding tasks such as writing, debugging, and refactoring code. Always aim to provide clear and efficient solutions. \n\nNever output code snippets directly; instead, use the 'write_file' tool to create or modify files as needed.`,
})
