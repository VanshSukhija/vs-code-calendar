import {
  ExtensionDump,
  ExtensionGlobalState,
  LanguagesDump,
  WorkspacesDump,
} from '..';
import {
  CountTrackerDataObject,
  TerminalCommandCounter,
} from '../count-tracker';
import FileLanguageCountTracker from '../file-language-count-tracker';
import {
  WorkspaceTime,
  LanguageTime,
  TimeTrackerDataObject,
} from '../time-tracker.d';
import TimeTrackerController from '../time-tracker-controller';
import TerminalCountTracker from '../terminal-count-tracker';
import WorkspaceCountTracker from '../workspace-count-tracker';

const preProcessData = (rawData: ExtensionGlobalState): ExtensionDump => {
  const languageData: {
    [key: string]: LanguagesDump[];
  } = getLanguageData(rawData);
  const commandData: {
    [key: string]: {
      terminalsOpened: number;
      commands: TerminalCommandCounter[];
    };
  } = getCommandData(rawData);
  const workspaceData: {
    [key: string]: WorkspacesDump[];
  } = getWorkspaceData(rawData);

  const processedData: ExtensionDump = { dailyStats: [] };
  for (const date in languageData) {
    processedData.dailyStats.push({
      date,
      terminalsOpened: commandData[date]?.terminalsOpened ?? 0,
      dailyGoal: rawData.dailyGoal,
      languages: languageData[date] ?? [],
      commands: commandData[date]?.commands ?? [],
      workspaces: workspaceData[date] ?? [],
    });
  }

  return processedData;
};

const getLanguageData = (rawData: ExtensionGlobalState) => {
  const languageData: {
    [key: string]: LanguagesDump[];
  } = {};
  rawData[TimeTrackerController.trackerGlobalStateKey].forEach(
    (day: TimeTrackerDataObject) => {
      const languageArray: LanguagesDump[] = [];

      day['workspaces'].forEach((workspace: WorkspaceTime) => {
        workspace['languages'].forEach((language: LanguageTime) => {
          const index = languageArray.findIndex(
            (lang) => lang.languageId === language['languageId']
          );
          if (index !== -1) {
            languageArray[index].timeTracked += language.timeTracked;
          } else {
            languageArray.push({
              languageId: language['languageId'],
              timeTracked: language['timeTracked'],
              linesModified: 0,
            });
          }
        });
      });

      languageData[day['date']] = languageArray;
    }
  );

  rawData[FileLanguageCountTracker.trackerGlobalStateKey].forEach(
    (day: CountTrackerDataObject) => {
      const languageArray = languageData[day['date']];
      if (languageArray && day['languages']) {
        day['languages'].forEach((language) => {
          const index = languageArray.findIndex(
            (lang) => lang.languageId === language['languageId']
          );
          if (index !== -1) {
            languageArray[index].linesModified += language['linesModified'];
          }
        });
      }
    }
  );

  return languageData;
};

const getCommandData = (
  rawData: ExtensionGlobalState
): {
  [key: string]: {
    terminalsOpened: number;
    commands: TerminalCommandCounter[];
  };
} => {
  const commandData: {
    [key: string]: {
      terminalsOpened: number;
      commands: TerminalCommandCounter[];
    };
  } = {};

  rawData[TerminalCountTracker.trackerGlobalStateKey].forEach(
    (day: CountTrackerDataObject) => {
      if (day['terminals']) {
        commandData[day['date']] = {
          terminalsOpened: day['terminals']['timesOpened'],
          commands: day['terminals']['commands'],
        };
      }
    }
  );

  return commandData;
};

const getWorkspaceData = (
  rawData: ExtensionGlobalState
): {
  [key: string]: WorkspacesDump[];
} => {
  const workspaceData: {
    [key: string]: WorkspacesDump[];
  } = {};

  rawData[WorkspaceCountTracker.trackerGlobalStateKey].forEach(
    (day: CountTrackerDataObject) => {
      const workspaceArray: WorkspacesDump[] = [];

      if (day['workspaces']) {
        day['workspaces']?.forEach((workspace) => {
          workspaceArray.push({
            workspaceName: workspace['workspace'],
            rootPath: workspace['rootPath'],
            timesOpened: workspace['timesOpened'],
            timeTracked: 0,
          });
        });
      }

      workspaceData[day['date']] = workspaceArray;
    }
  );

  rawData[TimeTrackerController.trackerGlobalStateKey]?.forEach(
    (day: TimeTrackerDataObject) => {
      const workspaceArray: WorkspacesDump[] = workspaceData[day['date']];

      if (workspaceArray) {
        day['workspaces']?.forEach((workspace) => {
          const index = workspaceArray.findIndex(
            (ws) => ws.rootPath === workspace['rootPath']
          );
          if (index !== -1) {
            let timeTracked = 0;
            workspace['languages']?.forEach((language) => {
              timeTracked += language['timeTracked'];
            });
            workspaceArray[index].timeTracked = timeTracked;
          }
        });
      }
    }
  );

  return workspaceData;
};

export default preProcessData;