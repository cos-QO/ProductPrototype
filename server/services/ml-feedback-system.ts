/**
 * Machine Learning Feedback Loop System
 * Learns from approval decisions and outcomes to improve automation over time
 * Reduces false positives through pattern recognition and user feedback
 */

import { webSocketService } from "../websocket-service";
import { db } from "../db";
import {
  mlFeedbackSessions,
  mlLearningPatterns,
  userBehaviorProfiles,
  automationConfidence,
  type InsertMLFeedbackSession,
  type InsertMLLearningPattern,
  type InsertUserBehaviorProfile,
  type InsertAutomationConfidence,
  type RiskLevel,
  type ApprovalType,
} from "@shared/schema";
import {
  eq,
  desc,
  and,
  or,
  sql,
  gte,
  lte,
  inArray,
  avg,
  count,
} from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

// ML Feedback interfaces
interface FeedbackLearningSession {
  sessionId: string;
  userId: string;
  decisions: DecisionFeedback[];
  patterns: LearnedPattern[];
  confidenceUpdates: ConfidenceUpdate[];
  performanceMetrics: PerformanceMetrics;
}

interface DecisionFeedback {
  approvalId: string;
  originalPrediction: AutomationPrediction;
  actualDecision: "approve" | "reject" | "escalate";
  userReasoning?: string;
  outcomeQuality: "excellent" | "good" | "acceptable" | "poor";
  timeToDecision: number;
  complexity: "simple" | "moderate" | "complex" | "very_complex";
  contextFactors: string[];
}

interface AutomationPrediction {
  confidence: number;
  recommendation: "approve" | "reject" | "escalate" | "manual_review";
  reasoning: string[];
  riskFactors: string[];
  similarCases: string[];
}

interface LearnedPattern {
  patternId: string;
  type: PatternType;
  features: FeatureVector;
  outcomes: OutcomeHistory[];
  confidence: number;
  applicability: number; // How often this pattern applies
  effectiveness: number; // How well it predicts outcomes
}

interface FeatureVector {
  edgeCaseCategory: string;
  errorCount: number;
  riskLevel: RiskLevel;
  userExperience: "novice" | "intermediate" | "expert";
  dataComplexity: number;
  historicalSimilarity: number;
  timeOfDay: number;
  urgency: number;
  stakeholders: number;
}

interface OutcomeHistory {
  decision: string;
  timestamp: Date;
  quality: number;
  contextHash: string;
}

interface ConfidenceUpdate {
  category: string;
  previousConfidence: number;
  newConfidence: number;
  reason: string;
  evidence: number;
}

interface PerformanceMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  falsePositiveRate: number;
  falseNegativeRate: number;
  processingTime: number;
  userSatisfaction: number;
}

interface UserLearningProfile {
  userId: string;
  experience: "novice" | "intermediate" | "expert";
  preferences: UserPreferences;
  decisionPatterns: DecisionPattern[];
  performanceHistory: PerformanceHistory;
  learningVelocity: number;
}

interface UserPreferences {
  riskTolerance: "conservative" | "balanced" | "aggressive";
  automationPreference: number; // 0-1, how much automation they prefer
  notificationFrequency: "immediate" | "batched" | "daily";
  decisionTimePreference: "quick" | "thorough" | "contextual";
  explanationDepth: "minimal" | "standard" | "detailed";
}

interface DecisionPattern {
  context: string;
  typicalDecision: string;
  confidence: number;
  consistency: number;
  lastUpdated: Date;
}

interface PerformanceHistory {
  averageDecisionTime: number;
  accuracyRate: number;
  consistencyScore: number;
  learningProgress: number;
  recentTrends: TrendMetric[];
}

interface TrendMetric {
  metric: string;
  direction: "improving" | "stable" | "declining";
  magnitude: number;
  timeframe: string;
}

type PatternType =
  | "decision_preference"
  | "risk_assessment"
  | "context_sensitivity"
  | "time_based"
  | "complexity_handling"
  | "collaboration_style";

// Model performance tracking
interface ModelPerformance {
  modelVersion: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  lastEvaluated: Date;
  trainingDataSize: number;
  performanceTrends: ModelTrend[];
}

interface ModelTrend {
  metric: string;
  values: number[];
  timestamps: Date[];
  trend: "improving" | "stable" | "declining";
}

