import * as vscode from 'vscode';
import { ExtensionGlobalState } from './index.d';
import { extensionGlobalStateKey } from './utils/constants';
import TimeTracker from './time-tracker';

export function initExtensionGlobalState(context: vscode.ExtensionContext) {
  const extensionGlobalState: ExtensionGlobalState = context.globalState.get(
    extensionGlobalStateKey,
    Object()
  );

  if (!extensionGlobalState[TimeTracker.getTrackerGlobalStateKey]) {
    extensionGlobalState[TimeTracker.getTrackerGlobalStateKey] = [];
    context.globalState.update(extensionGlobalStateKey, extensionGlobalState);
  }
}
