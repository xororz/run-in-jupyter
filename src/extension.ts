// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log(
    'Congratulations, your extension "run-in-jupyter" is now active!'
  );

  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json
  let disposable = vscode.commands.registerCommand(
    "run-in-jupyter.runAndMoveDown",
    () => {
      const currentBlockCode = getCurrentBlock();
      if (currentBlockCode === "") {
        return;
      }
      sendToJupyter(currentBlockCode);
    }
  );
  let disposable2 = vscode.commands.registerCommand(
    "run-in-jupyter.justRun",
    () => {
      const currentBlockCode = getCurrentBlock(false);
      if (currentBlockCode === "") {
        return;
      }
      sendToJupyter(currentBlockCode);
    }
  );

  context.subscriptions.push(disposable);
  context.subscriptions.push(disposable2);
}

// This method is called when your extension is deactivated
export function deactivate() {}
function moveToLineStart(lineNumber: number) {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return;
  }

  const position = new vscode.Position(lineNumber, 0);
  editor.selection = new vscode.Selection(position, position);

  editor.revealRange(new vscode.Range(position, position));
}
function insertEmptyLineAtEnd() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return;
  }

  const document = editor.document;
  const lastLine = document.lineAt(document.lineCount - 1);
  const endOfDocument = lastLine.range.end;

  editor
    .edit((editBuilder) => {
      editBuilder.insert(endOfDocument, "\n");
    })
    .then((success) => {
      if (!success) {
        vscode.window.showErrorMessage("error");
      }
    });
}
function getCurrentBlock(moveDown: boolean = true): string {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return "";
  }
  const document = editor.document;
  const selection = editor.selection;
  const cursorPosition = selection.active;

  if (!selection.isEmpty) {
    const selectedText = document.getText(selection);
    return selectedText;
  }
  const currentLine = document.lineAt(cursorPosition.line);
  if (
    cursorPosition.line + 1 >= document.lineCount &&
    !currentLine.isEmptyOrWhitespace
  ) {
    if (moveDown) {
      insertEmptyLineAtEnd();
      moveToLineStart(cursorPosition.line + 1);
    }
    return currentLine.text;
  }
  const currentLineText = currentLine.text;
  if (currentLineText.endsWith(":")) {
    const currentLineIndent = currentLine.firstNonWhitespaceCharacterIndex;
    let blockText = currentLineText;
    let i;
    for (i = cursorPosition.line + 1; i < document.lineCount; i++) {
      const line = document.lineAt(i);
      const lineText = line.text;
      const lineIndent = line.firstNonWhitespaceCharacterIndex;
      if (lineIndent <= currentLineIndent) {
        break;
      }
      blockText = blockText + "\n" + lineText;
    }
    if (moveDown) {
      if (i >= document.lineCount) {
        insertEmptyLineAtEnd();
        moveToLineStart(document.lineCount);
      } else {
        moveToLineStart(i);
      }
    }
    return blockText;
  }
  if (moveDown) {
    let i;
    for (i = cursorPosition.line + 1; i < document.lineCount; i++) {
      const line = document.lineAt(i);
      if (!line.isEmptyOrWhitespace) {
        moveToLineStart(i);
        return currentLineText;
      }
    }
    if (!currentLine.isEmptyOrWhitespace) {
      moveToLineStart(cursorPosition.line + 1);
    }
  }
  return currentLineText;
}

function sendToJupyter(code: string) {
  vscode.commands.executeCommand("jupyter.execSelectionInteractive", code);
}
