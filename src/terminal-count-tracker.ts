import * as vscode from 'vscode';
import {
  CountTrackerDataObject,
  TerminalCounter,
  ICountTracker,
} from './count-tracker.d';
import { extensionGlobalStateKey } from './utils/constants';
import { ExtensionGlobalState } from '.';

export default class TerminalCountTracker implements ICountTracker {
  private static instance: TerminalCountTracker;
  public static trackerGlobalStateKey: string = 'terminal-count-tracker';

  private constructor() {}

  public static getInstance(): TerminalCountTracker {
    if (!TerminalCountTracker.instance) {
      TerminalCountTracker.instance = new TerminalCountTracker();
    }

    return TerminalCountTracker.instance;
  }

  public extractCoreCommands(shellCommand: string): string[] {
    // Define separators for splitting commands
    const separators = /(?:&&|\|\||;|\||>|>>|<)/g;

    // Split the shell command into parts
    const rawCommands = shellCommand
      .split(separators)
      .map((cmd) => cmd.trim())
      .filter((cmd) => cmd.length > 0); // Remove empty strings

    // Extract the main command or script name
    const coreCommands = rawCommands.map((cmd) => {
      // Consider the first token before space as the core command
      const firstWord = cmd.split(/\s+/)[0];

      // Handle both relative and absolute script paths
      if (firstWord.includes('/')) {
        // Extract the script or executable name from the path
        return firstWord.split('/').pop() || firstWord;
      }

      return firstWord;
    });

    return coreCommands;
  }

  public incrementCounter(
    context: vscode.ExtensionContext,
    command?: string
  ): void {
    if (!vscode.window.terminals.length) {
      return;
    }

    const today: string = new Date().toLocaleDateString();
    const extensionGlobalState: ExtensionGlobalState = context.globalState.get(
      extensionGlobalStateKey,
      Object() as ExtensionGlobalState
    );
    const terminalCountTrackerData: CountTrackerDataObject[] =
      extensionGlobalState[TerminalCountTracker.trackerGlobalStateKey];
    const newTerminal: TerminalCounter = {
      timesOpened: 1,
      commands: [],
    };

    const terminalCountTrackerDataForToday: CountTrackerDataObject | undefined =
      terminalCountTrackerData.find((data) => data.date === today);

    if (terminalCountTrackerDataForToday) {
      if (!terminalCountTrackerDataForToday.terminals) {
        return;
      }

      if (command) {
        const commandIndex =
          terminalCountTrackerDataForToday.terminals.commands.findIndex(
            (commandObj) => commandObj.command === command
          );
        if (commandIndex === -1) {
          terminalCountTrackerDataForToday.terminals.commands.push({
            command: command,
            executionCount: 1,
          });
        } else {
          terminalCountTrackerDataForToday.terminals.commands[
            commandIndex
          ].executionCount += 1;
        }
      } else {
        terminalCountTrackerDataForToday.terminals.timesOpened += 1;
      }
    } else {
      terminalCountTrackerData.push({
        date: today,
        terminals: newTerminal,
      });
    }

    context.globalState.update(extensionGlobalStateKey, extensionGlobalState);
  }
}