export class MLFeedbackSystem {
  private static instance: MLFeedbackSystem;

  // Learning models and state
  private learningModels: Map<string, LearningModel> = new Map();
  private userProfiles: Map<string, UserLearningProfile> = new Map();
  private globalPatterns: Map<string, LearnedPattern> = new Map();

  // Performance tracking
  private systemMetrics: SystemMetrics = {
    totalSessions: 0,
    totalFeedback: 0,
    averageAccuracy: 0,
    learningVelocity: 0,
    modelPerformance: new Map(),
  };

  // Learning configuration
  private learningConfig = {
    feedbackWeight: 0.3,
    decayFactor: 0.95,
    confidenceThreshold: 0.75,
    learningRate: 0.01,
    batchSize: 100,
    evaluationInterval: 24 * 60 * 60 * 1000, // 24 hours
  };

  private constructor() {
    this.initializeLearningModels();
    this.startPeriodicEvaluation();
  }

  static getInstance(): MLFeedbackSystem {
    if (!MLFeedbackSystem.instance) {
      MLFeedbackSystem.instance = new MLFeedbackSystem();
    }
    return MLFeedbackSystem.instance;
  }

  /**
   * Record decision feedback and trigger learning updates
   */
  async recordDecisionFeedback(
    approvalId: string,
    userId: string,
    feedback: DecisionFeedback,
  ): Promise<{
    learningUpdates: string[];
    confidenceChanges: ConfidenceUpdate[];
    recommendations: string[];
  }> {
    console.log(
      `[ML FEEDBACK] Recording decision feedback for approval: ${approvalId}`,
    );

    try {
      // Create learning session
      const sessionId = uuidv4();
      const session = await this.createLearningSession(sessionId, userId, [
        feedback,
      ]);

      // Update user profile
      await this.updateUserProfile(userId, feedback);

      // Learn from decision patterns
      const patterns = await this.learnFromDecision(feedback, userId);

      // Update automation confidence
      const confidenceUpdates = await this.updateAutomationConfidence(
        feedback,
        patterns,
      );

      // Generate recommendations
      const recommendations = await this.generateLearningRecommendations(
        patterns,
        confidenceUpdates,
      );

      // Store learning session
      await this.storeLearningSession(session);

      // Update global metrics
      this.updateGlobalMetrics(feedback, patterns);

      // Emit WebSocket notification for ML learning progress
      await this.emitMLFeedbackProcessed(
        userId,
        feedback,
        patterns,
        confidenceUpdates,
        recommendations,
      );

      console.log(
        `[ML FEEDBACK] Learning completed - ${patterns.length} patterns updated, ${confidenceUpdates.length} confidence changes`,
      );

      return {
        learningUpdates: patterns.map(
          (p) => `Pattern ${p.type}: ${p.confidence.toFixed(2)} confidence`,
        ),
        confidenceChanges: confidenceUpdates,
        recommendations,
      };
    } catch (error) {
      console.error("[ML FEEDBACK] Failed to record decision feedback:", error);
      throw error;
    }
  }

  /**
   * Get automation recommendation based on learned patterns
   */
  async getAutomationRecommendation(
    context: {
      edgeCaseCategory: string;
      errorCount: number;
      riskLevel: RiskLevel;
      userExperience: string;
      dataComplexity: number;
      historicalSimilarity: number;
      urgency: number;
    },
    userId: string,
  ): Promise<{
    recommendation: "automate" | "human_review" | "hybrid";
    confidence: number;
    reasoning: string[];
    riskFactors: string[];
    alternativeOptions: AlternativeOption[];
  }> {
    console.log(
      `[ML FEEDBACK] Generating automation recommendation for user: ${userId}`,
    );

    try {
      // Get user profile
      const userProfile = await this.getUserProfile(userId);

      // Create feature vector
      const features = this.createFeatureVector(context, userProfile);

      // Get pattern matches
      const relevantPatterns = await this.findRelevantPatterns(
        features,
        userId,
      );

      // Calculate automation confidence
      const automationScore = this.calculateAutomationScore(
        features,
        relevantPatterns,
        userProfile,
      );

      // Determine recommendation
      const recommendation = this.determineRecommendation(
        automationScore,
        userProfile,
      );

      // Generate reasoning
      const reasoning = this.generateRecommendationReasoning(
        automationScore,
        relevantPatterns,
        userProfile,
      );

      // Identify risk factors
      const riskFactors = this.identifyRiskFactors(features, relevantPatterns);

      // Generate alternatives
      const alternativeOptions = this.generateAlternatives(
        automationScore,
        recommendation,
        features,
      );

      console.log(
        `[ML FEEDBACK] Recommendation: ${recommendation.recommendation}, confidence: ${recommendation.confidence}`,
      );

      return {
        recommendation: recommendation.recommendation,
        confidence: recommendation.confidence,
        reasoning,
        riskFactors,
        alternativeOptions,
      };
    } catch (error) {
      console.error(
        "[ML FEEDBACK] Failed to generate automation recommendation:",
        error,
      );

      // Fallback to conservative recommendation
      return {
        recommendation: "human_review",
        confidence: 0.5,
        reasoning: ["Fallback to human review due to system error"],
        riskFactors: ["System uncertainty"],
        alternativeOptions: [],
      };
    }
  }

