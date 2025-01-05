// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { initExtensionGlobalState, initTrackers, pushCommands } from './init';
import { resetExtensionGlobalStateFlag } from './utils/flags';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  console.log(
    'Congratulations, your extension "vs-code-calendar" is now active!'
  );
  vscode.window.showInformationMessage('VS Code Calendar is active!');

  initExtensionGlobalState(context);
  pushCommands(context);
  initTrackers(context);
}

// This method is called when your extension is deactivated
export function deactivate() {
  vscode.commands.executeCommand('vs-code-calendar.saveBeforeClose');

  if (resetExtensionGlobalStateFlag) {
    vscode.commands.executeCommand(
      'vs-code-calendar.resetExtensionGlobalState'
    );
  }
}
