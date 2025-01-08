import * as vscode from 'vscode';
import {
  ITimeTracker,
  LanguageTime,
  TimeTrackerDataObject,
  WorkspaceTime,
} from './time-tracker.d';
import { ExtensionGlobalState } from '.';
import { secondsInADay, extensionGlobalStateKey } from './utils/constants';
import TimeTrackerController from './time-tracker-controller';

export default class TimeTracker implements ITimeTracker {
  private startTime: Date;
  private workspaceFolder: vscode.WorkspaceFolder;
  private hasSavedTimeDifference: boolean;

  public constructor(workspaceFolder: vscode.WorkspaceFolder) {
    this.startTime = new Date();
    this.workspaceFolder = workspaceFolder;
    this.hasSavedTimeDifference = false;
  }

  public getWorkspaceFolder(): vscode.WorkspaceFolder {
    return this.workspaceFolder;
  }

  public isTextEditorOfThisWorkspace(
    textEditor: vscode.TextEditor | undefined
  ): boolean {
    if (!textEditor) {
      return false;
    }

    return textEditor.document.uri.fsPath.startsWith(
      this.workspaceFolder.uri.fsPath ?? ''
    );
  }

  private calculateTimeDifference(start: string, end: string): number {
    const startTimeStamp: Date = new Date(start);
    const endTimeStamp: Date = new Date(end);
    const differenceInSeconds: number =
      (endTimeStamp.getTime() - startTimeStamp.getTime()) / 1000;

    if (differenceInSeconds < 0) {
      return 0;
    }
    return differenceInSeconds;
  }

  public resetTracker(): void {
    if (this.hasSavedTimeDifference) {
      this.startTime = new Date();
      this.hasSavedTimeDifference = false;
    }
  }

  private saveTimeDifferenceHelper(
    context: vscode.ExtensionContext,
    languageId: string,
    differenceInSeconds: number,
    date: string
  ): void {
    const workspace: string = this.workspaceFolder.name;
    const rootPath: string = this.workspaceFolder.uri.fsPath;
    const extensionGlobalState: ExtensionGlobalState = context.globalState.get(
      extensionGlobalStateKey,
      Object() as ExtensionGlobalState
    );

    const timeTrackerDataObjectArray: TimeTrackerDataObject[] =
      extensionGlobalState[TimeTrackerController.trackerGlobalStateKey];
    const trackerObjectWithSameDate: TimeTrackerDataObject | undefined =
      timeTrackerDataObjectArray.find((data) => data.date === date);

    const newLanguageTime: LanguageTime = {
      languageId: languageId,
      timeTracked: differenceInSeconds,
    };
    const newWorkspaceTime: WorkspaceTime = {
      workspace,
      rootPath,
      languages: [newLanguageTime],
    };

    if (trackerObjectWithSameDate) {
      const dateObjectWithUserWorkspace: WorkspaceTime | undefined =
        trackerObjectWithSameDate.workspaces.find(
          (data) => data.workspace === workspace && data.rootPath === rootPath
        );

      if (dateObjectWithUserWorkspace) {
        const workspaceObjectWithSameLanguage: LanguageTime | undefined =
          dateObjectWithUserWorkspace.languages.find(
            (data) => data.languageId === languageId
          );

        if (workspaceObjectWithSameLanguage) {
          workspaceObjectWithSameLanguage.timeTracked += differenceInSeconds;
        } else {
          dateObjectWithUserWorkspace.languages.push(newLanguageTime);
        }
      } else {
        trackerObjectWithSameDate.workspaces.push(newWorkspaceTime);
      }
    } else {
      timeTrackerDataObjectArray.push({
        date: date,
        workspaces: [newWorkspaceTime],
      });
    }

    context.globalState.update(extensionGlobalStateKey, extensionGlobalState);
  }

  public saveTimeDifference(
    context: vscode.ExtensionContext,
    languageId: string
  ): void {
    if (this.hasSavedTimeDifference) {
      return;
    }

    const startTime: Date = this.startTime;
    const endTime: Date = new Date();

    if (startTime.getDate() !== endTime.getDate()) {
      const differenceInSeconds: number = this.calculateTimeDifference(
        startTime.toLocaleString(),
        new Date(
          startTime.getFullYear(),
          startTime.getMonth(),
          startTime.getDate(),
          23,
          59,
          59
        ).toLocaleString() // 'MM/DD/YYYY, 23:59:59 PM'
      );

      this.saveTimeDifferenceHelper(
        context,
        languageId,
        differenceInSeconds,
        startTime.toLocaleDateString() // 'MM/DD/YYYY'
      );

      startTime.setDate(startTime.getDate() + 1);
      startTime.setHours(0, 0, 0);
    }

    while (
      this.calculateTimeDifference(
        startTime.toLocaleString(),
        endTime.toLocaleString()
      ) >= secondsInADay
    ) {
      const differenceInSeconds: number = secondsInADay;

      this.saveTimeDifferenceHelper(
        context,
        languageId,
        differenceInSeconds,
        startTime.toLocaleDateString() // 'MM/DD/YYYY'
      );

      startTime.setDate(startTime.getDate() + 1);
    }

    const differenceInSeconds: number = this.calculateTimeDifference(
      startTime.toLocaleString(), // 'MM/DD/YYYY, HH:MM:SS PM'
      endTime.toLocaleString() // 'MM/DD/YYYY, HH:MM:SS PM'
    );

    this.saveTimeDifferenceHelper(
      context,
      languageId,
      differenceInSeconds,
      startTime.toLocaleDateString() // 'MM/DD/YYYY'
    );

    this.hasSavedTimeDifference = true;
  }
}