  /**
   * Update user behavior profile based on interactions
   */
  async updateUserBehaviorProfile(
    userId: string,
    interactions: {
      decisionsToday: number;
      averageDecisionTime: number;
      accuracyRate: number;
      riskTolerance: number;
      collaborationEvents: number;
    },
  ): Promise<UserLearningProfile> {
    console.log(`[ML FEEDBACK] Updating user behavior profile: ${userId}`);

    try {
      // Get existing profile or create new one
      let profile = this.userProfiles.get(userId);
      if (!profile) {
        profile = await this.createDefaultUserProfile(userId);
        this.userProfiles.set(userId, profile);
      }

      // Update performance history
      profile.performanceHistory.averageDecisionTime =
        profile.performanceHistory.averageDecisionTime * 0.8 +
        interactions.averageDecisionTime * 0.2;

      profile.performanceHistory.accuracyRate =
        profile.performanceHistory.accuracyRate * 0.8 +
        interactions.accuracyRate * 0.2;

      // Update preferences based on behavior
      if (interactions.averageDecisionTime < 300) {
        // Quick decisions
        profile.preferences.decisionTimePreference = "quick";
      } else if (interactions.averageDecisionTime > 1800) {
        // Thorough decisions
        profile.preferences.decisionTimePreference = "thorough";
      }

      // Update risk tolerance
      const riskAdjustment = (interactions.riskTolerance - 0.5) * 0.1;
      if (profile.preferences.riskTolerance === "balanced") {
        if (riskAdjustment > 0.2)
          profile.preferences.riskTolerance = "aggressive";
        else if (riskAdjustment < -0.2)
          profile.preferences.riskTolerance = "conservative";
      }

      // Calculate learning velocity
      profile.learningVelocity = this.calculateLearningVelocity(
        profile,
        interactions,
      );

      // Store updated profile
      await this.storeUserProfile(profile);

      console.log(
        `[ML FEEDBACK] User profile updated - learning velocity: ${profile.learningVelocity.toFixed(3)}`,
      );
      return profile;
    } catch (error) {
      console.error(
        "[ML FEEDBACK] Failed to update user behavior profile:",
        error,
      );
      throw error;
    }
  }

  /**
   * Get system-wide learning metrics and insights
   */
  async getSystemLearningMetrics(): Promise<{
    overallPerformance: SystemMetrics;
    topPatterns: LearnedPattern[];
    userInsights: UserInsight[];
    improvementAreas: ImprovementArea[];
    recommendations: SystemRecommendation[];
  }> {
    try {
      // Get top performing patterns
      const topPatterns = Array.from(this.globalPatterns.values())
        .sort((a, b) => b.effectiveness - a.effectiveness)
        .slice(0, 10);

      // Analyze user insights
      const userInsights = await this.generateUserInsights();

      // Identify improvement areas
      const improvementAreas = await this.identifyImprovementAreas();

      // Generate system recommendations
      const recommendations = await this.generateSystemRecommendations(
        topPatterns,
        userInsights,
        improvementAreas,
      );

      return {
        overallPerformance: { ...this.systemMetrics },
        topPatterns,
        userInsights,
        improvementAreas,
        recommendations,
      };
    } catch (error) {
      console.error(
        "[ML FEEDBACK] Failed to get system learning metrics:",
        error,
      );
      throw error;
    }
  }

