// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log('Congratulations, your extension "vscode-fire-plugin" is now active!');

  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json
  const disposable = vscode.commands.registerCommand('vscode-fire-plugin.helloWorld', () => {
    // The code you place here will be executed every time your command is executed
    // Display a message box to the user
    vscode.window.showInformationMessage('Hello World from vscode-fire-plugin!');
  });

  context.subscriptions.push(disposable);

  let cmd_ = vscode.commands.registerCommand('myextension.runShell', async () => {
    const command = await vscode.window.showInputBox({ prompt: 'Enter Shell Command' });
    if (!command) return;

    const shellExecution = new vscode.ShellExecution(command);
    const task = new vscode.Task(
      { type: 'shell' },
      vscode.TaskScope.Workspace,
      'Run Shell Command',
      'myextension',
      shellExecution
    );

    await vscode.tasks.executeTask(task);
  });

  context.subscriptions.push(cmd_);

  const myStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  myStatusBarItem.text = `$(terminal) Run Shell`;
  myStatusBarItem.command = 'myextension.runShell';
  myStatusBarItem.show();

  context.subscriptions.push(myStatusBarItem);

  const provider = new MyViewProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('myextensionView', provider)
  );
  const treeDataProvider = new MyTreeViewProvider();
  const treeView = vscode.window.createTreeView('myextensionView', {
    treeDataProvider
  });
  context.subscriptions.push(treeView);

  vscode.commands.registerCommand('myextension.editItem', async (item: EditableTreeItem) => {
    const newName = await vscode.window.showInputBox({
        prompt: 'Enter new item name',
        value: item.label.replace('Editable: ', '') // 去掉前缀
    });

    if (newName) {
      console.log(`New name: ${newName}`);
      item.label = `Editable: ${newName}`;
      const newItems = treeDataProvider.items.map(i =>
            i.id === item.id ? new EditableTreeItem(newName, i.id) : i
        );

        // ❷ 替换 `items` 数组
        treeDataProvider.setItems(newItems);
      // treeDataProvider.refresh(); // 刷新 TreeView
    }
  });

}

// This method is called when your extension is deactivated
export function deactivate() { }

class MyTreeViewProvider implements vscode.TreeDataProvider<MyTreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<MyTreeItem | undefined | void> = new vscode.EventEmitter<MyTreeItem | undefined | void>();
  readonly onDidChangeTreeData: vscode.Event<MyTreeItem | undefined | void> = this._onDidChangeTreeData.event;

  private inputValue: string = "";
  public items: vscode.TreeItem[] = [
    new MyTreeItem("输入内容: " + this.inputValue, vscode.TreeItemCollapsibleState.None),
    new MyButtonItem("提交", () => {
      vscode.window.showInputBox({ placeHolder: "输入内容..." }).then(value => {
        if (value !== undefined) {
          this.inputValue = value;
          this._onDidChangeTreeData.fire();
        }
      });
    }),
    new EditableTreeItem("fire", "f")
  ];

  getTreeItem(element: MyTreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(): Thenable<vscode.TreeItem[]> {
    return Promise.resolve(this.items);
  }

  setItems(newItems: vscode.TreeItem[]) {
    this.items = newItems;
    this.refresh();
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }
}

class EditableTreeItem extends vscode.TreeItem {
    constructor(
        public label: string,
        public id: string
    ) {
        super(label, vscode.TreeItemCollapsibleState.None);
        this.iconPath = new vscode.ThemeIcon('edit');
        this.label = "Editable: " + label; // 显示为可编辑
        this.command = {
            command: 'myextension.editItem',
            title: 'Edit Item',
            arguments: [this]
        };
    }
}

class MyTreeItem extends vscode.TreeItem {
  constructor(label: string, collapsibleState: vscode.TreeItemCollapsibleState) {
    super(label, collapsibleState);
  }
}

class MyButtonItem extends vscode.TreeItem {
  constructor(label: string, callback: () => void) {
    super(label, vscode.TreeItemCollapsibleState.None);
    this.command = {
      title: label,
      command: 'myextension.runShell',
      tooltip: '点击按钮',
      arguments: [callback]
    };
    // vscode.commands.registerCommand('myextension.buttonClick', (cb) => cb());
  }
}

class MyViewProvider implements vscode.WebviewViewProvider {
  constructor(private readonly _extensionUri: vscode.Uri) {
    console.log("✅ MyViewProvider initialized");
  }

  resolveWebviewView(webviewView: vscode.WebviewView) {
    console.log("✅ resolveWebviewView 执行了！");
    webviewView.webview.options = {
      enableScripts: true,
    };

    // WebView HTML 内容
    const html = this.getHtmlForWebview();
    console.log("✅ Setting WebView HTML:", html); // 调试 HTML 输出
    webviewView.webview.html = html;

    // 监听 WebView 事件
    // webviewView.webview.onDidReceiveMessage((message) => {
    //     if (message.command === 'runShell') {
    //         vscode.window.showInformationMessage('Button Clicked!');
    //     }
    // });
    webviewView.webview.onDidReceiveMessage((message) => {
      if (message.command === "inputChanged") {
        vscode.window.showInformationMessage(`输入内容: ${message.text}`);
      }
    });
  }

  // private getHtmlForWebview(): string {
  //     return `
  //         <!DOCTYPE html>
  //         <html lang="en">
  //         <head>
  //             <meta charset="UTF-8">
  //             <meta name="viewport" content="width=device-width, initial-scale=1.0">
  //         </head>
  //         <body>
  //             <button onclick="sendMessage()">Run Shell Command</button>
  //             <script>
  //                 const vscode = acquireVsCodeApi();
  //                 function sendMessage() {
  //                     vscode.postMessage({ command: 'runShell' });
  //                 }
  //             </script>
  //         </body>
  //         </html>
  //     `;
  // }

  private getHtmlForWebview(): string {
    return `
            <!DOCTYPE html>
            <html lang="zh">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                    body { font-family: Arial, sans-serif; padding: 10px; }
                    input { width: 100%; padding: 8px; font-size: 14px; }
                    button { background: #007acc; color: white; border: none; padding: 8px; cursor: pointer; margin-top: 10px; width: 100%; }
                </style>
            </head>
            <body>
                <h3>输入框示例</h3>
                <input id="lineEdit" type="text" placeholder="输入内容..." />
                <button id="submit">提交</button>

                <script>
                    console.log("✅ WebView Script 加载成功！");
                    const vscode = acquireVsCodeApi();

                    document.getElementById("submit").addEventListener("click", () => {
                        const text = document.getElementById("lineEdit").value;
                        console.log("✅ 发送输入内容:", text);
                        vscode.postMessage({ command: "inputChanged", text });
                    });
                </script>
            </body>
            </html>
        `;
  }
}