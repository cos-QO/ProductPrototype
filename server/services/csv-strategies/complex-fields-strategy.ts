/**
 * Complex Fields Strategy
 *
 * Handles CSV files with embedded delimiters, quotes, multiline fields
 * Specialized for complex data exports and advanced CSV formats
 * Confidence: 80-90% when complex patterns successfully parsed
 */

import { parse } from "csv-parse/sync";
import { BaseCSVStrategy } from "./base-strategy";
import { CSVParseResult } from "../adaptive-csv-extractor";

export class ComplexFieldsStrategy extends BaseCSVStrategy {
  name = "complex-fields";
  priority = 60; // Medium-low priority - used when other strategies fail

  /**
   * Execute complex fields parsing
   */
  async execute(buffer: Buffer, fileName: string): Promise<CSVParseResult> {
    const startTime = Date.now();

    try {
      const encoding = this.detectEncoding(buffer);
      const content = buffer.toString(
        encoding.replace("-bom", "") as BufferEncoding,
      );

      // Analyze content for complex field patterns
      const complexity = this.analyzeComplexity(content);

      // Try multiple parsing strategies based on detected complexity
      const results = await this.tryComplexParsingStrategies(
        content,
        complexity,
      );

      if (results.length === 0) {
        return this.createFailureResult(
          "No successful complex parsing strategy",
          startTime,
        );
      }

      // Select best result
      const bestResult = results.sort(
        (a, b) => b.qualityScore - a.qualityScore,
      )[0];

      const parseTime = Date.now() - startTime;
      const confidence = this.calculateConfidence(
        bestResult.data,
        complexity,
        bestResult.qualityScore,
        parseTime,
      );

      return {
        success: true,
        data: bestResult.data,
        confidence,
        strategy: this.name,
        metadata: {
          delimiter: bestResult.delimiter,
          hasHeaders: bestResult.hasHeaders,
          totalRecords: bestResult.data.length,
          encoding,
          parseTime,
          qualityScore: bestResult.qualityScore,
          issues: bestResult.issues,
        },
      };
    } catch (error) {
      return this.createFailureResult(
        error instanceof Error
          ? error.message
          : "Complex fields parsing failed",
        startTime,
      );
    }
  }

