import * as vscode from "vscode";

export type TimeTrackerDataObject = {
  date: string;
  data: WorkspaceTime[];
};

export type WorkspaceTime = {
  timeTracked: number;
  workspace: string;
};

export interface TimeTracker {
  calculateTimeDifference(): number;
  saveTimeDifference(context: vscode.ExtensionContext): void;
}
