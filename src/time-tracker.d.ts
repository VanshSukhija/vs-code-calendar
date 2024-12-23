import * as vscode from 'vscode';

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
  resetTracker(): void;
  saveTimeDifferenceHelper(
    context: vscode.ExtensionContext,
    difference: number,
    date: string
  ): void;
  saveTimeDifference(context: vscode.ExtensionContext): void;
}