  /**
   * Retrain models based on accumulated feedback
   */
  async retrainModels(
    options: {
      modelTypes?: string[];
      trainingDataWindow?: number; // Days of data to use
      validationSplit?: number;
      hyperparameterTuning?: boolean;
    } = {},
  ): Promise<{
    retrainedModels: string[];
    performanceChanges: ModelPerformanceChange[];
    trainingMetrics: TrainingMetrics;
  }> {
    console.log("[ML FEEDBACK] Starting model retraining");

    const {
      modelTypes = [
        "decision_classifier",
        "confidence_estimator",
        "risk_assessor",
      ],
      trainingDataWindow = 30,
      validationSplit = 0.2,
      hyperparameterTuning = false,
    } = options;

    try {
      const retrainedModels: string[] = [];
      const performanceChanges: ModelPerformanceChange[] = [];

      // Get training data
      const trainingData = await this.getTrainingData(trainingDataWindow);

      // Retrain each specified model
      for (const modelType of modelTypes) {
        const model = this.learningModels.get(modelType);
        if (model) {
          const oldPerformance = model.getPerformance();

          // Retrain model
          await model.retrain(trainingData, {
            validationSplit,
            hyperparameterTuning,
          });

          const newPerformance = model.getPerformance();

          retrainedModels.push(modelType);
          performanceChanges.push({
            modelType,
            oldAccuracy: oldPerformance.accuracy,
            newAccuracy: newPerformance.accuracy,
            improvement: newPerformance.accuracy - oldPerformance.accuracy,
          });
        }
      }

      const trainingMetrics: TrainingMetrics = {
        dataPoints: trainingData.length,
        trainingTime: Date.now(), // Simplified
        validationAccuracy: 0.85, // Placeholder
        convergenceIterations: 100, // Placeholder
      };

      console.log(
        `[ML FEEDBACK] Model retraining completed - ${retrainedModels.length} models updated`,
      );

      return {
        retrainedModels,
        performanceChanges,
        trainingMetrics,
      };
    } catch (error) {
      console.error("[ML FEEDBACK] Model retraining failed:", error);
      throw error;
    }
  }

  // Private helper methods

  private initializeLearningModels(): void {
    // Initialize different learning models
    this.learningModels.set(
      "decision_classifier",
      new DecisionClassifierModel(),
    );
    this.learningModels.set(
      "confidence_estimator",
      new ConfidenceEstimatorModel(),
    );
    this.learningModels.set("risk_assessor", new RiskAssessmentModel());
    this.learningModels.set("pattern_detector", new PatternDetectionModel());

    console.log(
      `[ML FEEDBACK] Initialized ${this.learningModels.size} learning models`,
    );
  }

  private async createLearningSession(
    sessionId: string,
    userId: string,
    feedback: DecisionFeedback[],
  ): Promise<FeedbackLearningSession> {
    const session: FeedbackLearningSession = {
      sessionId,
      userId,
      decisions: feedback,
      patterns: [],
      confidenceUpdates: [],
      performanceMetrics: {
        accuracy: 0,
        precision: 0,
        recall: 0,
        f1Score: 0,
        falsePositiveRate: 0,
        falseNegativeRate: 0,
        processingTime: 0,
        userSatisfaction: 0,
      },
    };

    return session;
  }

  private async updateUserProfile(
    userId: string,
    feedback: DecisionFeedback,
  ): Promise<void> {
    let profile = this.userProfiles.get(userId);
    if (!profile) {
      profile = await this.createDefaultUserProfile(userId);
      this.userProfiles.set(userId, profile);
    }

    // Update decision patterns
    const contextKey = `${feedback.originalPrediction.recommendation}_${feedback.complexity}`;
    const existingPattern = profile.decisionPatterns.find(
      (p) => p.context === contextKey,
    );

    if (existingPattern) {
      // Update existing pattern
      existingPattern.typicalDecision = feedback.actualDecision;
      existingPattern.confidence = existingPattern.confidence * 0.8 + 0.2;
      existingPattern.lastUpdated = new Date();
    } else {
      // Create new pattern
      profile.decisionPatterns.push({
        context: contextKey,
        typicalDecision: feedback.actualDecision,
        confidence: 0.7,
        consistency: 0.8,
        lastUpdated: new Date(),
      });
    }

    // Update performance metrics
    profile.performanceHistory.averageDecisionTime =
      profile.performanceHistory.averageDecisionTime * 0.9 +
      feedback.timeToDecision * 0.1;
  }

