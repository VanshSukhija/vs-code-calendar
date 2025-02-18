import * as vscode from 'vscode';

export type TimeTrackerDataObject = {
  date: string;
  workspaces: WorkspaceTime[];
};

export type WorkspaceTime = {
  workspace: string;
  rootPath: string;
  languages: LanguageTime[];
};

export type LanguageTime = {
  languageId: string;
  timeTracked: number;
};

export interface ITimeTracker {
  resetTracker(): void;
  saveTimeDifference(
    context: vscode.ExtensionContext,
    languageId: string
  ): void;
}
