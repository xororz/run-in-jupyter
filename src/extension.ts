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
  let disposable1 = vscode.commands.registerCommand(
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

  context.subscriptions.push(disposable1);
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
  const indentLength = currentLine.firstNonWhitespaceCharacterIndex;
  const indent = currentLine.text.slice(0, indentLength);
  const pattern = new RegExp(
    `^${indent}(\\s|else|elif|except|finally|\\)|\\]|\\})`
  );
  const decoratorPattern = new RegExp(`^${indent}@`);
  const empty = new RegExp(`^\\s*#|^\\s*$`);
  const functionPattern = new RegExp(`^${indent}def\\s`);
  const classPattern = new RegExp(`^${indent}class\\s`);
  let blockText = currentLine.text;
  let lineNumber;
  if (
    functionPattern.test(currentLine.text) ||
    classPattern.test(currentLine.text)
  ) {
    for (lineNumber = cursorPosition.line - 1; lineNumber >= 0; lineNumber--) {
      const line = document.lineAt(lineNumber);
      if (decoratorPattern.test(line.text)) {
        blockText = `${line.text}\n${blockText}`;
        continue;
      } else {
        if (empty.test(line.text)) {
          continue;
        } else {
          break;
        }
      }
    }
  }
  let lastLineIsDecorator = false;
  lastLineIsDecorator = decoratorPattern.test(currentLine.text);
  for (
    lineNumber = cursorPosition.line + 1;
    lineNumber < document.lineCount;
    lineNumber++
  ) {
    const line = document.lineAt(lineNumber);
    if (empty.test(line.text)) {
      continue;
    }
    if (lastLineIsDecorator) {
      if (!decoratorPattern.test(line.text)) {
        lastLineIsDecorator = false;
      }
      blockText += `\n${line.text}`;
      continue;
    }
    if (pattern.test(line.text)) {
      blockText += `\n${line.text}`;
    } else {
      break;
    }
  }
  if (moveDown) {
    if (lineNumber === document.lineCount) {
      const lastLine = document.lineAt(document.lineCount - 1);
      if (empty.test(lastLine.text)) {
        lineNumber--;
      } else {
        insertEmptyLineAtEnd();
      }
    }
    moveToLineStart(lineNumber);
  }
  return blockText;
}

function sendToJupyter(code: string) {
  vscode.commands.executeCommand("jupyter.execSelectionInteractive", code);
}
