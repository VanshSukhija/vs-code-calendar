import * as vscode from 'vscode';
import { ExtensionDump, ExtensionGlobalState, ExtensionMap } from '.';
import {
  defaultModifyLineGoal,
  extensionGlobalStateDumpKey,
  extensionGlobalStateKey,
  extensionMapKey,
  localhostURL,
} from './utils/constants';
import TimeTrackerController from './time-tracker-controller';
import WorkspaceCountTracker from './workspace-count-tracker';
import FileLanguageCountTracker from './file-language-count-tracker';
import TerminalCountTracker from './terminal-count-tracker';
import {
  clearExtensionDumpFlag,
  startWithEmptyGlobalStateFlag,
  useLocalhostForAPIFlag,
} from './utils/flags';
import dotenv from 'dotenv';
import path from 'path';
import preProcessData from './utils/process-raw-data';

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

async function setDailyGoal(): Promise<number> {
  let dailyGoal: number = -1;

  return await vscode.window
    .showInputBox({
      title: 'VS Code Calendar: Please enter your daily goal',
      placeHolder: '100',
      validateInput: (value) => {
        value = value.trim();
        return isNaN(Number(value)) ? 'Daily goal must be a number' : null;
      },
    })
    .then((value) => {
      if (value) {
        value = value.trim();
        dailyGoal = Number(value);
      }
    })
    .then(() => {
      if (dailyGoal === -1) {
        vscode.window.showInformationMessage(
          'You can always change your daily goal using the command "VS Code Calendar: Change Daily Goal"'
        );
      }

      return dailyGoal;
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
  const url: string = [
    useLocalhostForAPIFlag ? localhostURL : process.env.SERVER_URL,
    'user',
  ].join('/');

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
          extensionGlobalState['userName'] = userName;

          vscode.window.showInformationMessage(`Welcome ${userName}!`);
          context.globalState.update(
            extensionGlobalStateKey,
            extensionGlobalState
          );
        });
      } else {
        vscode.window.showErrorMessage(
          [
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

// reset all trackers in the extension global state
function resetExtensionGlobalState(context: vscode.ExtensionContext): void {
  const extensionGlobalState: ExtensionGlobalState = context.globalState.get(
    extensionGlobalStateKey,
    Object() as ExtensionGlobalState
  );

  extensionGlobalState[TimeTrackerController.trackerGlobalStateKey] = [];
  extensionGlobalState[WorkspaceCountTracker.trackerGlobalStateKey] = [];
  extensionGlobalState[FileLanguageCountTracker.trackerGlobalStateKey] = [];
  extensionGlobalState[TerminalCountTracker.trackerGlobalStateKey] = [];

  context.globalState
    .update(extensionGlobalStateKey, extensionGlobalState)
    .then(() => {
      initTrackers(context);
      vscode.window.showInformationMessage('Data reset successfully!');
    });
}

// send data to server every month
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

  const url: string = [
    useLocalhostForAPIFlag ? localhostURL : process.env.SERVER_URL,
    'user',
  ].join('/');

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
      } else {
        vscode.window.showErrorMessage('Failed to send data to server');
        response.json().then((data) => {
          console.error('data:', data);
        });
      }
    })
    .catch((error) => {
      vscode.window.showErrorMessage('An error occurred while sending data');
      console.error('error:', error);
    });
}

// dump the extension global state to the extension dump
function dumpExtensionGlobalState(context: vscode.ExtensionContext): void {
  const extensionGlobalState: ExtensionGlobalState = context.globalState.get(
    extensionGlobalStateKey,
    Object() as ExtensionGlobalState
  );
  const extensionDump: ExtensionDump = context.globalState.get(
    extensionGlobalStateDumpKey,
    Object() as ExtensionDump
  );

  const processedData: ExtensionDump = preProcessData(extensionGlobalState);

  processedData.dailyStats.forEach((day) => {
    const index = extensionDump.dailyStats.findIndex(
      (dayDump) => dayDump.date === day.date
    );
    if (index !== -1) {
      extensionDump.dailyStats[index].dailyGoal = day.dailyGoal;
      extensionDump.dailyStats[index].terminalsOpened += day.terminalsOpened;

      processedData.dailyStats[index].languages.forEach((lang) => {
        let ind: number = extensionDump.dailyStats[index].languages.findIndex(
          (langDump) => langDump.languageId === lang.languageId
        );
        if (ind !== -1) {
          extensionDump.dailyStats[index].languages[ind].timeTracked +=
            lang.timeTracked;
          extensionDump.dailyStats[index].languages[ind].linesModified +=
            lang.linesModified;
        } else {
          extensionDump.dailyStats[index].languages.push(lang);
        }
      });

      processedData.dailyStats[index].commands.forEach((cmd) => {
        let ind: number = extensionDump.dailyStats[index].commands.findIndex(
          (cmdDump) => cmdDump.command === cmd.command
        );
        if (ind !== -1) {
          extensionDump.dailyStats[index].commands[ind].executionCount +=
            cmd.executionCount;
        } else {
          extensionDump.dailyStats[index].commands.push(cmd);
        }
      });

      processedData.dailyStats[index].workspaces.forEach((workspace) => {
        let ind: number = extensionDump.dailyStats[index].workspaces.findIndex(
          (workspaceDump) => workspaceDump.rootPath === workspace.rootPath
        );
        if (ind !== -1) {
          extensionDump.dailyStats[index].workspaces[ind].timeTracked +=
            workspace.timeTracked;
          extensionDump.dailyStats[index].workspaces[ind].timesOpened +=
            workspace.timesOpened;
        } else {
          extensionDump.dailyStats[index].workspaces.push(workspace);
        }
      });
    } else {
      extensionDump.dailyStats.push(day);
    }
  });

  context.globalState
    .update(extensionGlobalStateDumpKey, extensionDump)
    .then(() => resetExtensionGlobalState(context));
}

