/**
 * Standard CSV Strategy (RFC 4180)
 *
 * Implements RFC 4180 compliant CSV parsing
 * Baseline parsing strategy with 85-95% confidence
 */

import { parse } from "csv-parse/sync";
import { BaseCSVStrategy } from "./base-strategy";
import { CSVParseResult } from "../adaptive-csv-extractor";

export class StandardCSVStrategy extends BaseCSVStrategy {
  name = "standard";
  priority = 100; // Highest priority - baseline strategy

  /**
   * Execute RFC 4180 standard CSV parsing
   */
  async execute(buffer: Buffer, fileName: string): Promise<CSVParseResult> {
    const startTime = Date.now();

    try {
      const encoding = this.detectEncoding(buffer);
      const content = buffer.toString(
        encoding.replace("-bom", "") as BufferEncoding,
      );

      // RFC 4180 compliant parsing with relaxed column count for real-world CSV files
      const records = parse(content, {
        columns: false, // Get array format first to detect headers
        skip_empty_lines: true,
        trim: false, // RFC 4180 preserves whitespace
        quote: '"',
        delimiter: ",",
        escape: '"',
        relax_quotes: false, // Strict RFC compliance
        relax_column_count: true, // Allow varying field counts for real-world CSV files
        auto_parse: false, // Keep all values as strings initially
        bom: true,
      });

      if (records.length === 0) {
        return this.createFailureResult("No records found", startTime);
      }

      // Detect headers
      const hasHeaders = this.hasHeaders(
        records.map((row) => row.join(",")),
        ",",
      );

      // Convert to object format
      let data: any[];
      if (hasHeaders) {
        const headers = records[0].map((header: string) =>
          this.sanitizeFieldName(header),
        );
        data = records.slice(1).map((row: any[]) => {
          const obj: any = {};
          headers.forEach((header, index) => {
            obj[header] = this.cleanCellValue(row[index]);
          });
          return obj;
        });
      } else {
        // Generate column names for headerless data
        const columnCount = Math.max(...records.map((row) => row.length));
        const headers = this.generateColumnNames(columnCount);

        data = records.map((row: any[]) => {
          const obj: any = {};
          headers.forEach((header, index) => {
            obj[header] = this.cleanCellValue(row[index]);
          });
          return obj;
        });
      }

      // Calculate quality metrics
      const parseTime = Date.now() - startTime;
      const qualityScore = this.calculateDataQuality(data);
      const confidence = this.calculateConfidence(
        data,
        qualityScore,
        parseTime,
      );

      return {
        success: true,
        data,
        confidence,
        strategy: this.name,
        metadata: {
          delimiter: ",",
          hasHeaders,
          totalRecords: data.length,
          encoding,
          parseTime,
          qualityScore,
          issues: this.identifyIssues(data, records),
        },
      };
    } catch (error) {
      return this.createFailureResult(
        error instanceof Error ? error.message : "Standard CSV parsing failed",
        startTime,
      );
    }
  }

  /**
   * Check if this strategy can handle the buffer
   */
  canHandle(buffer: Buffer): boolean {
    try {
      const sample = buffer.toString("utf8", 0, Math.min(1024, buffer.length));

      // Must contain commas as delimiters
      if (!sample.includes(",")) return false;

      // Should not have too many other potential delimiters
      const semicolonCount = (sample.match(/;/g) || []).length;
      const commaCount = (sample.match(/,/g) || []).length;
      const tabCount = (sample.match(/\t/g) || []).length;

      // Comma should be dominant delimiter
      return commaCount >= semicolonCount && commaCount >= tabCount;
    } catch {
      return false;
    }
  }

  /**
   * Calculate confidence score for standard CSV parsing
   */
  private calculateConfidence(
    data: any[],
    qualityScore: number,
    parseTime: number,
  ): number {
    let confidence = 85; // Base confidence for standard CSV

    // Quality bonus
    confidence += (qualityScore - 50) * 0.2;

    // Data bonus from base class
    confidence += this.getConfidenceBonus(data);

    // Performance penalty for slow parsing
    if (parseTime > 1000) confidence -= 5;
    if (parseTime > 5000) confidence -= 10;

    return Math.max(70, Math.min(95, confidence));
  }

  /**
   * Identify potential issues with the parsing
   */
  private identifyIssues(data: any[], rawRecords: any[][]): string[] {
    const issues: string[] = [];

    // Check for inconsistent row lengths
    const lengths = rawRecords.map((row) => row.length);
    const minLength = Math.min(...lengths);
    const maxLength = Math.max(...lengths);

    if (maxLength - minLength > 1) {
      issues.push("Inconsistent column count across rows");
    }

    // Check for potential embedded delimiters
    const hasQuotedFields = rawRecords.some((row) =>
      row.some((cell) => typeof cell === "string" && cell.includes('"')),
    );

    if (hasQuotedFields) {
      issues.push("Contains quoted fields - may need complex field handling");
    }

    // Check data completeness
    if (data.length > 0) {
      const firstRowKeys = Object.keys(data[0]);
      const totalCells = data.length * firstRowKeys.length;
      const emptyCells = data.reduce((count, row) => {
        return (
          count +
          firstRowKeys.filter(
            (key) =>
              row[key] === null || row[key] === undefined || row[key] === "",
          ).length
        );
      }, 0);

      const emptyPercentage = (emptyCells / totalCells) * 100;
      if (emptyPercentage > 25) {
        issues.push(
          `High percentage of empty cells (${Math.round(emptyPercentage)}%)`,
        );
      }
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

export default StandardCSVStrategy;
