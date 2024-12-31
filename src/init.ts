import * as vscode from 'vscode';
import { ExtensionGlobalState } from '.';
import { extensionGlobalStateKey } from './utils/constants';
import TimeTrackerController from './time-tracker-controller';
import WorkspaceCountTracker from './workspace-count-tracker';
import FileLanguageCountTracker from './file-language-count-tracker';
import TerminalCountTracker from './terminal-count-tracker';
import { v7 as uuidv7 } from 'uuid';
import {
  resetExtensionGlobalStateFlag,
  startWithEmptyGlobalStateFlag,
} from './utils/flags';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function setUserIdAndName(
  context: vscode.ExtensionContext
): Promise<void> {
  const extensionGlobalState: ExtensionGlobalState = context.globalState.get(
    extensionGlobalStateKey,
    Object() as ExtensionGlobalState
  );

  await vscode.window
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
      }
    })
    .then(() => {
      if (!extensionGlobalState['userName']) {
        vscode.authentication.getAccounts('github').then((accounts) => {
          extensionGlobalState['userName'] =
            accounts.length > 0 ? accounts[0].label : 'Anonymous';
        });
        vscode.window.showInformationMessage(
          'You can always change your name using the command "VS Code Calendar: Change Name"'
        );
      }

      context.globalState.update(extensionGlobalStateKey, extensionGlobalState);
    });
}

function resetExtensionGlobalState(context: vscode.ExtensionContext): void {
  context.globalState.update(extensionGlobalStateKey, undefined);
}

async function sendDataToServer(
  context: vscode.ExtensionContext
): Promise<void> {
  const extensionGlobalState: ExtensionGlobalState = context.globalState.get(
    extensionGlobalStateKey,
    Object() as ExtensionGlobalState
  );

  const url: string = process.env.SERVER_URL ?? 'http://localhost:8000';

  console.log('Sending data to url:', url);

  await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(extensionGlobalState),
  }).then(
    (response) => {
      if (response.ok) {
        vscode.window.showInformationMessage('Data sent successfully!');
      } else {
        vscode.window.showErrorMessage('Failed to send data to server');
        console.log('response:', response.json());
      }
    },
    (error) => {
      vscode.window.showErrorMessage('Failed to send data to server');
      console.error('error:', error);
    }
  );
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

  if (!extensionGlobalState[TimeTrackerController.trackerGlobalStateKey]) {
    extensionGlobalState[TimeTrackerController.trackerGlobalStateKey] = [];
    context.globalState.update(extensionGlobalStateKey, extensionGlobalState);
  }

  if (!extensionGlobalState[WorkspaceCountTracker.trackerGlobalStateKey]) {
    extensionGlobalState[WorkspaceCountTracker.trackerGlobalStateKey] = [];
    context.globalState.update(extensionGlobalStateKey, extensionGlobalState);
  }

  if (!extensionGlobalState[FileLanguageCountTracker.trackerGlobalStateKey]) {
    extensionGlobalState[FileLanguageCountTracker.trackerGlobalStateKey] = [];
    context.globalState.update(extensionGlobalStateKey, extensionGlobalState);
  }

  if (!extensionGlobalState[TerminalCountTracker.trackerGlobalStateKey]) {
    extensionGlobalState[TerminalCountTracker.trackerGlobalStateKey] = [];
    context.globalState.update(extensionGlobalStateKey, extensionGlobalState);
  }

  if (!extensionGlobalState['userId']) {
    setUserIdAndName(context);
  }
}

export function initTrackers(context: vscode.ExtensionContext): void {
  TimeTrackerController.getInstance().initiateController(context);
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
    ),

    vscode.commands.registerCommand(
      'vs-code-calendar.sendDataToServer',
      async () => await sendDataToServer(context)
    ),

    vscode.commands.registerCommand('vs-code-calendar.saveBeforeClose', () => {
      const lastActiveTextEditor: vscode.TextEditor | undefined =
        TimeTrackerController.getInstance().getLastActiveTextEditor();
      if (lastActiveTextEditor) {
        TimeTrackerController.getTimeTrackers()
          .find((tracker) =>
            tracker.isTextEditorOfThisWorkspace(lastActiveTextEditor)
          )
          ?.saveTimeDifference(
            context,
            lastActiveTextEditor.document.languageId
          );
      }
    })
  );
}