// get flags from server and update the extension settings every time the extension is activated
async function updateFlagSettings(
  context: vscode.ExtensionContext
): Promise<void> {
  const extensionSettings: ExtensionMap = context.globalState.get(
    extensionMapKey,
    Object() as ExtensionMap
  );

  const url: string = [
    useLocalhostForAPIFlag ? localhostURL : process.env.SERVER_URL,
    'flags',
  ].join('/');

  await fetch(url)
    .then((response) => {
      if (response.ok) {
        response.json().then((data) => {
          const flags = data as { flag: string; value: boolean }[];
          flags.forEach((flag) => {
            extensionSettings[flag.flag] = flag.value;
          });
          context.globalState.update(extensionMapKey, extensionSettings);
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
  if (startWithEmptyGlobalStateFlag) {
    context.globalState.update(extensionGlobalStateKey, undefined);
    context.globalState.update(extensionMapKey, undefined);
  }

  if (clearExtensionDumpFlag) {
    context.globalState.update(extensionGlobalStateDumpKey, undefined);
  }

  updateFlagSettings(context);

  const extensionGlobalState: ExtensionGlobalState = context.globalState.get(
    extensionGlobalStateKey,
    Object() as ExtensionGlobalState
  );

  const extensionMap: ExtensionMap = context.globalState.get(
    extensionMapKey,
    Object() as ExtensionMap
  );

  const extensionDump: ExtensionDump = context.globalState.get(
    extensionGlobalStateDumpKey,
    Object() as ExtensionDump
  );

  if (!extensionDump['dailyStats']) {
    extensionDump['dailyStats'] = [];
    context.globalState.update(extensionGlobalStateDumpKey, extensionDump);
  }

  if (!extensionMap['lastSyncDate']) {
    extensionMap['lastSyncDate'] = new Date().toLocaleDateString();
    context.globalState.update(extensionMapKey, extensionMap);
  } else if (
    new Date().getMonth() !==
    new Date(extensionMap['lastSyncDate'] as string).getMonth()
  ) {
    sendDataToServer(context)
      .then(() => {
        extensionMap['lastSyncDate'] = new Date().toLocaleDateString();
        context.globalState.update(extensionMapKey, extensionMap);
      })
      .then(() => dumpExtensionGlobalState(context))
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

  if (!extensionGlobalState['dailyGoal']) {
    extensionGlobalState['dailyGoal'] = defaultModifyLineGoal;
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
  context.subscriptions.push(
    vscode.commands.registerCommand('vs-code-calendar.changeName', () =>
      setLocalUserName().then((userName) => {
        const extensionGlobalState: ExtensionGlobalState =
          context.globalState.get(
            extensionGlobalStateKey,
            Object() as ExtensionGlobalState
          );
        extensionGlobalState['userName'] = userName;
        context.globalState.update(
          extensionGlobalStateKey,
          extensionGlobalState
        );
        vscode.window.showInformationMessage(`Name changed to ${userName}`);
      })
    ),

    vscode.commands.registerCommand(
      'vs-code-calendar.sendDataToServer',
      async () => {
        await sendDataToServer(context)
          .then(() => {
            const extensionMap: ExtensionMap = context.globalState.get(
              extensionMapKey,
              Object() as ExtensionMap
            );
            extensionMap['lastSyncDate'] = new Date().toLocaleDateString();
            context.globalState.update(extensionMapKey, extensionMap);
          })
          .then(() => dumpExtensionGlobalState(context))
          .catch((error) => {
            console.error('Error:', error);
          });
      }
    ),

    vscode.commands.registerCommand('vs-code-calendar.changeDailyGoal', () =>
      setDailyGoal().then((dailyGoal) => {
        if (dailyGoal === -1) {
          return;
        }

        const extensionGlobalState: ExtensionGlobalState =
          context.globalState.get(
            extensionGlobalStateKey,
            Object() as ExtensionGlobalState
          );
        extensionGlobalState['dailyGoal'] = dailyGoal;
        context.globalState.update(
          extensionGlobalStateKey,
          extensionGlobalState
        );

        FileLanguageCountTracker.getInstance().updateStatusBarCounter(
          context,
          0
        );

        vscode.window.showInformationMessage(
          `Daily goal changed to ${dailyGoal}`
        );
      })
    ),

    vscode.commands.registerCommand('vs-code-calendar.saveBeforeClose', () => {
      if (TimeTrackerController.getInstance().statusBarClockInterval) {
        clearInterval(
          TimeTrackerController.getInstance().statusBarClockInterval
        );
      }
      if (TimeTrackerController.getInstance().saveTimeDifferenceInterval) {
        clearInterval(
          TimeTrackerController.getInstance().saveTimeDifferenceInterval
        );
      }
    })
  );
}

export function startStatusBarItems(context: vscode.ExtensionContext): void {
  TimeTrackerController.getInstance().startStatusBarClock();
  FileLanguageCountTracker.getInstance().startStatusBarCounter(context);
}