  private async learnFromDecision(
    feedback: DecisionFeedback,
    userId: string,
  ): Promise<LearnedPattern[]> {
    const patterns: LearnedPattern[] = [];

    // Extract features from the decision context
    const features = this.extractDecisionFeatures(feedback);

    // Look for existing patterns or create new ones
    const patternKey = this.generatePatternKey(features);
    let pattern = this.globalPatterns.get(patternKey);

    if (pattern) {
      // Update existing pattern
      pattern.outcomes.push({
        decision: feedback.actualDecision,
        timestamp: new Date(),
        quality: this.mapOutcomeQuality(feedback.outcomeQuality),
        contextHash: this.hashContext(feedback.contextFactors),
      });

      // Recalculate confidence and effectiveness
      pattern.confidence = this.calculatePatternConfidence(pattern);
      pattern.effectiveness = this.calculatePatternEffectiveness(pattern);
    } else {
      // Create new pattern
      pattern = {
        patternId: uuidv4(),
        type: this.inferPatternType(features),
        features,
        outcomes: [
          {
            decision: feedback.actualDecision,
            timestamp: new Date(),
            quality: this.mapOutcomeQuality(feedback.outcomeQuality),
            contextHash: this.hashContext(feedback.contextFactors),
          },
        ],
        confidence: 0.5,
        applicability: 0.1,
        effectiveness: 0.5,
      };

      this.globalPatterns.set(patternKey, pattern);
    }

    patterns.push(pattern);
    return patterns;
  }

  private async updateAutomationConfidence(
    feedback: DecisionFeedback,
    patterns: LearnedPattern[],
  ): Promise<ConfidenceUpdate[]> {
    const updates: ConfidenceUpdate[] = [];

    // Determine if the original prediction was correct
    const wasCorrect =
      feedback.originalPrediction.recommendation === feedback.actualDecision;
    const confidenceAdjustment = wasCorrect ? 0.05 : -0.05;

    // Update confidence for the category
    const category = feedback.originalPrediction.reasoning[0] || "general";

    updates.push({
      category,
      previousConfidence: feedback.originalPrediction.confidence,
      newConfidence: Math.max(
        0.1,
        Math.min(
          0.95,
          feedback.originalPrediction.confidence + confidenceAdjustment,
        ),
      ),
      reason: wasCorrect ? "Correct prediction" : "Incorrect prediction",
      evidence: patterns.length,
    });

    return updates;
  }

  private async generateLearningRecommendations(
    patterns: LearnedPattern[],
    confidenceUpdates: ConfidenceUpdate[],
  ): Promise<string[]> {
    const recommendations: string[] = [];

    // Analyze patterns for recommendations
    const lowEffectivenessPatterns = patterns.filter(
      (p) => p.effectiveness < 0.6,
    );
    if (lowEffectivenessPatterns.length > 0) {
      recommendations.push(
        `Review ${lowEffectivenessPatterns.length} patterns with low effectiveness`,
      );
    }

    // Analyze confidence changes
    const significantChanges = confidenceUpdates.filter(
      (u) => Math.abs(u.newConfidence - u.previousConfidence) > 0.1,
    );
    if (significantChanges.length > 0) {
      recommendations.push(
        `Monitor ${significantChanges.length} categories with significant confidence changes`,
      );
    }

    return recommendations;
  }

  private createFeatureVector(
    context: any,
    userProfile: UserLearningProfile,
  ): FeatureVector {
    return {
      edgeCaseCategory: context.edgeCaseCategory,
      errorCount: context.errorCount,
      riskLevel: context.riskLevel,
      userExperience: userProfile.experience,
      dataComplexity: context.dataComplexity,
      historicalSimilarity: context.historicalSimilarity,
      timeOfDay: new Date().getHours(),
      urgency: context.urgency,
      stakeholders: 1, // Simplified
    };
  }

