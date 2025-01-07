import * as vscode from 'vscode';
import {
  CountTrackerDataObject,
  FileLanguageCounter,
  ICountTracker,
} from './count-tracker.d';
import {
  defaultModifyLineGoal,
  extensionGlobalStateKey,
} from './utils/constants';
import { ExtensionGlobalState, TextDocumentLocal } from '.';

export default class FileLanguageCountTracker implements ICountTracker {
  private static instance: FileLanguageCountTracker;
  private static lastSavedTextDocumentMap: Map<string, TextDocumentLocal>;
  public static trackerGlobalStateKey: string = 'file-language-count-tracker';
  private statusBarLinesModifiedCounter: number;
  private statusBarCounter: vscode.StatusBarItem | undefined;

  private constructor() {
    FileLanguageCountTracker.lastSavedTextDocumentMap = new Map<
      string,
      TextDocumentLocal
    >();

    this.statusBarLinesModifiedCounter = 0;
  }

  public static getInstance(): FileLanguageCountTracker {
    if (!FileLanguageCountTracker.instance) {
      FileLanguageCountTracker.instance = new FileLanguageCountTracker();
    }

    return FileLanguageCountTracker.instance;
  }

  public initiateTracker(context: vscode.ExtensionContext): void {
    FileLanguageCountTracker.getInstance().subscribeToEvents(context);
    FileLanguageCountTracker.getInstance().incrementCounter(context);

    if (vscode.window.activeTextEditor) {
      const newTextDocument: TextDocumentLocal = {
        uri: vscode.window.activeTextEditor.document.uri.toString(),
        text: vscode.window.activeTextEditor.document.getText(),
        languageId: vscode.window.activeTextEditor.document.languageId,
      };
      FileLanguageCountTracker.lastSavedTextDocumentMap.set(
        vscode.window.activeTextEditor.document.uri.toString(),
        newTextDocument
      );
    }

    const extensionGlobalState: ExtensionGlobalState = context.globalState.get(
      extensionGlobalStateKey,
      Object() as ExtensionGlobalState
    );
    const fileLanguageCountTrackerData: CountTrackerDataObject[] =
      extensionGlobalState[FileLanguageCountTracker.trackerGlobalStateKey];

    if (fileLanguageCountTrackerData) {
      const today: string = new Date().toLocaleDateString();
      const fileLanguageCountTrackerDataForToday:
        | CountTrackerDataObject
        | undefined = fileLanguageCountTrackerData.find(
        (data) => data.date === today
      );

      if (fileLanguageCountTrackerDataForToday) {
        fileLanguageCountTrackerDataForToday.languages?.forEach((language) => {
          this.statusBarLinesModifiedCounter += language.linesModified;
        });
      }
    }
  }

  public incrementCounter(context: vscode.ExtensionContext): void {
    if (
      !vscode.window.activeNotebookEditor &&
      !vscode.window.activeTextEditor
    ) {
      return;
    }

    // languageId will never be empty because the activeNotebookEditor or activeTextEditor will always be defined as checked above
    const languageId: string =
      vscode.window.activeNotebookEditor?.notebook.notebookType ||
      vscode.window.activeTextEditor?.document.languageId ||
      '';

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
      linesModified: 0,
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

  public startStatusBarCounter(context: vscode.ExtensionContext): void {
    this.statusBarCounter = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      1000
    );

    const extensionGlobalState: ExtensionGlobalState = context.globalState.get(
      extensionGlobalStateKey,
      Object() as ExtensionGlobalState
    );
    const dailyGoal = extensionGlobalState['dailyGoal'];

    this.statusBarCounter.text = `$(edit) ${this.statusBarLinesModifiedCounter}/${dailyGoal}`;
    this.statusBarCounter.tooltip = 'VS Code Calendar: Lines modified today';
    // TODO: add statusBarCounter.command here

    this.statusBarCounter.show();
  }

  public updateStatusBarCounter(
    context: vscode.ExtensionContext,
    moreLinesModified: number
  ): void {
    const extensionGlobalState: ExtensionGlobalState = context.globalState.get(
      extensionGlobalStateKey,
      Object() as ExtensionGlobalState
    );
    const dailyGoal = extensionGlobalState['dailyGoal'];

    this.statusBarLinesModifiedCounter += moreLinesModified;
    if (this.statusBarCounter) {
      this.statusBarCounter.text = `$(edit) ${this.statusBarLinesModifiedCounter}/${dailyGoal}`;
    }
  }

  private isNotebookDocument(
    document: vscode.TextDocument | vscode.NotebookDocument
  ): document is vscode.NotebookDocument {
    return 'getCells' in document;
  }

