import {
  CountTrackerDataObject,
  TerminalCommandCounter,
} from './count-tracker.d';
import { TimeTrackerDataObject } from './time-tracker.d';

export type ExtensionGlobalState = {
  [key: string]: any;
  username: string;
  userId: string;
  dailyGoal: number;
  'time-tracker': TimeTrackerDataObject[];
  'workspace-count-tracker': CountTrackerDataObject[];
  'file-language-count-tracker': CountTrackerDataObject[];
  'terminal-count-tracker': CountTrackerDataObject[];
};

export type ExtensionMap = {
  [key: string]: any;
};

export type LanguagesDump = {
  languageId: string;
  timeTracked: number;
  linesModified: number;
};

export type WorkspacesDump = {
  workspaceName: string;
  rootPath: string;
  timeTracked: number;
  timesOpened: number;
};

export type ExtensionDump = {
  dailyStats: {
    date: string;
    terminalsOpened: number;
    dailyGoal: number;
    languages: LanguagesDump[];
    commands: TerminalCommandCounter[];
    workspaces: WorkspacesDump[];
  }[];
};

export type TextDocumentLocal = {
  uri: string;
  text: string;
  languageId: string;
};
