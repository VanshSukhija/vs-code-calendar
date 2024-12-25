// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { initExtensionGlobalState } from './initExtensionGlobalState';
import TimeTracker from './time-tracker';
import { ITimeTracker } from './time-tracker.d';
import {
  resetExtensionGlobalState,
  startWithEmptyGlobalState,
} from './utils/flags';
import { extensionGlobalStateKey } from './utils/constants';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {
  if (startWithEmptyGlobalState) {
    context.globalState.update(extensionGlobalStateKey, undefined);
  }

  initExtensionGlobalState(context);

  const timeTracker: ITimeTracker = TimeTracker.getInstance();

  console.log(
    'Congratulations, your extension "vs-code-calendar" is now active!'
  );

  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(() => {
      timeTracker.saveTimeDifference(context);
      timeTracker.resetTracker();
    })
  );

  context.subscriptions.push(
    vscode.window.onDidChangeWindowState((e) => {
      if (e.focused) {
        timeTracker.resetTracker();
      } else {
        timeTracker.saveTimeDifference(context);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('vs-code-calendar.saveBeforeClose', () => {
      timeTracker.saveTimeDifference(context);
    })
  );

  if (resetExtensionGlobalState) {
    context.subscriptions.push(
      vscode.commands.registerCommand(
        'vs-code-calendar.resetExtensionGlobalState',
        () => {
          context.globalState.update(extensionGlobalStateKey, undefined);
        }
      )
    );
  }

  vscode.window.showInformationMessage('VS Code Calendar is active!');
}

// This method is called when your extension is deactivated
export function deactivate() {
  vscode.commands.executeCommand('vs-code-calendar.saveBeforeClose');

  if (resetExtensionGlobalState) {
    vscode.commands.executeCommand(
      'vs-code-calendar.resetExtensionGlobalState'
    );
  }
}
