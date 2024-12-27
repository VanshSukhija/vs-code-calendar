import * as vscode from 'vscode';
import {
  CountTrackerDataObject,
  FileLanguageCounter,
  ICountTracker,
} from './count-tracker.d';
import { extensionGlobalStateKey } from './utils/constants';
import { ExtensionGlobalState } from '.';

export default class FileLanguageCountTracker implements ICountTracker {
  private static instance: FileLanguageCountTracker;
  public static trackerGlobalStateKey: string = 'file-language-count-tracker';

  private constructor() {}

  public static getInstance(): FileLanguageCountTracker {
    if (!FileLanguageCountTracker.instance) {
      FileLanguageCountTracker.instance = new FileLanguageCountTracker();
    }

    return FileLanguageCountTracker.instance;
  }

  public incrementCounter(context: vscode.ExtensionContext): void {
    if (!vscode.window.activeTextEditor) {
      return;
    }

    const languageId: string =
      vscode.window.activeTextEditor.document.languageId;
    const today: string = new Date().toLocaleDateString();
    const extensionGlobalState: ExtensionGlobalState = context.globalState.get(
      extensionGlobalStateKey,
      Object() as ExtensionGlobalState
    );
    const fileLanguageCountTrackerData: CountTrackerDataObject[] =
      extensionGlobalState[FileLanguageCountTracker.trackerGlobalStateKey];
    const newFileLanguage: FileLanguageCounter = {
      languageId,
      timesOpened: 1,
    };

    const fileLanguageCountTrackerDataForToday:
      | CountTrackerDataObject
      | undefined = fileLanguageCountTrackerData.find(
      (data) => data.date === today
    );

    if (fileLanguageCountTrackerDataForToday) {
      if (!fileLanguageCountTrackerDataForToday.languages) {
        return;
      }
      const fileLanguageCounter: FileLanguageCounter | undefined =
        fileLanguageCountTrackerDataForToday.languages.find(
          (language) => language.languageId === languageId
        );

      if (fileLanguageCounter) {
        fileLanguageCounter.timesOpened++;
      } else {
        fileLanguageCountTrackerDataForToday.languages.push(newFileLanguage);
      }
    } else {
      fileLanguageCountTrackerData.push({
        date: today,
        languages: [newFileLanguage],
      });
    }

    context.globalState.update(extensionGlobalStateKey, extensionGlobalState);
  }

  public subscribeToEvents(context: vscode.ExtensionContext): void {
    context.subscriptions.push(
      vscode.window.onDidChangeActiveTextEditor(() => {
        FileLanguageCountTracker.getInstance().incrementCounter(context);
      })
    );
  }
}
