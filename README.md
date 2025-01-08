# VS Code Calendar

A VS Code extension that tracks your coding activity and provides detailed statistics and wrapped at the end of year :)

## Features

- Tracks time spent coding in different languages
- Monitors lines of code modified
- Counts workspace and file usage
- Records terminal commands executed
- Shows real-time status bar with coding time and lines modified

## Commands

The extension provides the following commands (accessible via Command Palette):

- `VS Code Calendar: Change Name` - Change your display name
- `VS Code Calendar: Change Daily Goal` - Set a new daily goal for lines modified
- `VS Code Calendar: Send Data To Server` - Manually sync your coding activity data

## Status Bar Items

- `$(watch) HH:MM:SS` - Shows your active coding session time
- `$(edit) XX/YY` - Shows lines modified today / daily goal

## Settings

The extension automatically tracks:

- Time spent in each workspace
- Lines of code modified per language
- Number of times different workspaces are opened
- Terminal usage and commands executed 
- Daily coding goals and progress

## Data Privacy

- Data is synced to server monthly (requires opt-in with username)
- You can manually trigger data sync using the "Send Data To Server" command

## Requirements

- VS Code version 1.95.3 or higher
- An internet connection for data syncing

## Installation

Install through the VS Code Marketplace or download the VSIX file from the [releases page](https://github.com/VanshSukhija/vs-code-calendar/releases).

After installation, the extension will automatically start tracking your coding activity when you open VS Code.