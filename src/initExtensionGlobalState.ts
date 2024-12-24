import * as vscode from 'vscode';
import { ExtensionGlobalState } from './index.d';

export function initExtensionGlobalState(context: vscode.ExtensionContext) {
  const extensionGlobalState: ExtensionGlobalState = context.globalState.get(
    'vs-code-calendar',
    Object()
  );

  if (!extensionGlobalState['time-tracker']) {
    extensionGlobalState['time-tracker'] = [];
    context.globalState.update('vs-code-calendar', extensionGlobalState);
  }
}