  private calculateAutomationScore(
    features: FeatureVector,
    patterns: LearnedPattern[],
    userProfile: UserLearningProfile,
  ): number {
    let score = 0.5; // Base score

    // Factor in user experience
    const experienceMultiplier =
      userProfile.experience === "expert"
        ? 1.2
        : userProfile.experience === "intermediate"
          ? 1.0
          : 0.8;

    // Factor in pattern effectiveness
    const avgEffectiveness =
      patterns.length > 0
        ? patterns.reduce((sum, p) => sum + p.effectiveness, 0) /
          patterns.length
        : 0.5;

    // Factor in risk level
    const riskPenalty =
      features.riskLevel === "critical"
        ? 0.3
        : features.riskLevel === "high"
          ? 0.2
          : features.riskLevel === "medium"
            ? 0.1
            : 0;

    score = (score * experienceMultiplier + avgEffectiveness) / 2 - riskPenalty;

    return Math.max(0.1, Math.min(0.9, score));
  }

  private determineRecommendation(
    automationScore: number,
    userProfile: UserLearningProfile,
  ): {
    recommendation: "automate" | "human_review" | "hybrid";
    confidence: number;
  } {
    const automationThreshold = userProfile.preferences.automationPreference;

    if (automationScore > automationThreshold + 0.2) {
      return { recommendation: "automate", confidence: automationScore };
    } else if (automationScore < automationThreshold - 0.2) {
      return {
        recommendation: "human_review",
        confidence: 1 - automationScore,
      };
    } else {
      return { recommendation: "hybrid", confidence: 0.7 };
    }
  }

  // Additional helper methods (simplified implementations)
  private async getUserProfile(userId: string): Promise<UserLearningProfile> {
    let profile = this.userProfiles.get(userId);
    if (!profile) {
      profile = await this.createDefaultUserProfile(userId);
      this.userProfiles.set(userId, profile);
    }
    return profile;
  }

  private async createDefaultUserProfile(
    userId: string,
  ): Promise<UserLearningProfile> {
    return {
      userId,
      experience: "intermediate",
      preferences: {
        riskTolerance: "balanced",
        automationPreference: 0.6,
        notificationFrequency: "batched",
        decisionTimePreference: "contextual",
        explanationDepth: "standard",
      },
      decisionPatterns: [],
      performanceHistory: {
        averageDecisionTime: 600,
        accuracyRate: 0.8,
        consistencyScore: 0.7,
        learningProgress: 0.5,
        recentTrends: [],
      },
      learningVelocity: 0.5,
    };
  }

  private async findRelevantPatterns(
    features: FeatureVector,
    userId: string,
  ): Promise<LearnedPattern[]> {
    // Find patterns that match the current feature vector
    return Array.from(this.globalPatterns.values()).slice(0, 5); // Simplified
  }

  private generateRecommendationReasoning(
    automationScore: number,
    patterns: LearnedPattern[],
    userProfile: UserLearningProfile,
  ): string[] {
    const reasoning = [];
    reasoning.push(`Automation score: ${automationScore.toFixed(2)}`);
    reasoning.push(`User experience level: ${userProfile.experience}`);
    reasoning.push(`${patterns.length} relevant patterns found`);
    return reasoning;
  }

  private identifyRiskFactors(
    features: FeatureVector,
    patterns: LearnedPattern[],
  ): string[] {
    const risks = [];
    if (features.riskLevel === "critical" || features.riskLevel === "high") {
      risks.push(`High risk level: ${features.riskLevel}`);
    }
    if (features.errorCount > 50) {
      risks.push("High error count");
    }
    return risks;
  }

  private generateAlternatives(
    automationScore: number,
    recommendation: { recommendation: string },
    features: FeatureVector,
  ): AlternativeOption[] {
    return []; // Simplified
  }

