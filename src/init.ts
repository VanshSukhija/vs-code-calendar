import * as vscode from 'vscode';
import { ExtensionGlobalState, ExtensionSettings } from '.';
import {
  extensionGlobalStateKey,
  extensionSettingsKey,
} from './utils/constants';
import TimeTrackerController from './time-tracker-controller';
import WorkspaceCountTracker from './workspace-count-tracker';
import FileLanguageCountTracker from './file-language-count-tracker';
import TerminalCountTracker from './terminal-count-tracker';
import {
  resetExtensionGlobalStateFlag,
  startWithEmptyGlobalStateFlag,
} from './utils/flags';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function setLocalUserName(): Promise<string> {
  let userName: string;

  return await vscode.window
    .showInputBox({
      title: 'VS Code Calendar: Please enter your name',
      placeHolder: 'John Doe',
      validateInput: (value) => {
        value = value.trim();
        return value.length > 0 ? null : 'Name cannot be empty';
      },
    })
    .then((value) => {
      if (value) {
        value = value.trim();
        userName = value;
      }
    })
    .then(() => {
      if (!userName) {
        vscode.authentication.getAccounts('github').then((accounts) => {
          userName = accounts.length > 0 ? accounts[0].label : 'Anonymous';
        });
        vscode.window.showInformationMessage(
          'You can always change your name using the command "VS Code Calendar: Change Name"'
        );
      }

      return userName;
    });
}

// create new user and register the name. User id is returned.
async function createNewUser(
  context: vscode.ExtensionContext,
  userName: string
): Promise<void> {
  const extensionGlobalState: ExtensionGlobalState = context.globalState.get(
    extensionGlobalStateKey,
    Object() as ExtensionGlobalState
  );
  const url: string = [process.env.SERVER_URL, 'user'].join('/');

  console.log('Sending data to url:', url);

  await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ userName }),
  })
    .then((response) => {
      if (response.ok) {
        response.json().then((data) => {
          const userData = data as { userId: string };
          extensionGlobalState['userId'] = userData.userId;
          console.log('User id:', userData.userId);

          vscode.window.showInformationMessage('Data sent successfully!');
          context.globalState.update(
            extensionGlobalStateKey,
            extensionGlobalState
          );
        });
      } else {
        vscode.window.showErrorMessage(
          [
            'Failed to send data to server.',
            'You are identified as "Anonymous" for now.',
            'You can change you name with the command "VS Code Calendar: Change Name"',
          ].join('\n')
        );
      }
    })
    .catch((error) => {
      vscode.window.showErrorMessage('Failed to send data to server');
      console.error('error:', error);
    });
}

function resetExtensionGlobalState(context: vscode.ExtensionContext): void {
  const extensionGlobalState: ExtensionGlobalState = context.globalState.get(
    extensionGlobalStateKey,
    Object() as ExtensionGlobalState
  );

  extensionGlobalState[TimeTrackerController.trackerGlobalStateKey] = [];
  extensionGlobalState[WorkspaceCountTracker.trackerGlobalStateKey] = [];
  extensionGlobalState[FileLanguageCountTracker.trackerGlobalStateKey] = [];
  extensionGlobalState[TerminalCountTracker.trackerGlobalStateKey] = [];

  context.globalState.update(extensionGlobalStateKey, extensionGlobalState);
}

async function sendDataToServer(
  context: vscode.ExtensionContext
): Promise<void> {
  const extensionGlobalState: ExtensionGlobalState = context.globalState.get(
    extensionGlobalStateKey,
    Object() as ExtensionGlobalState
  );

  if (!extensionGlobalState['userId']) {
    vscode.window.showErrorMessage(
      'You need to set your name before sending data to the server'
    );
    return;
  }

  const url: string = [process.env.SERVER_URL, 'user'].join('/');

  console.log('Sending data to url:', url);

  await fetch(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(extensionGlobalState),
  })
    .then((response) => {
      if (response.ok) {
        vscode.window.showInformationMessage('Data sent successfully!');
        resetExtensionGlobalState(context);
      } else {
        vscode.window.showErrorMessage('Failed to send data to server');
        console.log('response:', response.json());
      }
    })
    .catch((error) => {
      vscode.window.showErrorMessage('Failed to send data to server');
      console.error('error:', error);
    });
}

async function updateFlagSettings(
  context: vscode.ExtensionContext
): Promise<void> {
  const extensionSettings: ExtensionSettings = context.globalState.get(
    extensionSettingsKey,
    Object() as ExtensionSettings
  );

  const url: string = [process.env.SERVER_URL, 'flags'].join('/');
  console.log('Getting flags from url:', url);

  await fetch(url)
    .then((response) => {
      if (response.ok) {
        response.json().then((data) => {
          const flags = data as { flag: string; value: boolean }[];
          flags.forEach((flag) => {
            extensionSettings[flag.flag] = flag.value;
          });
          context.globalState.update(extensionSettingsKey, extensionSettings);

          console.log('Flags updated:', flags);
        });
      } else {
        console.log('Failed to get flags from server');
      }
    })
    .catch((error) => {
      console.error('Error:', error);
    });
}

export function initExtensionGlobalState(
  context: vscode.ExtensionContext
): void {
  context.globalState.setKeysForSync([
    extensionGlobalStateKey,
    extensionSettingsKey,
  ]);

  if (startWithEmptyGlobalStateFlag) {
    context.globalState.update(extensionGlobalStateKey, undefined);
    context.globalState.update(extensionSettingsKey, undefined);
  }

  updateFlagSettings(context);

  const extensionGlobalState: ExtensionGlobalState = context.globalState.get(
    extensionGlobalStateKey,
    Object() as ExtensionGlobalState
  );

  const extensionSettings: ExtensionSettings = context.globalState.get(
    extensionSettingsKey,
    Object() as ExtensionSettings
  );

  if (!extensionSettings['lastSyncDate']) {
    extensionSettings['lastSyncDate'] = new Date().toLocaleDateString();
    context.globalState.update(extensionSettingsKey, extensionSettings);
  } else if (
    new Date().getMonth() !==
    new Date(extensionSettings['lastSyncDate'] as string).getMonth()
  ) {
    sendDataToServer(context)
      .then(() => {
        extensionSettings['lastSyncDate'] = new Date().toLocaleDateString();
        context.globalState.update(extensionSettingsKey, extensionSettings);
      })
      .catch((error) => {
        console.error('Error:', error);
      });
  }

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
    setLocalUserName().then(
      async (userName) => await createNewUser(context, userName)
    );
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
      setLocalUserName().then((userName) => {
        vscode.window.showInformationMessage(`Name changed to ${userName}`);
      })
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
