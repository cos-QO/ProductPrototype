/**
 * Error Pattern Analysis Engine
 * Real-time analysis of error logs and failure patterns for edge case detection
 */

import { db } from "../db";
import {
  errorPatterns,
  errorAnalytics,
  importSessions,
  type InsertErrorPattern,
  type InsertErrorAnalytics,
  type RiskLevel,
} from "@shared/schema";
import { eq, desc, and, or, sql, gte, lte, inArray, count, avg } from "drizzle-orm";
import { ValidationError } from "./error-recovery-service";
import { v4 as uuidv4 } from "uuid";

// Interfaces for pattern analysis
interface ErrorPatternAnalysis {
  patternId: string;
  signature: string;
  frequency: number;
  confidence: number;
  classification: PatternClassification;
  riskLevel: RiskLevel;
  trending: TrendDirection;
  historicalContext: HistoricalContext;
  similarPatterns: SimilarPattern[];
  recommendedActions: PatternAction[];
}

interface PatternClassification {
  type: 'known' | 'emerging' | 'anomaly' | 'critical';
  category: ErrorCategory;
  severity: 'low' | 'medium' | 'high' | 'critical';
  automationEligible: boolean;
  requiresHumanReview: boolean;
}

interface TrendDirection {
  direction: 'increasing' | 'decreasing' | 'stable' | 'spike';
  change: number; // Percentage change
  timeframe: string;
  significance: 'low' | 'medium' | 'high';
}

interface HistoricalContext {
  firstSeen: Date;
  lastSeen: Date;
  totalOccurrences: number;
  averageResolutionTime: number;
  successRate: number;
  userImpact: number;
}

interface SimilarPattern {
  patternId: string;
  similarity: number;
  description: string;
  resolution: string;
}

interface PatternAction {
  type: 'autofix' | 'escalate' | 'learn' | 'monitor' | 'alert';
  priority: number;
  description: string;
  estimatedEffort: number;
  successProbability: number;
}

type ErrorCategory = 
  | 'validation_failure'
  | 'format_error'
  | 'business_rule'
  | 'system_limit'
  | 'data_quality'
  | 'integration_error'
  | 'user_error'
  | 'performance_issue';

// Pattern matching algorithms
interface PatternMatcher {
  name: string;
  weight: number;
  match: (errors: ValidationError[]) => PatternMatchResult;
}

interface PatternMatchResult {
  score: number;
  confidence: number;
  features: string[];
  metadata: Record<string, any>;
}

export class ErrorPatternAnalyzer {
  private static instance: ErrorPatternAnalyzer;
  private patternMatchers: Map<string, PatternMatcher> = new Map();
  private analysisCache: Map<string, ErrorPatternAnalysis> = new Map();
  private realtimePatterns: Map<string, RealtimePattern> = new Map();

  // Performance and analytics tracking
  private analytics = {
    totalAnalyses: 0,
    patternsDetected: 0,
    accuracyRate: 0,
    averageProcessingTime: 0,
    cacheHitRate: 0,
  };

  private constructor() {
    this.initializePatternMatchers();
    this.startRealtimeMonitoring();
  }

  static getInstance(): ErrorPatternAnalyzer {
    if (!ErrorPatternAnalyzer.instance) {
      ErrorPatternAnalyzer.instance = new ErrorPatternAnalyzer();
    }
    return ErrorPatternAnalyzer.instance;
  }