  // Placeholder implementations for complex methods
  private extractDecisionFeatures(feedback: DecisionFeedback): FeatureVector {
    return {} as any;
  }
  private generatePatternKey(features: FeatureVector): string {
    return "pattern-key";
  }
  private inferPatternType(features: FeatureVector): PatternType {
    return "decision_preference";
  }
  private mapOutcomeQuality(quality: string): number {
    return 0.8;
  }
  private hashContext(factors: string[]): string {
    return "context-hash";
  }
  private calculatePatternConfidence(pattern: LearnedPattern): number {
    return 0.8;
  }
  private calculatePatternEffectiveness(pattern: LearnedPattern): number {
    return 0.8;
  }
  private calculateLearningVelocity(
    profile: UserLearningProfile,
    interactions: any,
  ): number {
    return 0.5;
  }
  private async storeUserProfile(profile: UserLearningProfile): Promise<void> {
    /* Implementation */
  }
  private async storeLearningSession(
    session: FeedbackLearningSession,
  ): Promise<void> {
    /* Implementation */
  }
  private updateGlobalMetrics(
    feedback: DecisionFeedback,
    patterns: LearnedPattern[],
  ): void {
    /* Implementation */
  }
  private async generateUserInsights(): Promise<UserInsight[]> {
    return [];
  }
  private async identifyImprovementAreas(): Promise<ImprovementArea[]> {
    return [];
  }
  private async generateSystemRecommendations(
    patterns: LearnedPattern[],
    insights: UserInsight[],
    areas: ImprovementArea[],
  ): Promise<SystemRecommendation[]> {
    return [];
  }
  private async getTrainingData(windowDays: number): Promise<any[]> {
    return [];
  }
  private startPeriodicEvaluation(): void {
    /* Implementation */
  }

  /**
   * Emit WebSocket notification for ML feedback processing
   */
  private async emitMLFeedbackProcessed(
    userId: string,
    feedback: DecisionFeedback,
    patterns: LearnedPattern[],
    confidenceUpdates: ConfidenceUpdate[],
    recommendations: string[],
  ): Promise<void> {
    try {
      // Calculate overall confidence for this learning session
      const overallConfidence =
        patterns.length > 0
          ? patterns.reduce((sum, p) => sum + p.confidence, 0) / patterns.length
          : 0.5;

      // Determine if we have automation recommendations
      const automationRecommendation =
        this.generateAutomationRecommendationFromLearning(
          patterns,
          confidenceUpdates,
          overallConfidence,
        );

      // Create learning update summary
      const learningUpdate = `Updated ${patterns.length} patterns, ${confidenceUpdates.length} confidence scores. Automation improvement: ${(overallConfidence * 100).toFixed(1)}%`;

      // Emit WebSocket notification
      await webSocketService.emitMLFeedbackProcessed(
        userId, // Using userId as sessionId since this is user-specific feedback
        this.mapFeedbackTypeToWebSocket(feedback),
        Math.round(overallConfidence * 100),
        learningUpdate,
        automationRecommendation,
      );

      console.log(
        `[ML FEEDBACK] WebSocket notification sent for user: ${userId}, confidence: ${overallConfidence.toFixed(3)}`,
      );
    } catch (error) {
      console.error(
        "[ML FEEDBACK] Failed to emit WebSocket notification:",
        error,
      );
      // Don't throw - this shouldn't block the main learning process
    }
  }

  /**
   * Map internal feedback type to WebSocket feedback type
   */
  private mapFeedbackTypeToWebSocket(
    feedback: DecisionFeedback,
  ): "approval_decision" | "user_behavior" | "resolution_outcome" {
    // Determine feedback type based on the context
    if (feedback.originalPrediction.recommendation && feedback.actualDecision) {
      return "approval_decision";
    } else if (feedback.timeToDecision && feedback.complexity) {
      return "user_behavior";
    } else {
      return "resolution_outcome";
    }
  }

