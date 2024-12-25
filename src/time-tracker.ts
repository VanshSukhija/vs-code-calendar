import * as vscode from 'vscode';
import {
  ITimeTracker,
  LanguageTime,
  TimeTrackerDataObject,
  WorkspaceTime,
} from './time-tracker.d';
import { ExtensionGlobalState } from './index.d';
import { msInDay, extensionGlobalStateKey } from './utils/constants';

export default class TimeTracker implements ITimeTracker {
  private static instance: ITimeTracker;
  private static trackerGlobalStateKey: string = 'time-tracker';
  private startTime: Date;
  private languageId: string;

  private constructor() {
    this.startTime = new Date();
    this.languageId = vscode.window.activeTextEditor?.document.languageId ?? '';
  }

  public static getInstance(): ITimeTracker {
    if (!TimeTracker.instance) {
      TimeTracker.instance = new TimeTracker();
    }

    return TimeTracker.instance;
  }

  public static get getTrackerGlobalStateKey(): string {
    return this.trackerGlobalStateKey;
  }

  private calculateTimeDifference(start: string, end: string): number {
    const startTimeStamp: Date = new Date(start);
    const endTimeStamp: Date = new Date(end);
    const difference: number =
      endTimeStamp.getTime() - startTimeStamp.getTime();
    return difference;
  }

  public resetTracker(): void {
    this.startTime = new Date();
    this.languageId = vscode.window.activeTextEditor?.document.languageId ?? '';
  }

  private saveTimeDifferenceHelper(
    context: vscode.ExtensionContext,
    languageId: string,
    difference: number,
    date: string
  ): void {
    if (!vscode.workspace.name) {
      return;
    }

    const extensionGlobalState: ExtensionGlobalState = context.globalState.get(
      extensionGlobalStateKey,
      Object()
    );

    const timeTrackerDataObjectArray: TimeTrackerDataObject[] =
      extensionGlobalState[TimeTracker.trackerGlobalStateKey];

    const trackerObjectWithSameDate: TimeTrackerDataObject | undefined =
      timeTrackerDataObjectArray.find((data) => data.date === date);

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
          workspaceObjectWithSameLanguage.timeTracked += difference;
        } else {
          dateObjectWithUserWorkspace.languages.push({
            languageId: languageId,
            timeTracked: difference,
          });
        }
      } else {
        trackerObjectWithSameDate.workspaces.push({
          workspace: vscode.workspace.name,
          languages: [
            {
              languageId: languageId,
              timeTracked: difference,
            },
          ],
        });
      }
    } else {
      timeTrackerDataObjectArray.push({
        date: date,
        workspaces: [
          {
            workspace: vscode.workspace.name,
            languages: [
              {
                languageId: languageId,
                timeTracked: difference,
              },
            ],
          },
        ],
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
      const difference: number = this.calculateTimeDifference(
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
        difference,
        startTime.toLocaleDateString() // 'MM/DD/YYYY'
      );

      startTime.setDate(startTime.getDate() + 1);
      startTime.setHours(0, 0, 0);
    }

    while (endTime.getTime() - startTime.getTime() >= msInDay) {
      const difference: number = msInDay;

      this.saveTimeDifferenceHelper(
        context,
        languageId,
        difference,
        startTime.toLocaleDateString() // 'MM/DD/YYYY'
      );

      startTime.setDate(startTime.getDate() + 1);
    }

    const difference: number = this.calculateTimeDifference(
      startTime.toLocaleString(), // 'MM/DD/YYYY, HH:MM:SS PM'
      endTime.toLocaleString() // 'MM/DD/YYYY, HH:MM:SS PM'
    );

    this.saveTimeDifferenceHelper(
      context,
      languageId,
      difference,
      startTime.toLocaleDateString() // 'MM/DD/YYYY'
    );

    this.resetTracker();
  }
}
