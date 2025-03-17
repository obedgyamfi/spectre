import { AIClientFactory } from "./utils/aiClientFactory";
import { ConfigManager } from "./utils/configManager";
import { AIProvider } from "./interfaces/IAIClient";

export interface VulnerabilityResult {
  severity: "High" | "Medium" | "Low";
  type?: string;
  description: string;
  lineNumber?: number;
  suggestion: string;
  confidence: number;
  codeSnippet?: string;
  fullFunctionCode?: string;
  vulnerableFunction?: string;
}

export class VulnerabilityScanner {
  constructor(private configManager: ConfigManager) {}

  private extractCodeSnippet(
    code: string,
    lineNumber: number | undefined
  ): string | undefined {
    if (!lineNumber) return undefined;

    const lines = code.split("\n");

    // We want to show exact line numbers including comments and empty lines
    // Show 3 lines before and 5 lines after the vulnerable line for a total of 8 lines
    const start = Math.max(0, lineNumber - 3);
    const end = Math.min(lines.length, lineNumber + 6); // +6 to include the target line and 5 lines after

    // Return snippet with original line numbers preserved
    return lines
      .slice(start, end)
      .map((line, index) => `${start + index + 1}: ${line}`)
      .join("\n");
  }

  private extractFullFunction(
    code: string,
    functionName: string | undefined
  ): string | undefined {
    if (!functionName) return undefined;

    const lines = code.split("\n");
    const functionRegex = new RegExp(`function\\s+${functionName}\\s*\\(`);
    let startLine = -1;
    let braceCount = 0;
    let foundFunction = false;
    let functionCode = [];

    // Find the start of the function
    for (let i = 0; i < lines.length; i++) {
      if (functionRegex.test(lines[i])) {
        startLine = i;
        foundFunction = true;
        break;
      }
    }

    if (!foundFunction) return undefined;

    // Extract the full function with proper brace counting
    for (let i = startLine; i < lines.length; i++) {
      const line = lines[i];
      functionCode.push(line);

      // Count opening braces
      const openBraces = (line.match(/{/g) || []).length;
      braceCount += openBraces;

      // Count closing braces
      const closeBraces = (line.match(/}/g) || []).length;
      braceCount -= closeBraces;

      // When we reach the end of the function
      if (braceCount === 0 && foundFunction && openBraces > 0) {
        break;
      }
    }

    // Return the full function with line numbers
    return functionCode
      .map((line, index) => `${startLine + index + 1}: ${line}`)
      .join("\n");
  }

