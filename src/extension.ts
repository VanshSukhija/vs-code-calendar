// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { initExtensionGlobalState } from './initExtensionGlobalState';
import TimeTracker from './time-tracker';
import { resetExtensionGlobalState } from './utils/flags';
import { extensionGlobalStateKey } from './utils/constants';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {
  initExtensionGlobalState(context);

  const timeTracker: TimeTracker = TimeTracker.getInstance();

  console.log('Congratulations, your extension "vs-code-calendar" is now active!');

  vscode.window.onDidChangeWindowState((e) => {
    if (e.focused) {
      timeTracker.resetTracker();
    } else {
      timeTracker.saveTimeDifference(context);
    }
  });

  vscode.window.showInformationMessage('VS Code Calendar is active!');

  if (resetExtensionGlobalState) {
    context.subscriptions.push(
      vscode.commands.registerCommand('vs-code-calendar.resetExtensionGlobalState', () => {
        context.globalState.update(extensionGlobalStateKey, Object());
      })
    );
  }
}

// This method is called when your extension is deactivated
export function deactivate() {
  if (resetExtensionGlobalState) {
    vscode.commands.executeCommand('vs-code-calendar.resetExtensionGlobalState');
  }
}