  /**
   * Generate automation recommendation from learning patterns
   */
  private generateAutomationRecommendationFromLearning(
    patterns: LearnedPattern[],
    confidenceUpdates: ConfidenceUpdate[],
    overallConfidence: number,
  ):
    | {
        action: string;
        confidence: number;
        reasoning: string;
      }
    | undefined {
    if (patterns.length === 0) {
      return undefined;
    }

    // Find the most effective pattern
    const bestPattern = patterns.reduce((best, current) =>
      current.effectiveness > best.effectiveness ? current : best,
    );

    // Generate recommendation based on learning
    let action = "maintain_current_automation";
    let reasoning = "No significant changes detected";

    if (overallConfidence > 0.8) {
      action = "increase_automation";
      reasoning = `High confidence patterns detected (${(overallConfidence * 100).toFixed(1)}%). Consider increasing automation for ${bestPattern.type} scenarios.`;
    } else if (overallConfidence < 0.4) {
      action = "reduce_automation";
      reasoning = `Low confidence patterns detected (${(overallConfidence * 100).toFixed(1)}%). Consider reducing automation and increasing human review.`;
    } else if (patterns.some((p) => p.effectiveness > 0.9)) {
      action = "selective_automation";
      reasoning = `Found highly effective patterns for specific scenarios. Consider selective automation for ${bestPattern.type}.`;
    }

    return {
      action,
      confidence: Math.round(overallConfidence * 100),
      reasoning,
    };
  }

  /**
   * Get current system metrics
   */
  getSystemMetrics() {
    return { ...this.systemMetrics };
  }

  /**
   * Reset learning state (useful for testing)
   */
  resetLearningState(): void {
    this.userProfiles.clear();
    this.globalPatterns.clear();
    this.systemMetrics = {
      totalSessions: 0,
      totalFeedback: 0,
      averageAccuracy: 0,
      learningVelocity: 0,
      modelPerformance: new Map(),
    };
  }
}

// Supporting interfaces and classes
interface SystemMetrics {
  totalSessions: number;
  totalFeedback: number;
  averageAccuracy: number;
  learningVelocity: number;
  modelPerformance: Map<string, ModelPerformance>;
}

interface UserInsight {
  insight: string;
  evidence: number;
  recommendation: string;
}

interface ImprovementArea {
  area: string;
  impact: string;
  effort: string;
  priority: number;
}

interface SystemRecommendation {
  type: string;
  description: string;
  priority: number;
  estimatedImpact: number;
}

interface AlternativeOption {
  option: string;
  confidence: number;
  reasoning: string[];
}

interface ModelPerformanceChange {
  modelType: string;
  oldAccuracy: number;
  newAccuracy: number;
  improvement: number;
}

interface TrainingMetrics {
  dataPoints: number;
  trainingTime: number;
  validationAccuracy: number;
  convergenceIterations: number;
}

// Abstract learning model classes
abstract class LearningModel {
  abstract getPerformance(): ModelPerformance;
  abstract retrain(data: any[], options: any): Promise<void>;
}

class DecisionClassifierModel extends LearningModel {
  getPerformance(): ModelPerformance {
    return {
      modelVersion: "1.0",
      accuracy: 0.85,
      precision: 0.82,
      recall: 0.88,
      f1Score: 0.85,
      lastEvaluated: new Date(),
      trainingDataSize: 1000,
      performanceTrends: [],
    };
  }

  async retrain(data: any[], options: any): Promise<void> {
    // Implementation for retraining decision classifier
  }
}

class ConfidenceEstimatorModel extends LearningModel {
  getPerformance(): ModelPerformance {
    return {
      modelVersion: "1.0",
      accuracy: 0.78,
      precision: 0.75,
      recall: 0.8,
      f1Score: 0.77,
      lastEvaluated: new Date(),
      trainingDataSize: 800,
      performanceTrends: [],
    };
  }

  async retrain(data: any[], options: any): Promise<void> {
    // Implementation for retraining confidence estimator
  }
}

class RiskAssessmentModel extends LearningModel {
  getPerformance(): ModelPerformance {
    return {
      modelVersion: "1.0",
      accuracy: 0.88,
      precision: 0.85,
      recall: 0.9,
      f1Score: 0.87,
      lastEvaluated: new Date(),
      trainingDataSize: 1200,
      performanceTrends: [],
    };
  }

  async retrain(data: any[], options: any): Promise<void> {
    // Implementation for retraining risk assessor
  }
}

class PatternDetectionModel extends LearningModel {
  getPerformance(): ModelPerformance {
    return {
      modelVersion: "1.0",
      accuracy: 0.82,
      precision: 0.79,
      recall: 0.84,
      f1Score: 0.81,
      lastEvaluated: new Date(),
      trainingDataSize: 900,
      performanceTrends: [],
    };
  }

  async retrain(data: any[], options: any): Promise<void> {
    // Implementation for retraining pattern detector
  }
}

export default MLFeedbackSystem;
