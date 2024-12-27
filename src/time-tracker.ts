import * as vscode from 'vscode';
import {
  ITimeTracker,
  LanguageTime,
  TimeTrackerDataObject,
  WorkspaceTime,
} from './time-tracker.d';
import { ExtensionGlobalState } from '.';
import { secondsInADay, extensionGlobalStateKey } from './utils/constants';

export default class TimeTracker implements ITimeTracker {
  private static instance: TimeTracker;
  public static trackerGlobalStateKey: string = 'time-tracker';
  private startTime: Date;
  private languageId: string;

  private constructor() {
    this.startTime = new Date();
    this.languageId = vscode.window.activeTextEditor?.document.languageId ?? '';
  }

  public static getInstance(): TimeTracker {
    if (!TimeTracker.instance) {
      TimeTracker.instance = new TimeTracker();
    }

    return TimeTracker.instance;
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
    this.startTime = new Date();
    this.languageId = vscode.window.activeTextEditor?.document.languageId ?? '';
  }

  private saveTimeDifferenceHelper(
    context: vscode.ExtensionContext,
    languageId: string,
    differenceInSeconds: number,
    date: string
  ): void {
    if (!vscode.workspace.name) {
      return;
    }

    const extensionGlobalState: ExtensionGlobalState = context.globalState.get(
      extensionGlobalStateKey,
      Object() as ExtensionGlobalState
    );

    const timeTrackerDataObjectArray: TimeTrackerDataObject[] =
      extensionGlobalState[TimeTracker.trackerGlobalStateKey];
    const trackerObjectWithSameDate: TimeTrackerDataObject | undefined =
      timeTrackerDataObjectArray.find((data) => data.date === date);

    const newLanguageTime: LanguageTime = {
      languageId: languageId,
      timeTracked: differenceInSeconds,
    };
    const newWorkspaceTime: WorkspaceTime = {
      workspace: vscode.workspace.name,
      languages: [newLanguageTime],
    };

    if (trackerObjectWithSameDate) {
      const dateObjectWithUserWorkspace: WorkspaceTime | undefined =
        trackerObjectWithSameDate.workspaces.find(
          (data) => data.workspace === vscode.workspace.name
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

  public saveTimeDifference(context: vscode.ExtensionContext): void {
    if (this.languageId === '') {
      return;
    }

    const startTime: Date = this.startTime;
    const languageId: string = this.languageId;
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

    this.resetTracker();
  }

  public subscribeToEvents(context: vscode.ExtensionContext): void {
    context.subscriptions.push(
      vscode.window.onDidChangeWindowState((event) => {
        if (event.focused) {
          TimeTracker.getInstance().resetTracker();
        } else {
          TimeTracker.getInstance().saveTimeDifference(context);
        }
      })
    );
  }
}
