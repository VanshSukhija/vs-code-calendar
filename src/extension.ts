// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { initExtensionGlobalState } from './initExtensionGlobalState';
import TimeTracker from './time-tracker';
import {
  resetExtensionGlobalState,
  startWithEmptyGlobalState,
} from './utils/flags';
import { extensionGlobalStateKey } from './utils/constants';
import WorkspaceCountTracker from './workspace-count-tracker';
import FileLanguageCountTracker from './file-language-count-tracker';
import TerminalCountTracker from './terminal-count-tracker';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  console.log(
    'Congratulations, your extension "vs-code-calendar" is now active!'
  );

  if (startWithEmptyGlobalState) {
    context.globalState.update(extensionGlobalStateKey, undefined);
  }

  initExtensionGlobalState(context);

  TimeTracker.getInstance().subscribeToEvents(context);
  WorkspaceCountTracker.getInstance().incrementCounter(context);
  FileLanguageCountTracker.getInstance().incrementCounter(context);
  TerminalCountTracker.getInstance().incrementCounter(context);

  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(() => {
      TimeTracker.getInstance().saveTimeDifference(context);
      TimeTracker.getInstance().resetTracker();

      FileLanguageCountTracker.getInstance().incrementCounter(context);
    })
  );

  context.subscriptions.push(
    vscode.window.onDidOpenTerminal(() => {
      TerminalCountTracker.getInstance().incrementCounter(context);
    })
  );

  context.subscriptions.push(
    vscode.window.onDidStartTerminalShellExecution((event) => {
      const rawCommand: string = event.execution.commandLine.value;
      TerminalCountTracker.getInstance()
        .extractCoreCommands(rawCommand)
        .forEach((command) =>
          TerminalCountTracker.getInstance().incrementCounter(context, command)
        );
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('vs-code-calendar.saveBeforeClose', () => {
      TimeTracker.getInstance().saveTimeDifference(context);
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
