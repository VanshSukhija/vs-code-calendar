// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

let startTime: string = new Date().toLocaleString();

function calculateTimeDifference(startTime: string, endTime: string): number {
	let start: Date = new Date(startTime);
	let end: Date = new Date(endTime);
	let difference: number = end.getTime() - start.getTime();

	return difference;
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {
	startTime = new Date().toLocaleString();

	console.log('Congratulations, your extension "vs-code-calendar" is now active!');

	vscode.window.showInformationMessage(`Start Time: ${startTime}`);
}

// This method is called when your extension is deactivated
export function deactivate() {
	let endTime: string = new Date().toLocaleString();
	let difference: number = calculateTimeDifference(startTime, endTime);

	console.log(`The extension was active for ${difference} milliseconds.`);
}
