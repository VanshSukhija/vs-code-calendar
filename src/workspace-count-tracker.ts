import * as vscode from 'vscode';
import {
  CountTrackerDataObject,
  ICountTracker,
  WorkspaceCounter,
} from './count-tracker.d';
import { extensionGlobalStateKey } from './utils/constants';
import { ExtensionGlobalState } from '.';

export default class WorkspaceCountTracker implements ICountTracker {
  private static instance: WorkspaceCountTracker;
  public static trackerGlobalStateKey: string = 'workspace-count-tracker';

  private constructor() {}

  public static getInstance(): WorkspaceCountTracker {
    if (!WorkspaceCountTracker.instance) {
      WorkspaceCountTracker.instance = new WorkspaceCountTracker();
    }

    return WorkspaceCountTracker.instance;
  }

  public incrementCounter(context: vscode.ExtensionContext): void {
    if (!vscode.workspace.workspaceFolders) {
      return;
    }

    const workspace: string = vscode.workspace.workspaceFolders[0].name;
    const rootPath: string = vscode.workspace.workspaceFolders[0].uri.fsPath;
    const today: string = new Date().toLocaleDateString();
    const extensionGlobalState: ExtensionGlobalState = context.globalState.get(
      extensionGlobalStateKey,
      Object() as ExtensionGlobalState
    );
    const workspaceCountTrackerData: CountTrackerDataObject[] =
      extensionGlobalState[WorkspaceCountTracker.trackerGlobalStateKey];
    const newWorkspace: WorkspaceCounter = {
      workspace,
      rootPath,
      timesOpened: 1,
    };

    const workspaceCountTrackerDataForToday:
      | CountTrackerDataObject
      | undefined = workspaceCountTrackerData.find(
      (data) => data.date === today
    );

    if (workspaceCountTrackerDataForToday) {
      if (!workspaceCountTrackerDataForToday.workspaces) {
        return;
      }
      const workspaceCounter: WorkspaceCounter | undefined =
        workspaceCountTrackerDataForToday.workspaces.find(
          (ws) => ws.workspace === workspace && ws.rootPath === rootPath
        );

      if (workspaceCounter) {
        workspaceCounter.timesOpened += 1;
      } else {
        workspaceCountTrackerDataForToday.workspaces.push(newWorkspace);
      }
    } else {
      workspaceCountTrackerData.push({
        date: today,
        workspaces: [newWorkspace],
      });
    }

    context.globalState.update(extensionGlobalStateKey, extensionGlobalState);
  }
}