  /**
   * Analyze errors for patterns in real-time
   */
  async analyzeErrorPattern(
    errors: ValidationError[],
    context: {
      sessionId?: string;
      userId?: string;
      fileType?: string;
      recordCount?: number;
      timestamp?: Date;
    }
  ): Promise<ErrorPatternAnalysis> {
    console.log(`[PATTERN ANALYZER] Analyzing ${errors.length} errors for patterns`);
    
    const startTime = Date.now();
    const cacheKey = this.generatePatternCacheKey(errors, context);

    // Check cache first
    if (this.analysisCache.has(cacheKey)) {
      this.analytics.cacheHitRate++;
      console.log("[PATTERN ANALYZER] Using cached pattern analysis");
      return this.analysisCache.get(cacheKey)!;
    }

    try {
      // Step 1: Generate error signature
      const signature = this.generateErrorSignature(errors);
      
      // Step 2: Check against known patterns
      const knownPattern = await this.checkKnownPatterns(signature, errors);
      
      // Step 3: Perform pattern matching
      const matchResults = this.performPatternMatching(errors);
      
      // Step 4: Analyze temporal patterns
      const temporalAnalysis = await this.analyzeTemporalPatterns(signature, context);
      
      // Step 5: Calculate confidence and classification
      const classification = this.classifyPattern(matchResults, temporalAnalysis, knownPattern);
      
      // Step 6: Generate recommendations
      const recommendations = await this.generateRecommendations(classification, matchResults);
      
      // Step 7: Build final analysis
      const analysis: ErrorPatternAnalysis = {
        patternId: knownPattern?.id || uuidv4(),
        signature,
        frequency: temporalAnalysis.frequency,
        confidence: this.calculateOverallConfidence(matchResults, temporalAnalysis),
        classification,
        riskLevel: this.assessRiskLevel(classification, temporalAnalysis),
        trending: temporalAnalysis.trending,
        historicalContext: temporalAnalysis.historical,
        similarPatterns: await this.findSimilarPatterns(signature, matchResults),
        recommendedActions: recommendations,
      };

      // Step 8: Store and cache results
      await this.storePatternAnalysis(analysis, errors, context);
      this.analysisCache.set(cacheKey, analysis);
      
      // Step 9: Update real-time monitoring
      this.updateRealtimeMonitoring(analysis, context);
      
      // Step 10: Update analytics
      this.updateAnalytics(analysis, Date.now() - startTime);
      
      console.log(`[PATTERN ANALYZER] Pattern analysis complete - Type: ${classification.type}, Risk: ${analysis.riskLevel}`);
      return analysis;
      
    } catch (error) {
      console.error("[PATTERN ANALYZER] Analysis failed:", error);
      return this.createErrorAnalysis(error instanceof Error ? error.message : "Unknown error");
    }
  }

  /**
   * Classify errors into known vs unknown categories
   */
  async classifyErrorType(errors: ValidationError[]): Promise<{
    known: ValidationError[];
    unknown: ValidationError[];
    confidence: number;
    newPatterns: string[];
  }> {
    const known: ValidationError[] = [];
    const unknown: ValidationError[] = [];
    const newPatterns: string[] = [];
    let totalConfidence = 0;

    for (const error of errors) {
      const errorSignature = this.generateSingleErrorSignature(error);
      const pattern = await this.findMatchingPattern(errorSignature);
      
      if (pattern && pattern.confidence > 0.7) {
        known.push(error);
        totalConfidence += pattern.confidence;
      } else {
        unknown.push(error);
        
        // Check if this creates a new pattern
        const similarErrors = errors.filter(e => 
          this.calculateErrorSimilarity(error, e) > 0.8
        );
        
        if (similarErrors.length >= 3) { // Pattern threshold
          const newPatternSig = this.generateErrorSignature(similarErrors);
          if (!newPatterns.includes(newPatternSig)) {
            newPatterns.push(newPatternSig);
          }
        }
      }
    }

    const overallConfidence = errors.length > 0 ? totalConfidence / errors.length : 0;

    return {
      known,
      unknown,
      confidence: overallConfidence,
      newPatterns,
    };
  }

