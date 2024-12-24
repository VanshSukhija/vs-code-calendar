import * as vscode from 'vscode';
import { TimeTrackerDataObject, WorkspaceTime } from './time-tracker.d';
import { ExtensionGlobalState } from './index.d';
import { msInDay, extensionGlobalStateKey } from './utils/constants';

export default class TimeTracker {
  private static instance: TimeTracker;
  private trackerGlobalStateKey: string = 'time-tracker';
  private startTime: Date;

  private constructor() {
    this.startTime = new Date();
  }

  public static getInstance(): TimeTracker {
    if (!TimeTracker.instance) {
      TimeTracker.instance = new TimeTracker();
    }

    return TimeTracker.instance;
  }

  public get getTrackerGlobalStateKey(): string {
    return this.trackerGlobalStateKey;
  }

  private calculateTimeDifference(start: string, end: string): number {
    const startTimeStamp: Date = new Date(start);
    const endTimeStamp: Date = new Date(end);
    const difference: number = endTimeStamp.getTime() - startTimeStamp.getTime();
    return difference;
  }

  public resetTracker(): void {
    this.startTime = new Date();
  }

  private saveTimeDifferenceHelper(
    context: vscode.ExtensionContext,
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
      extensionGlobalState[this.trackerGlobalStateKey];

    const trackerObjectWithSameDate: TimeTrackerDataObject | undefined =
      timeTrackerDataObjectArray.find((data) => data.date === date);

    if (trackerObjectWithSameDate) {
      const dateObjectWithUserWorkspace: WorkspaceTime | undefined =
        trackerObjectWithSameDate.workspaces.find(
          (data) => data.workspace === vscode.workspace.name
        );

      if (dateObjectWithUserWorkspace) {
        dateObjectWithUserWorkspace.timeTracked += difference;
      } else {
        trackerObjectWithSameDate.workspaces.push({
          timeTracked: difference,
          workspace: vscode.workspace.name,
        });
      }
    } else {
      timeTrackerDataObjectArray.push({
        date: date,
        workspaces: [
          {
            timeTracked: difference,
            workspace: vscode.workspace.name,
          },
        ],
      });
    }

    context.globalState.update(extensionGlobalStateKey, extensionGlobalState);
  }

  public saveTimeDifference(context: vscode.ExtensionContext): void {
    const endTime: Date = new Date();

    if (this.startTime.getDate() !== endTime.getDate()) {
      const difference: number = this.calculateTimeDifference(
        this.startTime.toLocaleString(),
        new Date(
          this.startTime.getFullYear(),
          this.startTime.getMonth(),
          this.startTime.getDate(),
          23,
          59,
          59
        ).toLocaleString() // 'MM/DD/YYYY, 23:59:59 PM'
      );

      this.saveTimeDifferenceHelper(
        context,
        difference,
        this.startTime.toLocaleDateString() // 'MM/DD/YYYY'
      );

      this.startTime.setDate(this.startTime.getDate() + 1);
      this.startTime.setHours(0, 0, 0);
    }

    while (endTime.getTime() - this.startTime.getTime() >= msInDay) {
      const difference: number = msInDay;

      this.saveTimeDifferenceHelper(
        context,
        difference,
        this.startTime.toLocaleDateString() // 'MM/DD/YYYY'
      );

      this.startTime.setDate(this.startTime.getDate() + 1);
    }

    const difference: number = this.calculateTimeDifference(
      this.startTime.toLocaleString(), // 'MM/DD/YYYY, HH:MM:SS PM'
      endTime.toLocaleString() // 'MM/DD/YYYY, HH:MM:SS PM'
    );

    this.saveTimeDifferenceHelper(
      context,
      difference,
      this.startTime.toLocaleDateString() // 'MM/DD/YYYY'
    );
  }
}