  private getModifiedLines(
    lastSavedDocument: TextDocumentLocal,
    newlySavedDocument: vscode.TextDocument | vscode.NotebookDocument
  ): number {
    const initialDocumentLines: string[] = lastSavedDocument.text.split('\n');
    let savedDocumentLines: string[] = this.isNotebookDocument(
      newlySavedDocument
    )
      ? newlySavedDocument
          .getCells()
          .map((cell) => cell.document.getText())
          .join('\n')
          .split('\n')
      : newlySavedDocument.getText().split('\n');

    let modifiedLines: number = Math.abs(
      initialDocumentLines.length - savedDocumentLines.length
    );

    for (
      let i = 0;
      i < Math.min(initialDocumentLines.length, savedDocumentLines.length);
      i++
    ) {
      if (initialDocumentLines[i] !== savedDocumentLines[i]) {
        modifiedLines++;
      }
    }

    return modifiedLines;
  }

  public incrementModifiedLinesCounter(
    context: vscode.ExtensionContext,
    newDocument: vscode.TextDocument | vscode.NotebookDocument,
    modifiedLines: number
  ): void {
    const today: string = new Date().toLocaleDateString();
    const extensionGlobalState: ExtensionGlobalState = context.globalState.get(
      extensionGlobalStateKey,
      Object() as ExtensionGlobalState
    );
    const fileLanguageCountTrackerData: CountTrackerDataObject[] =
      extensionGlobalState[FileLanguageCountTracker.trackerGlobalStateKey];
    const languageId: string = this.isNotebookDocument(newDocument)
      ? 'notebook'
      : newDocument.languageId;

    const newFileLanguage: FileLanguageCounter = {
      languageId,
      timesOpened: 1,
      linesModified: modifiedLines,
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
        fileLanguageCounter.linesModified += modifiedLines;
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

  private activeTextEditorChangeHandler(
    context: vscode.ExtensionContext,
    event: vscode.TextEditor | undefined
  ) {
    if (!event) {
      return;
    }

    const newTextDocument: TextDocumentLocal = {
      uri: event.document.uri.toString(),
      text: event.document.getText(),
      languageId: event.document.languageId,
    };
    FileLanguageCountTracker.lastSavedTextDocumentMap.set(
      event.document.uri.toString(),
      newTextDocument
    );

    FileLanguageCountTracker.getInstance().incrementCounter(context);
  }

  private activeNotebookEditorChangeHandler(
    context: vscode.ExtensionContext,
    event: vscode.NotebookEditor | undefined
  ) {
    if (!event) {
      return;
    }

    FileLanguageCountTracker.getInstance().incrementCounter(context);
  }

  private documentSaveHandler(
    context: vscode.ExtensionContext,
    event: vscode.TextDocument | vscode.NotebookDocument
  ) {
    const lastSavedDocument: TextDocumentLocal | undefined =
      FileLanguageCountTracker.lastSavedTextDocumentMap.get(
        event.uri.toString()
      );

    if (lastSavedDocument) {
      const modifiedLines: number = this.getModifiedLines(
        lastSavedDocument,
        event
      );

      this.updateStatusBarCounter(context, modifiedLines);

      FileLanguageCountTracker.getInstance().incrementModifiedLinesCounter(
        context,
        event,
        modifiedLines
      );
    }

    FileLanguageCountTracker.lastSavedTextDocumentMap.set(
      event.uri.toString(),
      {
        uri: event.uri.toString(),
        text: this.isNotebookDocument(event)
          ? event
              .getCells()
              .map((cell) => cell.document.getText())
              .join('\n')
          : event.getText(),
        languageId: this.isNotebookDocument(event)
          ? event.notebookType
          : event.languageId,
      }
    );
  }

  private subscribeToEvents(context: vscode.ExtensionContext): void {
    context.subscriptions.push(
      // Event handler for when the active text editor changes
      vscode.window.onDidChangeActiveTextEditor((event) =>
        this.activeTextEditorChangeHandler(context, event)
      ),

      // Event handler for when the active notebook editor changes
      vscode.window.onDidChangeActiveNotebookEditor((event) =>
        this.activeNotebookEditorChangeHandler(context, event)
      ),

      // Event handler for when a text document is saved
      vscode.workspace.onDidSaveTextDocument((event) =>
        this.documentSaveHandler(context, event)
      ),

      // Event handler for when a notebook document is saved
      vscode.workspace.onDidSaveNotebookDocument((event) =>
        this.documentSaveHandler(context, event)
      )
    );
  }
}
