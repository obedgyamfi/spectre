const vscode = require("vscode");

async function testActivation() {
  console.log("Testing extension activation...");

  // Get all registered commands
  const commands = await vscode.commands.getCommands(true);

  // Check if our commands are registered
  const hasScanCommand = commands.includes("PwnScanner.scan");
  const hasConfigureCommand = commands.includes("PwnScanner.configure");

  console.log("Commands registered:");
  console.log(`PwnScanner.scan: ${hasScanCommand ? "YES" : "NO"}`);
  console.log(`PwnScanner.configure: ${hasConfigureCommand ? "YES" : "NO"}`);

  if (!hasScanCommand || !hasConfigureCommand) {
    console.error("ERROR: Commands are not properly registered!");
  } else {
    console.log("SUCCESS: All commands are properly registered.");
  }
}

module.exports = { testActivation };

// Run the test if this file is executed directly
if (require.main === module) {
  testActivation().catch((error) => {
    console.error("Test failed:", error);
  });
}
