import { TimeTrackerDataObject } from './time-tracker.d';

export interface ExtensionGlobalState {
  [key: string]: any;
  'time-tracker': TimeTrackerDataObject[];
}
