import * as vscode from 'vscode';
import TimeTracker from './time-tracker';
import { stat } from 'fs';

export default class TimeTrackerController {
  public static trackerGlobalStateKey: string = 'time-tracker';
  private static instance: TimeTrackerController;
  private static timeTrackers: TimeTracker[];
  private lastActiveTextEditor: vscode.TextEditor | undefined;
  private clockStartTime: Date;
  private hasSavedTimeForToday: boolean;
  public savedTimeForToday: number;
  public nextDayTimeout: NodeJS.Timeout | undefined;
  public statusBarClockInterval: NodeJS.Timeout | undefined;

  private constructor() {
    this.clockStartTime = new Date();
    this.savedTimeForToday = 0;
    this.hasSavedTimeForToday = false;
    this.setNextDayTimeout();
    TimeTrackerController.timeTrackers = [];
    this.lastActiveTextEditor = vscode.window.activeTextEditor;
  }

  public static getInstance(): TimeTrackerController {
    if (!TimeTrackerController.instance) {
      TimeTrackerController.instance = new TimeTrackerController();
    }

    return TimeTrackerController.instance;
  }

  public static getTimeTrackers(): TimeTracker[] {
    return TimeTrackerController.timeTrackers;
  }

  public getLastActiveTextEditor(): vscode.TextEditor | undefined {
    return this.lastActiveTextEditor;
  }

  public initiateController(context: vscode.ExtensionContext): void {
    vscode.workspace.workspaceFolders?.forEach((folder) => {
      TimeTrackerController.timeTrackers.push(new TimeTracker(folder));
    });

    this.subscribeToEvents(context);
  }

  public startStatusBarClock(): void {
    const statusBarClock: vscode.StatusBarItem =
      vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 1000);

    statusBarClock.text = this.getClockTime();
    statusBarClock.tooltip = 'VS Code Calendar: Time tracked today';
    // TODO: add statusBarClock.command here

    this.statusBarClockInterval = setInterval(() => {
      statusBarClock.text = `$(watch) ` + this.getClockTime();
    }, 1000);

    statusBarClock.show();
  }

  private setNextDayTimeout(): void {
    if (this.nextDayTimeout) {
      clearTimeout(this.nextDayTimeout);
    }
    this.clockStartTime = new Date();
    this.savedTimeForToday = 0;
    const tomorrow = new Date(
      this.clockStartTime.getFullYear(),
      this.clockStartTime.getMonth(),
      this.clockStartTime.getDate() + 1
    );
    this.nextDayTimeout = setTimeout(() => {
      this.clockStartTime = new Date();
      this.savedTimeForToday = 0;
      this.setNextDayTimeout();
    }, tomorrow.getTime() - this.clockStartTime.getTime());
  }

  public saveTimeForToday(): void {
    if (this.hasSavedTimeForToday) {
      return;
    }

    this.savedTimeForToday +=
      new Date().getTime() - this.clockStartTime.getTime();
    this.hasSavedTimeForToday = true;
  }

  private getClockTime(): string {
    const time: number =
      this.savedTimeForToday +
      (!this.hasSavedTimeForToday
        ? new Date().getTime() - this.clockStartTime.getTime()
        : 0);

    const hours: string = Math.floor(time / 3600000)
      .toString()
      .padStart(2, '0');
    const minutes: string = Math.floor((time % 3600000) / 60000)
      .toString()
      .padStart(2, '0');
    const seconds: string = Math.floor((time % 60000) / 1000)
      .toString()
      .padStart(2, '0');

    return `${hours}:${minutes}:${seconds}`;
  }

  private subscribeToEvents(context: vscode.ExtensionContext): void {
    context.subscriptions.push(
      vscode.workspace.onDidChangeWorkspaceFolders((event) => {
        event.added.forEach((folder) => {
          TimeTrackerController.timeTrackers.push(new TimeTracker(folder));
        });

        event.removed.forEach((folder) => {
          TimeTrackerController.timeTrackers =
            TimeTrackerController.timeTrackers.filter(
              (tracker) =>
                tracker.getWorkspaceFolder()?.uri.fsPath !== folder?.uri.fsPath
            );
        });
      }),

      vscode.window.onDidChangeActiveTextEditor((editor) => {
        if (this.lastActiveTextEditor) {
          TimeTrackerController.timeTrackers
            .find((tracker) =>
              tracker.isTextEditorOfThisWorkspace(this.lastActiveTextEditor)
            )
            ?.saveTimeDifference(
              context,
              this.lastActiveTextEditor.document.languageId
            );
        }

        if (editor) {
          TimeTrackerController.timeTrackers
            .find((tracker) => tracker.isTextEditorOfThisWorkspace(editor))
            ?.resetTracker();
        }

        this.lastActiveTextEditor = editor;
      }),

      vscode.window.onDidChangeWindowState((state) => {
        if (state.focused && this.hasSavedTimeForToday) {
          this.clockStartTime = new Date();
          this.hasSavedTimeForToday = false;
        } else if (!state.focused) {
          this.saveTimeForToday();
        }

        const tracker: TimeTracker | undefined =
          TimeTrackerController.timeTrackers.find((tracker) =>
            tracker.isTextEditorOfThisWorkspace(this.lastActiveTextEditor)
          );

        if (!tracker) {
          return;
        }

        if (state.focused) {
          tracker.resetTracker();
        } else if (!state.focused && this.lastActiveTextEditor) {
          tracker.saveTimeDifference(
            context,
            this.lastActiveTextEditor.document.languageId
          );
        }
      })
    );
  }
}
