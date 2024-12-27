import { CountTrackerDataObject } from './count-tracker.d';
import { TimeTrackerDataObject } from './time-tracker.d';

export interface ExtensionGlobalState {
  [key: string]: any;
  'time-tracker': TimeTrackerDataObject[];
  'workspace-count-tracker': CountTrackerDataObject[];
  'file-language-count-tracker': CountTrackerDataObject[];
  'terminal-count-tracker': CountTrackerDataObject[];
}
