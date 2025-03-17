import * as vscode from "vscode";
import { VulnerabilityScanner } from "./scanner";
import { VulnerabilityPanel } from "./webview/vulnerabilityPanel";
import { ConfigManager, ConfigContext } from "./utils/configManager";
import { AIProvider } from "./interfaces/IAIClient";

let outputChannel: vscode.OutputChannel;

// Create an adapter to convert ExtensionContext to ConfigContext
function createConfigContext(context: vscode.ExtensionContext): ConfigContext {
  return {
    globalState: {
      get: (key: string) => context.globalState.get(key),
      update: async (key: string, value: any) => {
        await Promise.resolve(context.globalState.update(key, value));
      },
    },
    secrets: {
      get: async (key: string) => context.secrets.get(key),
      store: async (key: string, value: string) =>
        context.secrets.store(key, value),
    },
  };
}

export async function activate(context: vscode.ExtensionContext) {
  outputChannel = vscode.window.createOutputChannel("Security Scanner");
  outputChannel.appendLine("Security Scanner extension is now active");

  const configManager = new ConfigManager(createConfigContext(context));
  const scanner = new VulnerabilityScanner(configManager);

  // Register scan command
  let disposableScan = vscode.commands.registerCommand(
    "PwnScanner.scan",
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage("No active editor found");
        return;
      }

      try {
        outputChannel.appendLine("Starting security scan...");
        const provider = await configManager.getSelectedProvider();
        const apiKey = await configManager.getApiKey(provider);
        if (!apiKey) {
          outputChannel.appendLine("API key not found, prompting user...");
          const key = await vscode.window.showInputBox({
            prompt: `Enter your ${provider} API Key`,
            password: true,
          });
          if (key) {
            await configManager.setApiKey(provider, key);
            outputChannel.appendLine("API key saved successfully");
          } else {
            outputChannel.appendLine("No API key provided");
            vscode.window.showErrorMessage("API key is required");
            return;
          }
        }

        const document = editor.document;
        const text = document.getText();
        outputChannel.appendLine(`Scanning ${document.languageId} file...`);

        vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: "Scanning for vulnerabilities...",
            cancellable: false,
          },
          async () => {
            const results = await scanner.scanCode(text, document.languageId);
            outputChannel.appendLine(
              `Scan complete. Found ${results.length} vulnerabilities.`
            );

            const panel = VulnerabilityPanel.createOrShow(context.extensionUri);
            panel.show(results, document.fileName, provider);
          }
        );
      } catch (error) {
        let errorMessage = "An unknown error occurred";
        if (error instanceof Error) {
          errorMessage = error.message;
          outputChannel.appendLine(
            `Error during scan: ${error.stack || error.message}`
          );
        }
        vscode.window.showErrorMessage(`Scan failed: ${errorMessage}`);
      }
    }
  );

  // Register configuration command
  let disposableConfig = vscode.commands.registerCommand(
    "PwnScanner.configure",
    async () => {
      outputChannel.appendLine("Opening configuration dialog...");
      const selectedProvider = await configManager.getSelectedProvider();
      const providers = [AIProvider.OpenAI, AIProvider.Claude, AIProvider.Grok];

      const provider = await vscode.window.showQuickPick(providers, {
        placeHolder: "Select AI Provider",
        canPickMany: false,
      });

      if (provider) {
        await configManager.setSelectedProvider(provider as AIProvider);

        // Trigger the provider changed event to update the status bar
        vscode.commands.executeCommand("PwnScanner.providerChanged");

        const apiKey = await vscode.window.showInputBox({
          prompt: `Enter your ${provider} API Key`,
          password: true,
        });

        if (apiKey) {
          await configManager.setApiKey(provider as AIProvider, apiKey);
          outputChannel.appendLine("API key configured successfully");
          vscode.window.showInformationMessage("API key saved successfully");
        }
      }
    }
  );

  // Create status bar item
  const statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  );

  // Update status bar with current provider
  const updateStatusBar = async () => {
    const provider = await configManager.getSelectedProvider();
    statusBarItem.text = `$(shield) Scan Security [${provider}]`;
    statusBarItem.tooltip = `Scan for vulnerabilities using ${provider}`;
  };

  // Initial update
  updateStatusBar();

  // Update when provider changes
  statusBarItem.command = "PwnScanner.scan";
  statusBarItem.show();

  // Add event listener to update status bar when provider changes
  let disposableProviderChanged = vscode.commands.registerCommand(
    "PwnScanner.providerChanged",
    async () => {
      await updateStatusBar();
    }
  );

  context.subscriptions.push(
    disposableScan,
    disposableConfig,
    disposableProviderChanged,
    statusBarItem,
    outputChannel
  );
}

export function deactivate() {
  outputChannel.appendLine("Security Scanner extension is deactivating");
}
