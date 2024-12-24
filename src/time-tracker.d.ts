import * as vscode from 'vscode';

export type TimeTrackerDataObject = {
  date: string;
  workspaces: WorkspaceTime[];
};

export type WorkspaceTime = {
  timeTracked: number;
  workspace: string;
};

export interface TimeTracker {
  getTrackerGlobalStateKey(): string;
  calculateTimeDifference(): number;
  resetTracker(): void;
  saveTimeDifferenceHelper(
    context: vscode.ExtensionContext,
    difference: number,
    date: string
  ): void;
  saveTimeDifference(context: vscode.ExtensionContext): void;
}
