import { CountTrackerDataObject } from './count-tracker.d';
import { TimeTrackerDataObject } from './time-tracker.d';

export interface ExtensionGlobalState {
  [key: string]: any;
  username: string;
  userId: string;
  'time-tracker': TimeTrackerDataObject[];
  'workspace-count-tracker': CountTrackerDataObject[];
  'file-language-count-tracker': CountTrackerDataObject[];
  'terminal-count-tracker': CountTrackerDataObject[];
}

export interface ExtensionSettings {
  [key: string]: string | number | boolean;
}

export interface TextDocumentLocal {
  uri: string;
  text: string;
  languageId: string;
}
