import * as vscode from 'vscode';

export type CountTrackerDataObject = {
  date: string;
  workspaces?: WorkspaceCounter[];
  languages?: FileLanguageCounter[];
  terminals?: TerminalCounter;
};

export type WorkspaceCounter = {
  workspace: string;
  rootPath: string;
  timesOpened: number;
};

export type FileLanguageCounter = {
  languageId: string;
  timesOpened: number;
  linesModified: number;
};

export type TerminalCounter = {
  timesOpened: number;
  commands: TerminalCommandCounter[];
};

export type TerminalCommandCounter = {
  command: string;
  executionCount: number;
};

export interface ICountTracker {
  initiateTracker(context: vscode.ExtensionContext): void;
}
