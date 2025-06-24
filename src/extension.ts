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

  context.subscriptions.push(disposable1, disposable2);
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

  editor.edit((editBuilder) => {
    editBuilder.insert(endOfDocument, "\n");
  });
}

function getCurrentBlock(moveDown: boolean = true): string {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return "";
  }

  const document = editor.document;
  const selection = editor.selection;

  // If there's an active selection, just return that
  if (!selection.isEmpty) {
    return document.getText(selection);
  }

  const cursorPosition = selection.active;
  
  // Validate cursor position is within document bounds
  if (cursorPosition.line >= document.lineCount || cursorPosition.line < 0) {
    return "";
  }

  const currentLine = document.lineAt(cursorPosition.line);
  
  // Check if we're inside a multiline string
  const multilineStringInfo = isInsideMultilineString(document, cursorPosition);
  if (multilineStringInfo) {
    return handleMultilineString(document, multilineStringInfo, moveDown);
  }

  // Original logic for non-string blocks
  const indentLength = currentLine.firstNonWhitespaceCharacterIndex;
  const indent = currentLine.text.slice(0, indentLength);
  const pattern = new RegExp(`^${indent}(\\s|else|elif|except|finally|\\)|\\]|\\})`);
  const decoratorPattern = new RegExp(`^${indent}@`);
  const empty = new RegExp(`^\\s*#|^\\s*$`);
  const functionPattern = new RegExp(`^${indent}def\\s`);
  const classPattern = new RegExp(`^${indent}class\\s`);
  
  let blockText = currentLine.text;
  let lineNumber;

  if (functionPattern.test(currentLine.text) || classPattern.test(currentLine.text)) {
    for (lineNumber = cursorPosition.line - 1; lineNumber >= 0; lineNumber--) {
      const line = document.lineAt(lineNumber);
      if (decoratorPattern.test(line.text)) {
        blockText = `${line.text}\n${blockText}`;
        continue;
      } else if (empty.test(line.text)) {
        continue;
      } else {
        break;
      }
    }
  }

  let lastLineIsDecorator = decoratorPattern.test(currentLine.text);
  for (lineNumber = cursorPosition.line + 1; lineNumber < document.lineCount; lineNumber++) {
    try {
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
    } catch (error) {
      console.error(`Error accessing line ${lineNumber}:`, error);
      break;
    }
  }

  if (moveDown) {
    try {
      if (lineNumber >= document.lineCount) {
        const lastLine = document.lineAt(document.lineCount - 1);
        if (!empty.test(lastLine.text)) {
          insertEmptyLineAtEnd();
        }
        lineNumber = document.lineCount - 1;
      }
      moveToLineStart(lineNumber);
    } catch (error) {
      console.error("Error moving cursor:", error);
    }
  }

  return blockText;
}
function isInsideMultilineString(document: vscode.TextDocument, position: vscode.Position): 
  { startLine: number, endLine: number, quoteType: string } | null {
    // Validate position is within document bounds
  if (position.line >= document.lineCount || position.line < 0) {
    return null;
  }

  const tripleQuotes = ['"""', "'''"];
  let startLine: number | null = null;
  let endLine: number | null = null;
  let quoteType: string | null = null;
  
  try {
    const tripleQuotes = ['"""', "'''"];
    let startLine: number | null = null;
    let endLine: number | null = null;
    let quoteType: string | null = null;
    
    // Check current line first
    const currentLineText = document.lineAt(position.line).text;
    for (const q of tripleQuotes) {
      const firstQuoteIndex = currentLineText.indexOf(q);
      if (firstQuoteIndex >= 0 && firstQuoteIndex < position.character) {
        const remainingText = currentLineText.substring(firstQuoteIndex + q.length);
        if (remainingText.includes(q)) {
          // Single line triple quote - not a multiline string
          return null;
        } else {
          startLine = position.line;
          quoteType = q;
          break;
        }
      }
    }
    
    // If not found on current line, search backwards
    if (startLine === null) {
      for (let line = position.line; line >= 0; line--) {
        const lineText = document.lineAt(line).text;
        for (const q of tripleQuotes) {
          if (lineText.includes(q)) {
            // Check if it's an opening quote (odd number of quotes before it)
            const quotesBefore = (lineText.match(new RegExp(q, 'g')) || []).length;
            if (quotesBefore % 2 === 1) {
              startLine = line;
              quoteType = q;
              break;
            }
          }
        }
        if (quoteType !== null) break;
      }
    }
    
    if (quoteType === null || startLine === null) return null;
    
    // Find the closing quote
    for (let line = startLine; line < document.lineCount; line++) {
      const lineText = document.lineAt(line).text;
      if (line > startLine && lineText.includes(quoteType)) {
        endLine = line;
        break;
      }
    }
    
    if (endLine === null) return null;
    
    return { startLine, endLine, quoteType };
    } catch (error) {
    console.error("Error in isInsideMultilineString:", error);
    return null;
  }
}

function handleMultilineString(
  document: vscode.TextDocument, 
  info: { startLine: number, endLine: number, quoteType: string },
  moveDown: boolean
): string {
  let blockText = '';
  
  try {
    for (let line = info.startLine; line <= info.endLine; line++) {
      if (line >= 0 && line < document.lineCount) {
        blockText += document.lineAt(line).text + '\n';
      }
    }
    
    if (moveDown) {
      const nextLine = info.endLine + 1;
      if (nextLine < document.lineCount) {
        moveToLineStart(nextLine);
      } else {
        insertEmptyLineAtEnd();
        moveToLineStart(nextLine);
      }
    }
  } catch (error) {
    console.error("Error in handleMultilineString:", error);
  }
  
  return blockText.trim();
}

function sendToJupyter(code: string) {
  vscode.commands.executeCommand("jupyter.execSelectionInteractive", code);
}
