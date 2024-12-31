import * as vscode from 'vscode';
import TimeTracker from './time-tracker';

export default class TimeTrackerController {
  public static trackerGlobalStateKey: string = 'time-tracker';
  private static instance: TimeTrackerController;
  private static timeTrackers: TimeTracker[];
  private lastActiveTextEditor: vscode.TextEditor | undefined;

  private constructor() {
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
        const tracker: TimeTracker | undefined =
          TimeTrackerController.timeTrackers.find((tracker) =>
            tracker.isTextEditorOfThisWorkspace(this.lastActiveTextEditor)
          );

        if (!tracker) {
          return;
        }

        if (state.focused && state.active) {
          tracker.resetTracker();
        } else if (this.lastActiveTextEditor) {
          tracker.saveTimeDifference(
            context,
            this.lastActiveTextEditor.document.languageId
          );
        }
      })
    );
  }
}