  /**
   * Get real-time pattern statistics
   */
  async getRealtimeStats(): Promise<{
    activePatterns: number;
    newPatternsToday: number;
    criticalPatterns: number;
    trendingPatterns: Array<{
      pattern: string;
      frequency: number;
      trend: string;
    }>;
    riskDistribution: Record<RiskLevel, number>;
  }> {
    // Active patterns in last 24 hours
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const [activeCount] = await db
      .select({ count: sql<number>`count(distinct pattern_signature)` })
      .from(errorAnalytics)
      .where(gte(errorAnalytics.timestamp, yesterday));

    // New patterns today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [newTodayCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(errorPatterns)
      .where(gte(errorPatterns.createdAt, today));

    // Critical patterns
    const [criticalCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(errorPatterns)
      .where(
        and(
          eq(errorPatterns.riskLevel, 'critical'),
          gte(errorPatterns.lastSeen, yesterday)
        )
      );

    // Trending patterns
    const trendingPatterns = await db
      .select({
        pattern: errorPatterns.signature,
        frequency: errorPatterns.frequency,
        trend: errorPatterns.trendDirection,
      })
      .from(errorPatterns)
      .where(
        and(
          inArray(errorPatterns.trendDirection, ['increasing', 'spike']),
          gte(errorPatterns.lastSeen, yesterday)
        )
      )
      .orderBy(desc(errorPatterns.frequency))
      .limit(10);

    // Risk distribution
    const riskDistribution = await db
      .select({
        riskLevel: errorPatterns.riskLevel,
        count: sql<number>`count(*)`,
      })
      .from(errorPatterns)
      .where(gte(errorPatterns.lastSeen, yesterday))
      .groupBy(errorPatterns.riskLevel);

    const riskDist = riskDistribution.reduce((acc, item) => {
      acc[item.riskLevel as RiskLevel] = Number(item.count);
      return acc;
    }, {} as Record<RiskLevel, number>);

    return {
      activePatterns: Number(activeCount.count),
      newPatternsToday: Number(newTodayCount.count),
      criticalPatterns: Number(criticalCount.count),
      trendingPatterns: trendingPatterns.map(p => ({
        pattern: p.pattern,
        frequency: p.frequency,
        trend: p.trend || 'stable',
      })),
      riskDistribution: riskDist,
    };
  }

  /**
   * Update pattern learning from feedback
   */
  async updatePatternLearning(
    patternId: string,
    feedback: {
      correct: boolean;
      userAction: string;
      outcome: 'success' | 'failure' | 'partial';
      time: number;
      notes?: string;
    }
  ): Promise<void> {
    console.log(`[PATTERN ANALYZER] Updating pattern learning for: ${patternId}`);

    try {
      // Update pattern confidence based on feedback
      const adjustmentFactor = feedback.correct ? 1.1 : 0.9;
      const timeBonus = feedback.time < 300 ? 1.05 : 1.0; // Bonus for quick resolution

      await db
        .update(errorPatterns)
        .set({
          confidence: sql`confidence * ${adjustmentFactor} * ${timeBonus}`,
          successRate: sql`(success_rate * total_occurrences + ${feedback.outcome === 'success' ? 1 : 0}) / (total_occurrences + 1)`,
          averageResolutionTime: sql`(average_resolution_time * total_occurrences + ${feedback.time}) / (total_occurrences + 1)`,
          totalOccurrences: sql`total_occurrences + 1`,
          lastSeen: new Date(),
          metadata: sql`metadata || ${JSON.stringify({ lastFeedback: feedback })}`,
        })
        .where(eq(errorPatterns.id, patternId));

      // Store learning feedback
      await db.insert(errorAnalytics).values({
        patternId,
        sessionId: 'learning-feedback',
        patternSignature: 'feedback-update',
        errorCount: 1,
        confidence: feedback.correct ? 100 : 0,
        riskLevel: 'low',
        metadata: feedback as any,
        timestamp: new Date(),
      });

      console.log("[PATTERN ANALYZER] Pattern learning updated successfully");
    } catch (error) {
      console.error("[PATTERN ANALYZER] Failed to update pattern learning:", error);
    }
  }

  // Private helper methods

  private initializePatternMatchers(): void {
    // Field-based pattern matcher
    this.patternMatchers.set('field_pattern', {
      name: 'Field Pattern Matcher',
      weight: 0.3,
      match: (errors) => this.matchFieldPatterns(errors),
    });

    // Value-based pattern matcher
    this.patternMatchers.set('value_pattern', {
      name: 'Value Pattern Matcher',
      weight: 0.25,
      match: (errors) => this.matchValuePatterns(errors),
    });

    // Rule-based pattern matcher
    this.patternMatchers.set('rule_pattern', {
      name: 'Rule Pattern Matcher',
      weight: 0.2,
      match: (errors) => this.matchRulePatterns(errors),
    });

    // Frequency-based pattern matcher
    this.patternMatchers.set('frequency_pattern', {
      name: 'Frequency Pattern Matcher',
      weight: 0.15,
      match: (errors) => this.matchFrequencyPatterns(errors),
    });

    // Severity-based pattern matcher
    this.patternMatchers.set('severity_pattern', {
      name: 'Severity Pattern Matcher',
      weight: 0.1,
      match: (errors) => this.matchSeverityPatterns(errors),
    });

    console.log(`[PATTERN ANALYZER] Initialized ${this.patternMatchers.size} pattern matchers`);
  }

  private generateErrorSignature(errors: ValidationError[]): string {
    // Create a unique signature for the error pattern
    const fieldCounts = new Map<string, number>();
    const ruleCounts = new Map<string, number>();

    errors.forEach(error => {
      fieldCounts.set(error.field, (fieldCounts.get(error.field) || 0) + 1);
      ruleCounts.set(error.rule, (ruleCounts.get(error.rule) || 0) + 1);
    });

    const fieldSignature = Array.from(fieldCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([field, count]) => `${field}:${count}`)
      .join(',');

    const ruleSignature = Array.from(ruleCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([rule, count]) => `${rule}:${count}`)
      .join(',');

    return `F[${fieldSignature}]|R[${ruleSignature}]|T${errors.length}`;
  }

  private generateSingleErrorSignature(error: ValidationError): string {
    return `${error.field}:${error.rule}:${error.severity}`;
  }

  private performPatternMatching(errors: ValidationError[]): Map<string, PatternMatchResult> {
    const results = new Map<string, PatternMatchResult>();

    for (const [name, matcher] of this.patternMatchers) {
      try {
        const result = matcher.match(errors);
        results.set(name, result);
      } catch (error) {
        console.error(`[PATTERN ANALYZER] Matcher ${name} failed:`, error);
        results.set(name, {
          score: 0,
          confidence: 0,
          features: [],
          metadata: { error: error instanceof Error ? error.message : "Unknown error" },
        });
      }
    }

    return results;
  }

  // Pattern matching implementations
  private matchFieldPatterns(errors: ValidationError[]): PatternMatchResult {
    const fieldCounts = new Map<string, number>();
    errors.forEach(error => {
      fieldCounts.set(error.field, (fieldCounts.get(error.field) || 0) + 1);
    });

    const uniqueFields = fieldCounts.size;
    const totalErrors = errors.length;
    const concentration = uniqueFields > 0 ? totalErrors / uniqueFields : 0;

    // High concentration suggests a field-specific pattern
    const score = Math.min(concentration / 5, 1); // Normalize to 0-1
    const confidence = uniqueFields > 1 && concentration > 2 ? 0.8 : 0.3;

    return {
      score,
      confidence,
      features: Array.from(fieldCounts.entries()).map(([field, count]) => `${field}(${count})`),
      metadata: { uniqueFields, concentration, fieldCounts: Object.fromEntries(fieldCounts) },
    };
  }

  private matchValuePatterns(errors: ValidationError[]): PatternMatchResult {
    const valueCounts = new Map<any, number>();
    const valueTypes = new Map<string, number>();

    errors.forEach(error => {
      const value = String(error.value);
      valueCounts.set(value, (valueCounts.get(value) || 0) + 1);
      
      const valueType = this.categorizeValue(error.value);
      valueTypes.set(valueType, (valueTypes.get(valueType) || 0) + 1);
    });

    // Look for repeated values or value type patterns
    const maxValueCount = Math.max(...Array.from(valueCounts.values()));
    const dominantValueType = Array.from(valueTypes.entries())
      .sort((a, b) => b[1] - a[1])[0];

    const score = maxValueCount / errors.length;
    const confidence = dominantValueType && dominantValueType[1] > errors.length * 0.6 ? 0.7 : 0.4;

    return {
      score,
      confidence,
      features: [
        `dominant_value_type:${dominantValueType?.[0] || 'mixed'}`,
        `max_value_repetition:${maxValueCount}`,
      ],
      metadata: { valueCounts: Object.fromEntries(valueCounts), valueTypes: Object.fromEntries(valueTypes) },
    };
  }

  private matchRulePatterns(errors: ValidationError[]): PatternMatchResult {
    const ruleCounts = new Map<string, number>();
    errors.forEach(error => {
      ruleCounts.set(error.rule, (ruleCounts.get(error.rule) || 0) + 1);
    });

    const uniqueRules = ruleCounts.size;
    const dominantRule = Array.from(ruleCounts.entries())
      .sort((a, b) => b[1] - a[1])[0];

    const score = dominantRule ? dominantRule[1] / errors.length : 0;
    const confidence = uniqueRules <= 3 && score > 0.5 ? 0.9 : 0.5;

    return {
      score,
      confidence,
      features: Array.from(ruleCounts.entries()).map(([rule, count]) => `${rule}(${count})`),
      metadata: { uniqueRules, dominantRule: dominantRule?.[0], ruleCounts: Object.fromEntries(ruleCounts) },
    };
  }

  private matchFrequencyPatterns(errors: ValidationError[]): PatternMatchResult {
    // Analyze error frequency and distribution
    const recordIndices = errors.map(e => e.recordIndex);
    const uniqueRecords = new Set(recordIndices).size;
    const errorsPerRecord = errors.length / uniqueRecords;

    // Check for clustering
    const sortedIndices = recordIndices.sort((a, b) => a - b);
    let clusters = 0;
    let currentCluster = [sortedIndices[0]];

    for (let i = 1; i < sortedIndices.length; i++) {
      if (sortedIndices[i] - sortedIndices[i-1] <= 5) {
        currentCluster.push(sortedIndices[i]);
      } else {
        if (currentCluster.length >= 3) clusters++;
        currentCluster = [sortedIndices[i]];
      }
    }
    if (currentCluster.length >= 3) clusters++;

    const score = Math.min(errorsPerRecord / 3, 1);
    const confidence = clusters > 0 ? 0.8 : 0.4;

    return {
      score,
      confidence,
      features: [`errors_per_record:${errorsPerRecord.toFixed(2)}`, `clusters:${clusters}`],
      metadata: { uniqueRecords, errorsPerRecord, clusters },
    };
  }

  private matchSeverityPatterns(errors: ValidationError[]): PatternMatchResult {
    const severityCounts = new Map<string, number>();
    errors.forEach(error => {
      severityCounts.set(error.severity, (severityCounts.get(error.severity) || 0) + 1);
    });

    const criticalCount = severityCounts.get('error') || 0;
    const warningCount = severityCounts.get('warning') || 0;

    const criticalRatio = criticalCount / errors.length;
    const score = criticalRatio;
    const confidence = criticalRatio > 0.8 ? 0.9 : 0.6;

    return {
      score,
      confidence,
      features: [`critical_ratio:${criticalRatio.toFixed(2)}`, `critical:${criticalCount}`, `warnings:${warningCount}`],
      metadata: { severityCounts: Object.fromEntries(severityCounts), criticalRatio },
    };
  }

  // Additional helper methods
  private categorizeValue(value: any): string {
    if (value === null || value === undefined) return 'null';
    if (value === '') return 'empty';
    if (typeof value === 'number') return 'number';
    if (typeof value === 'boolean') return 'boolean';
    if (Array.isArray(value)) return 'array';
    if (typeof value === 'object') return 'object';
    
    const str = String(value);
    if (/^\d+$/.test(str)) return 'numeric_string';
    if (/^[a-zA-Z]+$/.test(str)) return 'alphabetic';
    if (/^[a-zA-Z0-9]+$/.test(str)) return 'alphanumeric';
    if (str.includes('@')) return 'email_like';
    if (str.includes('http')) return 'url_like';
    
    return 'mixed_string';
  }

  private calculateErrorSimilarity(error1: ValidationError, error2: ValidationError): number {
    let similarity = 0;
    
    if (error1.field === error2.field) similarity += 0.4;
    if (error1.rule === error2.rule) similarity += 0.3;
    if (error1.severity === error2.severity) similarity += 0.2;
    if (this.categorizeValue(error1.value) === this.categorizeValue(error2.value)) similarity += 0.1;
    
    return similarity;
  }

  // Placeholder implementations for complex methods
  private async checkKnownPatterns(signature: string, errors: ValidationError[]): Promise<any> {
    // Check database for existing patterns
    try {
      const [pattern] = await db
        .select()
        .from(errorPatterns)
        .where(eq(errorPatterns.signature, signature))
        .limit(1);
      
      return pattern || null;
    } catch (error) {
      console.error("[PATTERN ANALYZER] Failed to check known patterns:", error);
      return null;
    }
  }

  private async analyzeTemporalPatterns(signature: string, context: any): Promise<any> {
    // Analyze temporal patterns - placeholder implementation
    return {
      frequency: 1,
      trending: { direction: 'stable' as const, change: 0, timeframe: '24h', significance: 'low' as const },
      historical: {
        firstSeen: new Date(),
        lastSeen: new Date(),
        totalOccurrences: 1,
        averageResolutionTime: 0,
        successRate: 0,
        userImpact: 0,
      },
    };
  }

  private classifyPattern(matchResults: Map<string, PatternMatchResult>, temporalAnalysis: any, knownPattern: any): PatternClassification {
    const overallScore = Array.from(matchResults.values())
      .reduce((sum, result) => sum + result.score, 0) / matchResults.size;

    return {
      type: knownPattern ? 'known' : (overallScore > 0.7 ? 'emerging' : 'anomaly'),
      category: 'validation_failure', // Simplified
      severity: overallScore > 0.8 ? 'high' : (overallScore > 0.5 ? 'medium' : 'low'),
      automationEligible: overallScore > 0.6 && knownPattern,
      requiresHumanReview: overallScore > 0.8 || !knownPattern,
    };
  }

  private calculateOverallConfidence(matchResults: Map<string, PatternMatchResult>, temporalAnalysis: any): number {
    const matchConfidence = Array.from(matchResults.values())
      .reduce((sum, result) => sum + result.confidence, 0) / matchResults.size;
    
    return Math.min(matchConfidence * 100, 100);
  }

  private assessRiskLevel(classification: PatternClassification, temporalAnalysis: any): RiskLevel {
    if (classification.severity === 'critical') return 'critical';
    if (classification.severity === 'high') return 'high';
    if (classification.severity === 'medium') return 'medium';
    return 'low';
  }

  private async generateRecommendations(classification: PatternClassification, matchResults: Map<string, PatternMatchResult>): Promise<PatternAction[]> {
    const actions: PatternAction[] = [];

    if (classification.automationEligible) {
      actions.push({
        type: 'autofix',
        priority: 1,
        description: 'Apply automated resolution based on historical pattern',
        estimatedEffort: 5,
        successProbability: 0.85,
      });
    }

    if (classification.requiresHumanReview) {
      actions.push({
        type: 'escalate',
        priority: 2,
        description: 'Escalate to human reviewer for complex pattern analysis',
        estimatedEffort: 30,
        successProbability: 0.95,
      });
    }

    actions.push({
      type: 'learn',
      priority: 3,
      description: 'Update pattern database with new information',
      estimatedEffort: 2,
      successProbability: 1.0,
    });

    return actions;
  }

  private async findSimilarPatterns(signature: string, matchResults: Map<string, PatternMatchResult>): Promise<SimilarPattern[]> {
    // Find similar patterns - simplified implementation
    return [];
  }

  private async storePatternAnalysis(analysis: ErrorPatternAnalysis, errors: ValidationError[], context: any): Promise<void> {
    try {
      // Store or update the pattern
      await db
        .insert(errorPatterns)
        .values({
          signature: analysis.signature,
          category: analysis.classification.category,
          riskLevel: analysis.riskLevel,
          confidence: analysis.confidence.toString(),
          frequency: analysis.frequency,
          totalOccurrences: 1,
          successRate: '0',
          averageResolutionTime: 0,
          trendDirection: analysis.trending.direction,
          metadata: {
            classification: analysis.classification,
            recommendedActions: analysis.recommendedActions,
          } as any,
        })
        .onConflictDoUpdate({
          target: errorPatterns.signature,
          set: {
            frequency: sql`frequency + 1`,
            totalOccurrences: sql`total_occurrences + 1`,
            lastSeen: new Date(),
            confidence: analysis.confidence.toString(),
          },
        });

      // Store analytics record
      await db.insert(errorAnalytics).values({
        patternId: analysis.patternId,
        sessionId: context.sessionId || 'unknown',
        patternSignature: analysis.signature,
        errorCount: errors.length,
        confidence: analysis.confidence,
        riskLevel: analysis.riskLevel,
        metadata: { context, errors: errors.slice(0, 5) } as any, // Store sample errors
        timestamp: context.timestamp || new Date(),
      });

    } catch (error) {
      console.error("[PATTERN ANALYZER] Failed to store pattern analysis:", error);
    }
  }

  private updateRealtimeMonitoring(analysis: ErrorPatternAnalysis, context: any): void {
    const pattern: RealtimePattern = {
      signature: analysis.signature,
      count: 1,
      lastSeen: new Date(),
      riskLevel: analysis.riskLevel,
      trend: analysis.trending.direction,
    };

    this.realtimePatterns.set(analysis.signature, pattern);

    // Clean up old patterns (keep last 1000)
    if (this.realtimePatterns.size > 1000) {
      const oldestKey = Array.from(this.realtimePatterns.keys())[0];
      this.realtimePatterns.delete(oldestKey);
    }
  }

  private updateAnalytics(analysis: ErrorPatternAnalysis, processingTime: number): void {
    this.analytics.totalAnalyses++;
    if (analysis.classification.type !== 'known') {
      this.analytics.patternsDetected++;
    }
    this.analytics.averageProcessingTime = 
      (this.analytics.averageProcessingTime * (this.analytics.totalAnalyses - 1) + processingTime) / 
      this.analytics.totalAnalyses;
  }

  private createErrorAnalysis(error: string): ErrorPatternAnalysis {
    return {
      patternId: uuidv4(),
      signature: 'error-analysis-failed',
      frequency: 0,
      confidence: 0,
      classification: {
        type: 'anomaly',
        category: 'validation_failure',
        severity: 'medium',
        automationEligible: false,
        requiresHumanReview: true,
      },
      riskLevel: 'medium',
      trending: { direction: 'stable', change: 0, timeframe: '24h', significance: 'low' },
      historicalContext: {
        firstSeen: new Date(),
        lastSeen: new Date(),
        totalOccurrences: 0,
        averageResolutionTime: 0,
        successRate: 0,
        userImpact: 0,
      },
      similarPatterns: [],
      recommendedActions: [{
        type: 'escalate',
        priority: 1,
        description: `Analysis failed: ${error}`,
        estimatedEffort: 60,
        successProbability: 0.5,
      }],
    };
  }

  private generatePatternCacheKey(errors: ValidationError[], context: any): string {
    const errorSig = this.generateErrorSignature(errors);
    const contextSig = `${context.fileType || 'unknown'}-${context.recordCount || 0}`;
    return `${errorSig}-${contextSig}`;
  }

  private async findMatchingPattern(signature: string): Promise<{ confidence: number } | null> {
    try {
      const [pattern] = await db
        .select({ confidence: errorPatterns.confidence })
        .from(errorPatterns)
        .where(eq(errorPatterns.signature, signature))
        .limit(1);
      
      return pattern ? { confidence: Number(pattern.confidence) } : null;
    } catch (error) {
      console.error("[PATTERN ANALYZER] Failed to find matching pattern:", error);
      return null;
    }
  }

  private startRealtimeMonitoring(): void {
    // Clean up old real-time patterns every 5 minutes
    setInterval(() => {
      const fiveMinutesAgo = new Date();
      fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);

      for (const [key, pattern] of this.realtimePatterns) {
        if (pattern.lastSeen < fiveMinutesAgo) {
          this.realtimePatterns.delete(key);
        }
      }
    }, 5 * 60 * 1000);
  }

  /**
   * Get current analytics
   */
  getAnalytics() {
    return { ...this.analytics };
  }

  /**
   * Reset analytics (useful for testing)
   */
  resetAnalytics(): void {
    this.analytics = {
      totalAnalyses: 0,
      patternsDetected: 0,
      accuracyRate: 0,
      averageProcessingTime: 0,
      cacheHitRate: 0,
    };
    this.analysisCache.clear();
    this.realtimePatterns.clear();
  }
}

interface RealtimePattern {
  signature: string;
  count: number;
  lastSeen: Date;
  riskLevel: RiskLevel;
  trend: string;
}

export default ErrorPatternAnalyzer;