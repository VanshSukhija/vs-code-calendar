// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import TimeTracker from './time-tracker';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {
  const timeTracker: TimeTracker = TimeTracker.getInstance();

  console.log(
    'Congratulations, your extension "vs-code-calendar" is now active!'
  );

  vscode.window.onDidChangeWindowState((e) => {
    if (e.focused) {
      timeTracker.resetTracker();
    } else {
      timeTracker.saveTimeDifference(context);
    }
  });

  vscode.window.showInformationMessage('VS Code Calendar is active!');
}

// This method is called when your extension is deactivated
export function deactivate() {}
