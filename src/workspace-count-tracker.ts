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
    if (!vscode.workspace.name) {
      return;
    }

    const workspaceName: string = vscode.workspace.name;
    const today: string = new Date().toLocaleDateString();
    const extensionGlobalState: ExtensionGlobalState = context.globalState.get(
      extensionGlobalStateKey,
      Object() as ExtensionGlobalState
    );
    const workspaceCountTrackerData: CountTrackerDataObject[] =
      extensionGlobalState[WorkspaceCountTracker.trackerGlobalStateKey];
    const newWorkspace: WorkspaceCounter = {
      workspace: workspaceName,
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
          (workspace) => workspace.workspace === workspaceName
        );

      if (workspaceCounter) {
        workspaceCounter.timesOpened++;
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
