import * as vscode from "vscode";
import { TimeTrackerDataObject, WorkspaceTime } from "./time-tracker.d";

export default class TimeTracker {
  private static instance: TimeTracker;
  private startTime: string;

  private constructor() {
    this.startTime = new Date().toLocaleString();
  }

  public static getInstance(): TimeTracker {
    if (!TimeTracker.instance) {
      TimeTracker.instance = new TimeTracker();
    }

    return TimeTracker.instance;
  }

  private calculateTimeDifference(): number {
    const start: Date = new Date(this.startTime);
    const end: Date = new Date();
    const difference: number = end.getTime() - start.getTime();
    return difference;
  }

  public resetTracker(): void {
    this.startTime = new Date().toLocaleString();
  }

  public saveTimeDifference(context: vscode.ExtensionContext): void {
    const difference: number = this.calculateTimeDifference();
    const timeTrackerDataObjectArray: TimeTrackerDataObject[] =
      context.globalState.get("vs-code-calendar-time-tracker", []);
    const today: string = new Date().toLocaleDateString();

    const timeTrackerDataObject: TimeTrackerDataObject | undefined =
      timeTrackerDataObjectArray.find((data) => data.date === today);

    if (timeTrackerDataObject) {
      const workspaceTimeObject: WorkspaceTime | undefined =
        timeTrackerDataObject.data.find(
          (data) => data.workspace === (vscode.workspace.name ?? "undefined")
        );

      if (workspaceTimeObject) {
        workspaceTimeObject.timeTracked += difference;
      } else {
        timeTrackerDataObject.data.push({
          timeTracked: difference,
          workspace: vscode.workspace.name ?? "undefined",
        });
      }
    } else {
      timeTrackerDataObjectArray.push({
        date: today,
        data: [
          {
            timeTracked: difference,
            workspace: vscode.workspace.name ?? "undefined",
          },
        ],
      });
    }

    context.globalState.update(
      "vs-code-calendar-time-tracker",
      timeTrackerDataObjectArray
    );
  }
}