  /**
   * Check if this strategy can handle the buffer
   */
  canHandle(buffer: Buffer): boolean {
    try {
      const sample = buffer.toString("utf8", 0, Math.min(2048, buffer.length));

      // Look for complex field indicators
      const hasQuotedFields = /"[^"]*"/.test(sample);
      const hasEmbeddedDelimiters = /"[^"]*[,;|\t][^"]*"/.test(sample);
      const hasEscapedQuotes = /""/.test(sample) || /\\"/.test(sample);
      const hasMultilineFields = /"[^"]*\n[^"]*"/.test(sample);
      const hasComplexQuoting = sample.includes('""') || sample.includes('\\"');

      // Strategy should be used if complex patterns are detected
      return (
        hasQuotedFields ||
        hasEmbeddedDelimiters ||
        hasEscapedQuotes ||
        hasMultilineFields ||
        hasComplexQuoting
      );
    } catch {
      return false;
    }
  }

  /**
   * Analyze content complexity
   */
  private analyzeComplexity(content: string): any {
    const analysis = {
      hasQuotedFields: false,
      hasEmbeddedDelimiters: false,
      hasEscapedQuotes: false,
      hasMultilineFields: false,
      hasVariableQuoting: false,
      quotingStyle: "rfc4180", // rfc4180, escaped, or mixed
      delimiter: ",",
      complexityScore: 0,
    };

    // Check for quoted fields
    analysis.hasQuotedFields = /"[^"]*"/.test(content);
    if (analysis.hasQuotedFields) analysis.complexityScore += 2;

    // Check for embedded delimiters within quotes
    const delimiters = [",", ";", "\t", "|"];
    for (const delim of delimiters) {
      const pattern = new RegExp(`"[^"]*\\${delim}[^"]*"`, "g");
      if (pattern.test(content)) {
        analysis.hasEmbeddedDelimiters = true;
        analysis.delimiter = delim;
        analysis.complexityScore += 3;
        break;
      }
    }

    // Check for escaped quotes (RFC 4180 style: "")
    if (content.includes('""')) {
      analysis.hasEscapedQuotes = true;
      analysis.quotingStyle = "rfc4180";
      analysis.complexityScore += 2;
    }

    // Check for backslash escaped quotes
    if (content.includes('\\"')) {
      analysis.hasEscapedQuotes = true;
      analysis.quotingStyle = "escaped";
      analysis.complexityScore += 3;
    }

    // Check for multiline fields
    if (/"[^"]*\n[^"]*"/.test(content)) {
      analysis.hasMultilineFields = true;
      analysis.complexityScore += 4;
    }

    // Check for variable quoting (some fields quoted, others not)
    const lines = content.split("\n").slice(0, 10);
    let quotedFieldLines = 0;
    let mixedQuotingLines = 0;

    for (const line of lines) {
      if (line.includes('"')) {
        quotedFieldLines++;
        const fields = this.parseLineBasic(line, analysis.delimiter);
        const quotedFields = fields.filter(
          (f) => f.startsWith('"') && f.endsWith('"'),
        );
        if (quotedFields.length > 0 && quotedFields.length < fields.length) {
          mixedQuotingLines++;
        }
      }
    }

    if (mixedQuotingLines > 0) {
      analysis.hasVariableQuoting = true;
      analysis.complexityScore += 2;
    }

    return analysis;
  }

  /**
   * Try multiple complex parsing strategies
   */
  private async tryComplexParsingStrategies(
    content: string,
    complexity: any,
  ): Promise<any[]> {
    const results: any[] = [];

    // Strategy 1: RFC 4180 with relaxed quotes
    try {
      const result = await this.parseRFC4180Relaxed(content, complexity);
      if (result.success) results.push(result);
    } catch (e) {
      // Continue to next strategy
    }

    // Strategy 2: Custom quote handling
    try {
      const result = await this.parseCustomQuotes(content, complexity);
      if (result.success) results.push(result);
    } catch (e) {
      // Continue to next strategy
    }

    // Strategy 3: Multiline field handling
    if (complexity.hasMultilineFields) {
      try {
        const result = await this.parseMultilineFields(content, complexity);
        if (result.success) results.push(result);
      } catch (e) {
        // Continue to next strategy
      }
    }

    // Strategy 4: Manual field parsing for highly complex cases
    try {
      const result = await this.parseManualFieldExtraction(content, complexity);
      if (result.success) results.push(result);
    } catch (e) {
      // Continue to next strategy
    }

    return results;
  }

  /**
   * Parse using RFC 4180 with relaxed quote handling
   */
  private async parseRFC4180Relaxed(
    content: string,
    complexity: any,
  ): Promise<any> {
    const records = parse(content, {
      columns: false,
      skip_empty_lines: true,
      trim: false, // Preserve whitespace in complex fields
      quote: '"',
      delimiter: complexity.delimiter,
      escape: '"',
      relax_quotes: true,
      relax_column_count: true, // Allow variable column counts
      auto_parse: false,
      bom: true,
    });

    return this.processParseResults(records, complexity, "rfc4180-relaxed");
  }

  /**
   * Parse with custom quote handling
   */
  private async parseCustomQuotes(
    content: string,
    complexity: any,
  ): Promise<any> {
    const records = parse(content, {
      columns: false,
      skip_empty_lines: true,
      trim: false,
      quote: '"',
      delimiter: complexity.delimiter,
      escape: complexity.quotingStyle === "escaped" ? "\\" : '"',
      relax_quotes: true,
      relax_column_count: true,
      auto_parse: false,
      bom: true,
    });

    return this.processParseResults(records, complexity, "custom-quotes");
  }

  /**
   * Parse multiline fields
   */
  private async parseMultilineFields(
    content: string,
    complexity: any,
  ): Promise<any> {
    // Enable multiline parsing
    const records = parse(content, {
      columns: false,
      skip_empty_lines: false, // Keep empty lines for multiline detection
      trim: false,
      quote: '"',
      delimiter: complexity.delimiter,
      escape: '"',
      relax_quotes: true,
      relax_column_count: true,
      auto_parse: false,
      bom: true,
      record_delimiter: "\n", // Explicit record delimiter
    });

    return this.processParseResults(records, complexity, "multiline");
  }

  /**
   * Manual field extraction for very complex cases
   */
  private async parseManualFieldExtraction(
    content: string,
    complexity: any,
  ): Promise<any> {
    const lines = content.split("\n");
    const records: any[][] = [];

    for (const line of lines) {
      if (line.trim() === "") continue;

      const fields = this.extractComplexFields(line, complexity);
      if (fields.length > 0) {
        records.push(fields);
      }
    }

    return this.processParseResults(records, complexity, "manual-extraction");
  }

  /**
   * Extract complex fields manually
   */
  private extractComplexFields(line: string, complexity: any): string[] {
    const fields: string[] = [];
    let currentField = "";
    let inQuotes = false;
    let i = 0;

    while (i < line.length) {
      const char = line[i];
      const nextChar = i + 1 < line.length ? line[i + 1] : "";

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Escaped quote
          currentField += '"';
          i += 2; // Skip both quotes
          continue;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === complexity.delimiter && !inQuotes) {
        fields.push(currentField.trim());
        currentField = "";
      } else {
        currentField += char;
      }

      i++;
    }

    // Add the last field
    if (currentField !== "" || fields.length > 0) {
      fields.push(currentField.trim());
    }

    return fields;
  }

  /**
   * Process parse results into standard format
   */
  private processParseResults(
    records: any[][],
    complexity: any,
    strategy: string,
  ): any {
    if (records.length === 0) {
      return { success: false };
    }

    // Clean up fields
    const cleanRecords = records.map((row) =>
      row.map((cell) => this.cleanComplexCell(cell)),
    );

    // Detect headers
    const hasHeaders = this.hasHeaders(
      cleanRecords.map((row) => row.join(complexity.delimiter)),
      complexity.delimiter,
    );

    // Convert to object format
    let data: any[];
    if (hasHeaders) {
      const headers = cleanRecords[0].map((header: string) =>
        this.sanitizeFieldName(String(header)),
      );
      data = cleanRecords.slice(1).map((row: any[]) => {
        const obj: any = {};
        headers.forEach((header, index) => {
          obj[header] = row[index];
        });
        return obj;
      });
    } else {
      const columnCount = Math.max(...cleanRecords.map((row) => row.length));
      const headers = this.generateColumnNames(columnCount);

      data = cleanRecords.map((row: any[]) => {
        const obj: any = {};
        headers.forEach((header, index) => {
          obj[header] = row[index] || null;
        });
        return obj;
      });
    }

    const qualityScore = this.calculateDataQuality(data);
    const issues = this.identifyComplexIssues(
      data,
      cleanRecords,
      complexity,
      strategy,
    );

    return {
      success: true,
      data,
      delimiter: complexity.delimiter,
      hasHeaders,
      qualityScore,
      issues,
      strategy,
    };
  }

  /**
   * Clean complex cell values
   */
  private cleanComplexCell(value: any): any {
    if (value == null) return null;

    let str = String(value);

    // Remove surrounding quotes if present
    if (str.startsWith('"') && str.endsWith('"')) {
      str = str.slice(1, -1);
      // Unescape internal quotes
      str = str.replace(/""/g, '"');
    }

    // Handle escaped characters
    str = str.replace(/\\"/g, '"');
    str = str.replace(/\\n/g, "\n");
    str = str.replace(/\\t/g, "\t");
    str = str.replace(/\\r/g, "\r");

    return str;
  }

  /**
   * Parse line with basic delimiter splitting
   */
  private parseLineBasic(line: string, delimiter: string): string[] {
    return line.split(delimiter);
  }

  /**
   * Calculate confidence for complex fields parsing
   */
  private calculateConfidence(
    data: any[],
    complexity: any,
    qualityScore: number,
    parseTime: number,
  ): number {
    let confidence = 80; // Base confidence for complex fields

    // Complexity bonus (successfully handling complex data is good)
    if (complexity.complexityScore > 5) confidence += 5;
    if (complexity.complexityScore > 10) confidence += 5;

    // Quality bonus
    confidence += (qualityScore - 50) * 0.15;

    // Data structure bonus
    confidence += this.getConfidenceBonus(data);

    // Performance penalty (complex parsing takes longer)
    if (parseTime > 2000) confidence -= 5;
    if (parseTime > 5000) confidence -= 10;

    return Math.max(60, Math.min(90, confidence));
  }

  /**
   * Identify issues specific to complex fields parsing
   */
  private identifyComplexIssues(
    data: any[],
    rawRecords: any[][],
    complexity: any,
    strategy: string,
  ): string[] {
    const issues: string[] = [];

    // Strategy-specific issues
    if (strategy === "manual-extraction") {
      issues.push("Used manual field extraction - verify data accuracy");
    }

    // Check for unresolved complexity
    if (complexity.hasMultilineFields && strategy !== "multiline") {
      issues.push(
        "Multiline fields detected but not handled with multiline strategy",
      );
    }

    // Check for quote inconsistencies
    if (data.length > 0) {
      const firstRowKeys = Object.keys(data[0]);
      let hasQuoteFragments = false;

      for (const row of data) {
        for (const key of firstRowKeys) {
          const value = String(row[key] || "");
          if (
            value.includes('"') &&
            !(value.startsWith('"') && value.endsWith('"'))
          ) {
            hasQuoteFragments = true;
            break;
          }
        }
        if (hasQuoteFragments) break;
      }

      if (hasQuoteFragments) {
        issues.push("Potential quote parsing issues detected");
      }
    }

    // Check for field count inconsistencies
    const lengths = rawRecords.map((row) => row.length);
    const uniqueLengths = new Set(lengths);
    if (uniqueLengths.size > 5) {
      issues.push(
        "Highly variable field count - complex structure may not be fully resolved",
      );
    }

    // Check for embedded newlines in single-line context
    if (complexity.hasMultilineFields && strategy === "rfc4180-relaxed") {
      issues.push("Multiline fields may have been flattened to single lines");
    }

    return issues;
  }

  /**
   * Create failure result
   */
  private createFailureResult(
    error: string,
    startTime: number,
  ): CSVParseResult {
    return {
      success: false,
      data: [],
      confidence: 0,
      strategy: this.name,
      metadata: {
        delimiter: ",",
        hasHeaders: false,
        totalRecords: 0,
        encoding: "utf8",
        parseTime: Date.now() - startTime,
        qualityScore: 0,
        issues: [error],
      },
      error,
    };
  }
}

export default ComplexFieldsStrategy;
