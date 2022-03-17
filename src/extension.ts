import * as vscode from "vscode";
import {
  BaseLanguageClient,
  ClientCapabilities,
  LanguageClient,
  LanguageClientOptions,
  Position,
  ServerOptions,
  StaticFeature,
  Range,
  TextDocumentIdentifier,
} from "vscode-languageclient/node";

let client: LanguageClient | null;

interface CursorPosition {
  position: Position;
  range?: Range;
}

interface CursorPositionParams {
  textDocument: TextDocumentIdentifier;
  cursors: CursorPosition[];
}

interface ConnectResponse {
  url: string;
}

interface ConnectWithTokenResponse {
  token: string;
}

export class CursorFeature implements StaticFeature {
  constructor(private _client: BaseLanguageClient) {}

  public fillClientCapabilities(capabilities: ClientCapabilities): void {
    let exp: { [key: string]: any } | undefined = capabilities.experimental;
    if (exp == null) {
      exp = capabilities.experimental = {};
    }
    if (exp.cursor == null) {
      exp.cursor = {};
    }
    exp.cursor.position = true;
  }

  public initialize(): void {}

  public dispose(): void {}
}

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand("pair-ls.start", startCommand)
  );
  context.subscriptions.push(
    vscode.commands.registerCommand("pair-ls.stop", stopCommand)
  );
  context.subscriptions.push(
    vscode.commands.registerCommand("pair-ls.createToken", createTokenCommand)
  );
  context.subscriptions.push(
    vscode.commands.registerCommand("pair-ls.connectToken", connectTokenCommand)
  );
  context.subscriptions.push(
    vscode.window.onDidChangeTextEditorSelection(function (e) {
      sendCursorPosition();
    })
  );
}

function sendCursorPosition() {
  const editor = vscode.window.activeTextEditor;
  if (editor == null || client == null) {
    return;
  }

  const params: CursorPositionParams = {
    textDocument: client.code2ProtocolConverter.asTextDocumentIdentifier(
      editor.document
    ),
    cursors: [],
  };
  for (const selection of editor.selections) {
    const curpos: CursorPosition = {
      position: client.code2ProtocolConverter.asWorkerPosition(
        selection.active
      ),
    };
    if (!selection.isEmpty) {
      curpos.range = client.code2ProtocolConverter.asRange(selection);
    }
    params.cursors.push(curpos);
  }
  client.sendNotification("experimental/cursor", params);
}

function startCommand(_context: vscode.ExtensionContext): Promise<void> {
  if (client != null) {
    vscode.window.showErrorMessage("Pair-ls is already running");
    return Promise.resolve();
  }
  const config = vscode.workspace.getConfiguration("pair-ls");
  const exe = config.get<string>("executable", "pair-ls");
  const flags = config
    .get<string>("flags", "lsp")
    .split(" ")
    .filter((t) => t !== "");
  const serverOptions: ServerOptions = {
    command: exe,
    args: flags,
  };

  const clientOptions: LanguageClientOptions = {
    documentSelector: [{ scheme: "*", language: "*" }],
  };

  client = new LanguageClient(
    "pair-ls",
    "Pair-ls",
    serverOptions,
    clientOptions
  );
  client.registerFeature(new CursorFeature(client));

  client.start();
  return client.onReady().then(sendCursorPosition);
}

async function getOrStartClient(
  context: vscode.ExtensionContext
): Promise<LanguageClient> {
  if (client == null) {
    await startCommand(context);
  }
  if (client == null) {
    throw new Error("Error starting client");
  }
  return client;
}

function stopCommand(_context: vscode.ExtensionContext) {
  if (client == null) {
    vscode.window.showErrorMessage("Pair-ls is not running");
    return;
  }
  client.stop().then(() => {
    vscode.window.showInformationMessage("Pair-ls stopped");
  });
  client = null;
}

async function createTokenCommand(context: vscode.ExtensionContext) {
  const client = await getOrStartClient(context);
  const response = await client.sendRequest<ConnectResponse>(
    "experimental/connectToPeer",
    {}
  );
  await vscode.env.clipboard.writeText(response.url);
  vscode.window.showInformationMessage(
    "Pair-ls: Sharing url copied to clipboard"
  );
}

async function connectTokenCommand(context: vscode.ExtensionContext) {
  const client = await getOrStartClient(context);
  const paste = await vscode.env.clipboard.readText();
  const token = await vscode.window.showInputBox({
    title: "Token",
    value: paste,
    prompt: "Paste in the connection token",
  });
  if (token == null) {
    return;
  }
  const response = await client.sendRequest<ConnectWithTokenResponse | null>(
    "experimental/connectToPeer",
    { token }
  );
  if (response != null) {
    await vscode.env.clipboard.writeText(response.token);
    vscode.window.showInformationMessage(
      "Pair-ls: Sharing token copied to clipboard"
    );
  }
}

export function deactivate(): Thenable<void> | undefined {
  if (client == null) {
    return;
  }
  const ret = client.stop();
  client = null;
  return ret;
}
