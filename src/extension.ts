// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { readFile, writeNovelFile } from "./utils";

const BOOKSPATHKEY = "vscode-loaf-books";
const BOOKNAMEKEY = "vscode-loaf-current-book";
let currentBook = {
  lines: [] as string[],
  currentLine: -1,
  name: "",
  currentFile: "",
};

async function getBooksPath(context: vscode.ExtensionContext) {
  let booksPath: string | undefined = context.globalState.get(BOOKSPATHKEY);
  if (!booksPath) {
    const result = await vscode.window.showOpenDialog({
      title: "Select books storage folder",
      canSelectFiles: false,
      canSelectFolders: true,
      canSelectMany: false,
    });
    if (result && result[0]) {
      booksPath = result[0].fsPath;
      context.globalState.update(BOOKSPATHKEY, booksPath);
    }
  }

  return booksPath;
}

async function getCurrentBook(context: vscode.ExtensionContext) {
  const booksPath = await getBooksPath(context);
  if (!booksPath) {
    vscode.window.showErrorMessage(
      "Must select the folder which storage books"
    );
    return;
  }
  const readerFile = path.join(booksPath, "vscode-loaf.cpp");
  if (!fs.existsSync(readerFile)) {
    writeNovelFile(readerFile);
  }
  let bookName: string | undefined = context.globalState.get(BOOKNAMEKEY);
  if (!bookName || !fs.existsSync(path.join(booksPath, bookName))) {
    bookName = fs.readdirSync(booksPath)[0];
  }
  if (!bookName) {
    vscode.window.showErrorMessage("There's no book in the folder");
    return;
  } else {
    context.globalState.update(BOOKNAMEKEY, bookName);
  }

  const lines = readFile(path.join(booksPath, bookName))
    .split(/\r?\n/)
    .map((line) => line.replace(/(^\s+|\s+$)/g, ""))
    .filter((line) => !!line);
  const currentLine = Number(context.globalState.get(bookName) || 0);
  currentBook.lines = lines;
  currentBook.currentLine = currentLine;
  currentBook.name = bookName;
  currentBook.currentFile = readerFile;

  const uri = vscode.Uri.file(readerFile);
  try {
    // 打开文档并显示在编辑器中
    const doc = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(doc);
  } catch (error) {
    console.error(`Failed to open file ${readerFile}: ${error}`);
  }
}

function showPage(index: number, context: vscode.ExtensionContext) {
  if (!currentBook.lines[index]) {
    return;
  }
  currentBook.currentLine = index;
  // 每10行记录一次
  if (index % 10 === 0) {
    context.globalState.update(currentBook.name, index);
  }
  const line = currentBook.lines[index];
  const editor = vscode.window.activeTextEditor;
  if (!editor || !editor.document.fileName.endsWith("vscode-loaf.cpp")) return;
  const comment = `/*****
  ${line}
*****/`;
  const reg = /\/\*\*\*\*\*[\s\S]+\*\*\*\*\*\//;
  const hasContent = reg.test(editor.document.getText());
  editor.edit((editBuilder) => {
    // 替换文档内容
    const range = new vscode.Range(
      0,
      0,
      hasContent ? 2 : 0,
      hasContent ? 6 : 0
    );
    editBuilder.replace(range, comment + (hasContent ? "" : "\n"));
  });
}

function switchBook(context: vscode.ExtensionContext) {
  let booksPath: string | undefined = context.globalState.get(BOOKSPATHKEY);
  if (!booksPath || fs.readdirSync(booksPath).length <= 1) {
    vscode.window.showErrorMessage("No more books to switch");
    return;
  }
  const books = fs.readdirSync(booksPath).filter((name) => /\.txt$/.test(name));
  vscode.window
    .showQuickPick(books, {
      canPickMany: false,
      placeHolder: "Select a book",
    })
    .then((selection) => {
      if (selection) {
        context.globalState.update(BOOKNAMEKEY, selection);
        getCurrentBook(context);
      }
    });
}

function searchPage(context: vscode.ExtensionContext) {
  if (currentBook.lines.length) {
    vscode.window
      .showInputBox({
        title: "Please input search text",
      })
      .then((txt) => {
        const res: {
          line: string;
          num: number;
        }[] = [];
        if (txt) {
          for (let i = 0; i < currentBook.lines.length; i++) {
            if (currentBook.lines[i].indexOf(txt) !== -1) {
              res.push({
                num: i,
                line: currentBook.lines[i],
              });
            }
          }
        }
        return res;
      })
      .then((lines) => {
        if (lines.length) {
          vscode.window
            .showQuickPick(
              lines.map((line) => {
                return `${line.num} - ${line.line.slice(0, 30)}${
                  line.line.length > 30 ? "..." : ""
                }`;
              }),
              {
                canPickMany: false,
                placeHolder: "Select a line",
              }
            )
            .then((line) => {
              if (line) {
                showPage(parseInt(line), context);
              }
            });
        }
      });
  }
}

function endLoaf(context: vscode.ExtensionContext) {
  if (currentBook.name) {
    context.globalState.update(currentBook.name, currentBook.currentLine);
    currentBook = {
      lines: [] as string[],
      currentLine: -1,
      name: "",
      currentFile: "",
    };
  }
  const editor = vscode.window.activeTextEditor;

  if (!editor || !editor.document.fileName.endsWith("vscode-loaf.cpp")) return;
  const reg = /\.(html|vue)$/.test(editor.document.fileName)
    ? /<-----[\s\S]+----->/
    : /\/\*\*\*\*\*[\s\S]+\*\*\*\*\*\//;
  const hasContent = reg.test(editor.document.getText());
  if (hasContent) {
    editor
      .edit((editBuilder) => {
        // 替换文档内容
        const range = new vscode.Range(0, 0, 3, 0);
        editBuilder.replace(range, "");
      })
      .then(() => {
        return editor.document.save();
      })
      .then(() => {
        vscode.commands.executeCommand("workbench.action.closeActiveEditor");
      });
  }
}

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand("vscode-loaf.loafStart", () => {
      // vscode.window.showInformationMessage("Start loaf");
      getCurrentBook(context).then(() => {
        showPage(currentBook.currentLine, context);
      });
    })
  );
  context.subscriptions.push(
    vscode.commands.registerCommand("vscode-loaf.switchBook", () => {
      switchBook(context);
    })
  );
  context.subscriptions.push(
    vscode.commands.registerCommand("vscode-loaf.nextPage", () => {
      showPage(currentBook.currentLine + 1, context);
    })
  );
  context.subscriptions.push(
    vscode.commands.registerCommand("vscode-loaf.prevPage", () => {
      showPage(currentBook.currentLine - 1, context);
    })
  );
  context.subscriptions.push(
    vscode.commands.registerCommand("vscode-loaf.searchPage", () => {
      searchPage(context);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("vscode-loaf.loafEnd", () => {
      endLoaf(context);
    })
  );
}

// This method is called when your extension is deactivated
export function deactivate() {}
