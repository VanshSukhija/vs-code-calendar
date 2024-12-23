import * as vscode from 'vscode';
import { TimeTrackerDataObject, WorkspaceTime } from './time-tracker.d';

const msInDay: number = 86400000;

export default class TimeTracker {
  private static instance: TimeTracker;
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

  private calculateTimeDifference(start: string, end: string): number {
    const startTimeStamp: Date = new Date(start);
    const endTimeStamp: Date = new Date(end);
    const difference: number =
      endTimeStamp.getTime() - startTimeStamp.getTime();
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
    const timeTrackerDataObjectArray: TimeTrackerDataObject[] =
      context.globalState.get('vs-code-calendar-time-tracker', []);

    const timeTrackerDataObject: TimeTrackerDataObject | undefined =
      timeTrackerDataObjectArray.find((data) => data.date === date);

    if (timeTrackerDataObject) {
      const workspaceTimeObject: WorkspaceTime | undefined =
        timeTrackerDataObject.data.find(
          (data) => data.workspace === (vscode.workspace.name ?? 'undefined')
        );

      if (workspaceTimeObject) {
        workspaceTimeObject.timeTracked += difference;
      } else {
        timeTrackerDataObject.data.push({
          timeTracked: difference,
          workspace: vscode.workspace.name ?? 'undefined',
        });
      }
    } else {
      timeTrackerDataObjectArray.push({
        date: date,
        data: [
          {
            timeTracked: difference,
            workspace: vscode.workspace.name ?? 'undefined',
          },
        ],
      });
    }

    context.globalState.update(
      'vs-code-calendar-time-tracker',
      timeTrackerDataObjectArray
    );
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
