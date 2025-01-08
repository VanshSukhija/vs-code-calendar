import * as vscode from 'vscode';
import TimeTracker from './time-tracker';

export default class TimeTrackerController {
  public static trackerGlobalStateKey: string = 'time-tracker';
  private static instance: TimeTrackerController;
  private static timeTrackers: TimeTracker[];
  private lastActiveTextEditor: vscode.TextEditor | undefined;
  private clockStartTime: Date;
  private hasSavedTimeForSession: boolean;
  public savedTimeForSession: number;
  public statusBarClockInterval: NodeJS.Timeout | undefined;
  public saveTimeDifferenceInterval: NodeJS.Timeout | undefined;

  private constructor() {
    this.clockStartTime = new Date();
    this.savedTimeForSession = 0;
    this.hasSavedTimeForSession = false;
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
    this.startSaveTimeDifferenceInterval(context);
  }

  public startStatusBarClock(): void {
    const statusBarClock: vscode.StatusBarItem =
      vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 1000);

    statusBarClock.text = this.getClockTime();
    statusBarClock.tooltip = 'VS Code Calendar: Current Session Time';

    this.statusBarClockInterval = setInterval(() => {
      statusBarClock.text = `$(watch) ` + this.getClockTime();
    }, 1000);

    statusBarClock.show();
  }

  public saveTimeForSession(): void {
    if (this.hasSavedTimeForSession) {
      return;
    }

    this.savedTimeForSession +=
      new Date().getTime() - this.clockStartTime.getTime();
    this.hasSavedTimeForSession = true;
  }

  private startSaveTimeDifferenceInterval(
    context: vscode.ExtensionContext
  ): void {
    if (this.saveTimeDifferenceInterval) {
      clearInterval(this.saveTimeDifferenceInterval);
    }

    this.saveTimeDifferenceInterval = setInterval(() => {
      if (this.lastActiveTextEditor) {
        const currentTimeTracker: TimeTracker | undefined =
          TimeTrackerController.timeTrackers.find((tracker) =>
            tracker.isTextEditorOfThisWorkspace(this.lastActiveTextEditor)
          );
        if (currentTimeTracker) {
          currentTimeTracker.saveTimeDifference(
            context,
            this.lastActiveTextEditor.document.languageId
          );
          currentTimeTracker.resetTracker();
        }
      }
    }, 60000);
  }

  private getClockTime(): string {
    const time: number =
      this.savedTimeForSession +
      (!this.hasSavedTimeForSession
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
        if (state.focused && this.hasSavedTimeForSession) {
          this.clockStartTime = new Date();
          this.hasSavedTimeForSession = false;
        } else if (!state.focused) {
          this.saveTimeForSession();
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