  async scanCode(
    code: string,
    language: string
  ): Promise<VulnerabilityResult[]> {
    const provider = await this.configManager.getSelectedProvider();
    let vulnerabilities: VulnerabilityResult[] = [];

    // Check if we have multiple API keys available for cross-validation
    const openaiKey = await this.configManager.getApiKey(AIProvider.OpenAI);
    const claudeKey = await this.configManager.getApiKey(AIProvider.Claude);
    const grokKey = await this.configManager.getApiKey(AIProvider.Grok);

    // Determine which providers to use based on available API keys
    const availableProviders: AIProvider[] = [];
    if (openaiKey) availableProviders.push(AIProvider.OpenAI);
    if (claudeKey) availableProviders.push(AIProvider.Claude);
    if (grokKey) availableProviders.push(AIProvider.Grok);

    const useMultipleProviders = availableProviders.length >= 2;

    const basePrompt = `
            As a security expert, analyze the following ${language} code for vulnerabilities.
            You must return the results in the following JSON format:

            {
                "vulnerabilities": [
                    {
                        "severity": "High|Medium|Low",
                        "type": "The specific type of vulnerability (e.g., SQL Injection, XSS, Buffer Overflow)",
                        "vulnerableFunction": "The name of the vulnerable function",
                        "lineNumber": number (the exact line where the vulnerability exists, ignoring comments and empty lines),
                        "description": "A detailed explanation of why this code is vulnerable",
                        "suggestion": "Step-by-step remediation steps with code examples",
                        "confidence": number (between 0 and 1)
                    }
                ]
            }

            Important:
            1. For line numbers, only count actual code lines (ignore comments and empty lines)
            2. Look for ALL vulnerabilities including but not limited to:
               - SQL Injection
               - Cross-site Scripting (XSS)
               - Buffer Overflows
               - Command Injection
               - Authentication Issues
               - Race Conditions
               - Cryptographic Failures
               - Business Logic Flaws
               - API Security Issues
               - Third-party Component Vulnerabilities
            3. Consider both technical and business logic vulnerabilities
            4. Set confidence scores based on certainty:
               - High (0.8-1.0): Clear, definite vulnerabilities
               - Medium (0.5-0.7): Likely but not certain vulnerabilities
               - Low (0.1-0.4): Potential but uncertain vulnerabilities

            Code to analyze:
            ${code}
        `;

    try {
      if (useMultipleProviders) {
        console.log(
          `Starting enhanced scan with cross-validation between multiple AI providers...`
        );

        // Get results from all available providers in parallel
        const providerResults = await Promise.all(
          availableProviders.map((provider) =>
            this.scanWithProvider(provider, basePrompt)
          )
        );

        // Log results from each provider
        providerResults.forEach((results, index) => {
          console.log(
            `Received ${results.length} findings from ${availableProviders[index]}.`
          );
        });

        // Cross-validate results from multiple providers
        if (providerResults.length >= 2) {
          // Start with the first two providers
          let mergedResults = this.crossValidateResults(
            providerResults[0],
            providerResults[1]
          );

          // If we have more than 2 providers, continue merging results
          for (let i = 2; i < providerResults.length; i++) {
            mergedResults = this.crossValidateResults(
              mergedResults,
              providerResults[i]
            );
          }

          vulnerabilities = mergedResults;
        } else {
          // This shouldn't happen since we check useMultipleProviders, but just in case
          vulnerabilities = providerResults[0];
        }

        console.log(
          `After cross-validation, identified ${vulnerabilities.length} total vulnerabilities.`
        );

        const highConfidenceCount = vulnerabilities.filter(
          (v) => v.confidence >= 0.5
        ).length;
        const lowConfidenceCount = vulnerabilities.filter(
          (v) => v.confidence < 0.5
        ).length;
        console.log(
          `Confidence breakdown: ${highConfidenceCount} validated (≥50%), ${lowConfidenceCount} unconfirmed (<50%)`
        );
      } else {
        // Run scan with single provider
        console.log(
          `Starting scan with ${provider} provider (cross-validation disabled)...`
        );
        vulnerabilities = await this.scanWithProvider(provider, basePrompt);
        console.log(
          `Received ${vulnerabilities.length} findings from ${provider}.`
        );
      }

      // Add code snippets and full function code to the results
      const enhancedVulnerabilities = vulnerabilities.map((vulnerability) => {
        const codeSnippet = this.extractCodeSnippet(
          code,
          vulnerability.lineNumber
        );
        const fullFunctionCode = this.extractFullFunction(
          code,
          vulnerability.vulnerableFunction
        );

        return {
          ...vulnerability,
          codeSnippet: codeSnippet,
          fullFunctionCode: fullFunctionCode,
        };
      });

      return enhancedVulnerabilities;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Failed to scan code: ${errorMessage}`);
    }
  }

  private async scanWithProvider(
    provider: AIProvider,
    prompt: string
  ): Promise<VulnerabilityResult[]> {
    const client = AIClientFactory.createClient(provider, this.configManager);
    console.log(`Scanning with ${provider}...`);

    try {
      const response = await client.analyze(prompt);
      const result = JSON.parse(response);

      if (!result || !Array.isArray(result.vulnerabilities)) {
        throw new Error(`Invalid response format from ${provider}`);
      }

      return result.vulnerabilities;
    } catch (error) {
      console.error(`Error scanning with ${provider}:`, error);
      return [];
    }
  }

  private crossValidateResults(
    resultsA: VulnerabilityResult[],
    resultsB: VulnerabilityResult[]
  ): VulnerabilityResult[] {
    const mergedResults: VulnerabilityResult[] = [];
    const processedVulnerabilities = new Set<string>();

    // Improved key generation for vulnerabilities with more flexible matching
    const getVulnerabilityKey = (v: VulnerabilityResult) =>
      `${v.type || ""}-${v.vulnerableFunction || ""}-${v.lineNumber || 0}`;

    // Alternative simpler key for backup matching if we don't have a perfect match
    const getSimpleKey = (v: VulnerabilityResult) =>
      `${v.vulnerableFunction || ""}-${v.lineNumber || 0}`;

    // Fuzzy matching for descriptions (using string similarity heuristic)
    const descriptionSimilarity = (desc1: string, desc2: string): number => {
      const normalize = (s: string) => s.toLowerCase().replace(/[^\w\s]/g, "");
      const words1 = new Set(normalize(desc1).split(/\s+/));
      const words2 = new Set(normalize(desc2).split(/\s+/));

      // Count common words
      let commonCount = 0;
      for (const word of words1) {
        if (words2.has(word)) commonCount++;
      }

      // Calculate Jaccard similarity
      const totalUniqueWords = new Set([...words1, ...words2]).size;
      return totalUniqueWords > 0 ? commonCount / totalUniqueWords : 0;
    };

    console.log(
      `Cross-validating ${resultsA.length} results with ${resultsB.length} results from different providers`
    );

    // Process matching vulnerabilities with enhanced logic
    resultsA.forEach((vulnA) => {
      const keyA = getVulnerabilityKey(vulnA);
      const simpleKeyA = getSimpleKey(vulnA);

      // Try for exact match first
      let matchingVulnB = resultsB.find(
        (vulnB) => getVulnerabilityKey(vulnB) === keyA
      );

      // If no exact match, try with a simpler key (function + line number)
      if (!matchingVulnB) {
        matchingVulnB = resultsB.find(
          (vulnB) => getSimpleKey(vulnB) === simpleKeyA
        );
      }

      // If still no match, try description similarity as last resort
      if (!matchingVulnB && vulnA.description) {
        const similarities = resultsB
          .filter(
            (vb) => !processedVulnerabilities.has(getVulnerabilityKey(vb))
          )
          .map((vb) => ({
            vuln: vb,
            similarity: descriptionSimilarity(
              vulnA.description,
              vb.description
            ),
          }))
          .filter((item) => item.similarity > 0.5) // Only consider good matches
          .sort((a, b) => b.similarity - a.similarity);

        if (similarities.length > 0) {
          matchingVulnB = similarities[0].vuln;
        }
      }

      if (matchingVulnB) {
        // Both providers found the same vulnerability - combine their insights
        const combinedDescription =
          vulnA.description.length > matchingVulnB.description.length
            ? vulnA.description
            : matchingVulnB.description;

        const combinedSuggestion =
          vulnA.suggestion.length > matchingVulnB.suggestion.length
            ? vulnA.suggestion
            : matchingVulnB.suggestion;

        // Boost confidence for matched findings (capped at 95%)
        const boostFactor = 1.2; // 20% boost for agreement
        const combinedConfidence = Math.min(
          0.95,
          ((vulnA.confidence + matchingVulnB.confidence) / 2) * boostFactor
        );

        mergedResults.push({
          ...vulnA,
          description: combinedDescription,
          suggestion: combinedSuggestion,
          confidence: combinedConfidence,
        });

        processedVulnerabilities.add(getVulnerabilityKey(matchingVulnB));
      } else {
        // Only one provider found this vulnerability (reduce confidence by 25%)
        mergedResults.push({
          ...vulnA,
          confidence: Math.max(0.1, vulnA.confidence * 0.75),
        });
      }
    });

    // Add unique vulnerabilities from the second provider
    resultsB.forEach((vulnB) => {
      const keyB = getVulnerabilityKey(vulnB);
      if (!processedVulnerabilities.has(keyB)) {
        // Only one provider found this vulnerability (reduce confidence by 25%)
        mergedResults.push({
          ...vulnB,
          confidence: Math.max(0.1, vulnB.confidence * 0.75),
        });
      }
    });

    return mergedResults;
  }
}
