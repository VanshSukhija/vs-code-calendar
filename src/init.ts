import * as vscode from 'vscode';
import { ExtensionGlobalState } from '.';
import { extensionGlobalStateKey } from './utils/constants';
import TimeTracker from './time-tracker';
import WorkspaceCountTracker from './workspace-count-tracker';
import FileLanguageCountTracker from './file-language-count-tracker';
import TerminalCountTracker from './terminal-count-tracker';
import { v7 as uuidv7 } from 'uuid';
import {
  resetExtensionGlobalStateFlag,
  startWithEmptyGlobalStateFlag,
} from './utils/flags';

function setUserIdAndName(context: vscode.ExtensionContext): void {
  const extensionGlobalState: ExtensionGlobalState = context.globalState.get(
    extensionGlobalStateKey,
    Object() as ExtensionGlobalState
  );

  vscode.window
    .showInputBox({
      title: 'VS Code Calendar: Please enter your name',
      placeHolder: 'John Doe',
      validateInput: (value) => {
        value = value.trim();
        return value.length > 0 ? null : 'Name cannot be empty';
      },
    })
    .then((value) => {
      if (!extensionGlobalState['userId']) {
        extensionGlobalState['userId'] = uuidv7();
      }

      if (value) {
        value = value.trim();
        extensionGlobalState['userName'] = value;
        vscode.window.showInformationMessage(`Hello, ${value}!`);
      } else if (!extensionGlobalState['userName']) {
        vscode.authentication.getAccounts('github').then((accounts) => {
          extensionGlobalState['userName'] =
            accounts.length > 0 ? accounts[0].label : 'Anonymous';
        });
        vscode.window.showInformationMessage(
          'You can always change your name using the command "VS Code Calendar: Change Name"'
        );
      }
    })
    .then(() =>
      context.globalState.update(extensionGlobalStateKey, extensionGlobalState)
    );
}

function resetExtensionGlobalState(context: vscode.ExtensionContext): void {
  context.globalState.update(extensionGlobalStateKey, undefined);
}

export function initExtensionGlobalState(
  context: vscode.ExtensionContext
): void {
  context.globalState.setKeysForSync([extensionGlobalStateKey]);

  if (startWithEmptyGlobalStateFlag) {
    context.globalState.update(extensionGlobalStateKey, undefined);
  }

  const extensionGlobalState: ExtensionGlobalState = context.globalState.get(
    extensionGlobalStateKey,
    Object() as ExtensionGlobalState
  );

  if (!extensionGlobalState['userId']) {
    setUserIdAndName(context);
  }

  if (!extensionGlobalState[TimeTracker.trackerGlobalStateKey]) {
    extensionGlobalState[TimeTracker.trackerGlobalStateKey] = [];
  }

  if (!extensionGlobalState[WorkspaceCountTracker.trackerGlobalStateKey]) {
    extensionGlobalState[WorkspaceCountTracker.trackerGlobalStateKey] = [];
  }

  if (!extensionGlobalState[FileLanguageCountTracker.trackerGlobalStateKey]) {
    extensionGlobalState[FileLanguageCountTracker.trackerGlobalStateKey] = [];
  }

  if (!extensionGlobalState[TerminalCountTracker.trackerGlobalStateKey]) {
    extensionGlobalState[TerminalCountTracker.trackerGlobalStateKey] = [];
  }

  context.globalState.update(extensionGlobalStateKey, extensionGlobalState);
}

export function initTrackers(context: vscode.ExtensionContext): void {
  TimeTracker.getInstance().initiateTracker(context);
  WorkspaceCountTracker.getInstance().initiateTracker(context);
  FileLanguageCountTracker.getInstance().initiateTracker(context);
  TerminalCountTracker.getInstance().initiateTracker(context);
}

export function pushCommands(context: vscode.ExtensionContext): void {
  if (resetExtensionGlobalStateFlag) {
    context.subscriptions.push(
      vscode.commands.registerCommand(
        'vs-code-calendar.resetExtensionGlobalState',
        () => resetExtensionGlobalState(context)
      )
    );
  }

  context.subscriptions.push(
    vscode.commands.registerCommand('vs-code-calendar.changeName', () =>
      setUserIdAndName(context)
    )
  );
}
