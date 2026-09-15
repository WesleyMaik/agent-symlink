import * as p from '@clack/prompts';
import { runInstructionsFlow } from './instructions.js';
import { runSkillsFlow } from './skills.js';
import { runRulesFlow } from './rules.js';
import { runSinglePresetFlow, runMultiplePresetsFlow } from './presets.js';
import { runInspectFlow } from './inspect.js';
import { runUnlinkFlow } from './unlink.js';
import type { LinkOptions } from '../types/index.js';

export type MenuAction =
  'instructions' | 'skills' | 'rules' | 'preset' | 'presets_multi' | 'inspect' | 'unlink' | 'exit';

/**
 * Displays the interactive main menu and routes to the selected workflow.
 */
export async function showMainMenu(options: LinkOptions = {}): Promise<boolean> {
  const choice = await p.select<MenuAction>({
    message: 'What do you want to link?',
    options: [
      { label: 'Instruction file', value: 'instructions', hint: 'e.g. AGENTS.md -> CLAUDE.md' },
      { label: 'Skills directory', value: 'skills', hint: 'e.g. .agents/skills -> .claude/skills' },
      {
        label: 'Rules / configuration directory',
        value: 'rules',
        hint: 'e.g. .agent-config/rules'
      },
      { label: 'Apply an agent preset', value: 'preset', hint: 'Configure single agent' },
      {
        label: 'Apply multiple agent presets',
        value: 'presets_multi',
        hint: 'Configure multiple agents'
      },
      { label: 'Inspect existing symlinks', value: 'inspect', hint: 'Check status and target' },
      { label: 'Remove a symlink', value: 'unlink', hint: 'Safely delete link only' },
      { label: 'Exit', value: 'exit' }
    ]
  });

  if (p.isCancel(choice) || choice === 'exit') {
    return false;
  }

  switch (choice) {
    case 'instructions':
      await runInstructionsFlow(options);
      break;
    case 'skills':
      await runSkillsFlow(options);
      break;
    case 'rules':
      await runRulesFlow(options);
      break;
    case 'preset':
      await runSinglePresetFlow(options);
      break;
    case 'presets_multi':
      await runMultiplePresetsFlow(options);
      break;
    case 'inspect':
      await runInspectFlow(options);
      break;
    case 'unlink':
      await runUnlinkFlow(options);
      break;
  }

  return true;
}
