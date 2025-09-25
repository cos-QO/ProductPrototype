/**
 * Report Generation System
 * Automated generation of analytics reports for different stakeholders
 */

import { promises as fs } from 'fs';
import path from 'path';
import { format } from 'date-fns';
import AutomationAnalyticsService from './automation-analytics';
import { WebSocketService } from './websocket-service';

export interface ReportConfig {
  type: 'executive' | 'technical' | 'operational' | 'cost';
  frequency: 'daily' | 'weekly' | 'monthly';
  recipients: string[];
  format: 'html' | 'pdf' | 'json';
  includeCharts: boolean;
  customSections?: string[];
}

export interface ReportSchedule {
  id: string;
  name: string;
  config: ReportConfig;
  nextRun: Date;
  lastRun?: Date;
  enabled: boolean;
  createdBy: string;
}

export interface GeneratedReport {
  id: string;
  type: ReportConfig['type'];
  generatedAt: Date;
  timeRange: string;
  filePath: string;
  size: number;
  recipients: string[];
  status: 'generating' | 'completed' | 'failed' | 'sent';
}

export class ReportGenerator {
  private analyticsService: AutomationAnalyticsService;
  private wsService: WebSocketService;
  private reportSchedules: Map<string, ReportSchedule> = new Map();
  private reportsDirectory: string;
  private schedulerInterval: NodeJS.Timeout | null = null;

  constructor(analyticsService: AutomationAnalyticsService, wsService: WebSocketService) {
    this.analyticsService = analyticsService;
    this.wsService = wsService;
    this.reportsDirectory = path.join(process.cwd(), 'generated-reports');
    this.initializeReportsDirectory();
    this.startScheduler();
  }

  /**
   * Initialize the reports directory
   */
  private async initializeReportsDirectory() {
    try {
      await fs.mkdir(this.reportsDirectory, { recursive: true });
    } catch (error) {
      console.error('Failed to create reports directory:', error);
    }
  }

  /**
   * Generate a report
   */
  async generateReport(
    type: ReportConfig['type'],
    timeRange: '7d' | '30d' | '90d' = '30d',
    format: 'html' | 'json' = 'html',
    customOptions?: Partial<ReportConfig>
  ): Promise<GeneratedReport> {
    const reportId = `${type}-${Date.now()}`;
    const timestamp = new Date();

    const report: GeneratedReport = {
      id: reportId,
      type,
      generatedAt: timestamp,
      timeRange,
      filePath: '',
      size: 0,
      recipients: customOptions?.recipients || [],
      status: 'generating'
    };

    try {
      // Broadcast generation start
      this.wsService.broadcast('report-generation-started', {
        reportId,
        type,
        timestamp: timestamp.toISOString()
      });

      // Generate report content
      const reportContent = await this.generateReportContent(type, timeRange);
      
      // Format and save report
      const formattedContent = format === 'html' 
        ? await this.formatAsHTML(reportContent, type)
        : JSON.stringify(reportContent, null, 2);

      const fileName = `${type}-report-${format(timestamp, 'yyyy-MM-dd-HH-mm')}.${format}`;
      const filePath = path.join(this.reportsDirectory, fileName);

      await fs.writeFile(filePath, formattedContent, 'utf8');
      
      const stats = await fs.stat(filePath);
      
      report.filePath = filePath;
      report.size = stats.size;
      report.status = 'completed';

      // Broadcast completion
      this.wsService.broadcast('report-generation-completed', {
        reportId,
        filePath: fileName,
        size: stats.size,
        timestamp: new Date().toISOString()
      });

      return report;
    } catch (error) {
      report.status = 'failed';
      this.wsService.broadcast('report-generation-failed', {
        reportId,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }

  /**
   * Generate report content based on type
   */
  private async generateReportContent(type: ReportConfig['type'], timeRange: '7d' | '30d' | '90d') {
    const [metrics, businessImpact, trends, costBreakdown, recommendations] = await Promise.all([
      this.analyticsService.getAutomationMetrics(timeRange === '7d' ? '7d' : '30d'),
      this.analyticsService.getBusinessImpact(timeRange),
      this.analyticsService.getTrendData(timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90),
      this.analyticsService.getCostBreakdown(timeRange),
      this.analyticsService.getOptimizationRecommendations()
    ]);

    const baseContent = {
      reportType: type,
      generatedAt: new Date().toISOString(),
      timeRange,
      summary: {
        automationRate: metrics.automationRate.current,
        costSavings: businessImpact.costSavings,
        timeSaved: metrics.timeSavings.savedHours,
        qualityScore: metrics.errorReduction.qualityScore,
        systemHealth: metrics.systemHealth.status
      },
      metrics,
      businessImpact,
      trends,
      costBreakdown,
      recommendations
    };

    switch (type) {
      case 'executive':
        return this.generateExecutiveReport(baseContent);
      case 'technical':
        return this.generateTechnicalReport(baseContent);
      case 'operational':
        return this.generateOperationalReport(baseContent);
      case 'cost':
        return this.generateCostReport(baseContent);
      default:
        return baseContent;
    }
  }

  /**
   * Generate executive summary report
   */
  private async generateExecutiveReport(baseContent: any) {
    const executiveSummary = await this.analyticsService.generateExecutiveSummary('30d');
    
    return {
      ...baseContent,
      executiveSummary: {
        title: 'Automation Analytics Executive Summary',
        keyAchievements: executiveSummary.keyAchievements,
        businessValue: {
          costSavings: `$${baseContent.businessImpact.costSavings.toLocaleString()}`,
          timeToMarket: `${baseContent.businessImpact.timeToMarket}% improvement`,
          qualityImprovement: `${baseContent.businessImpact.qualityImprovement}% increase`,
          roi: `${baseContent.metrics.costEfficiency.roi.toFixed(0)}% return on investment`
        },
        strategicRecommendations: baseContent.recommendations.automationOpportunities.slice(0, 3),
        nextSteps: executiveSummary.nextSteps
      },
      charts: {
        automationProgress: this.generateChartData('automationProgress', baseContent.trends),
        costSavings: this.generateChartData('costSavings', baseContent.trends),
        businessImpact: this.generateChartData('businessImpact', baseContent.trends)
      }
    };
  }

  /**
   * Generate technical deep-dive report
   */
  private generateTechnicalReport(baseContent: any) {
    return {
      ...baseContent,
      technicalDetails: {
        title: 'Technical Performance Analysis',
        systemPerformance: {
          uptime: `${baseContent.metrics.systemHealth.uptime}%`,
          performance: `${baseContent.metrics.systemHealth.performance}%`,
          resourceUsage: `${baseContent.metrics.systemHealth.resourceUsage}%`,
          bottlenecks: baseContent.metrics.userSatisfaction.bottlenecks
        },
        automationEffectiveness: {
          automationAccuracy: `${baseContent.metrics.errorReduction.automationAccuracy}%`,
          errorReduction: `${baseContent.metrics.errorReduction.errorReduction}%`,
          processingSpeed: `${baseContent.metrics.timeSavings.productivity}% faster`
        },
        optimizationRecommendations: {
          performance: baseContent.recommendations.performanceOptimization,
          cost: baseContent.recommendations.costOptimization
        },
        trendAnalysis: {
          performanceTrend: this.analyzeTrend(baseContent.trends, 'performance'),
          errorTrend: this.analyzeTrend(baseContent.trends, 'errors'),
          automationTrend: this.analyzeTrend(baseContent.trends, 'automationRate')
        }
      }
    };
  }

  /**
   * Generate operational dashboard report
   */
  private generateOperationalReport(baseContent: any) {
    return {
      ...baseContent,
      operationalMetrics: {
        title: 'Operational Dashboard Report',
        currentStatus: {
          automationRate: `${baseContent.metrics.automationRate.current}%`,
          trend: baseContent.metrics.automationRate.trend,
          weekOverWeek: `${baseContent.metrics.automationRate.weekOverWeek}%`
        },
        productivity: {
          timeSaved: `${baseContent.metrics.timeSavings.savedHours} hours`,
          efficiency: `${baseContent.metrics.timeSavings.productivity}%`,
          processingCapacity: 'Scaled to handle increased volume'
        },
        qualityMetrics: {
          qualityScore: `${baseContent.metrics.errorReduction.qualityScore}%`,
          userSatisfaction: `${baseContent.metrics.userSatisfaction.feedbackScore}%`,
          approvalTime: `${baseContent.metrics.userSatisfaction.approvalTime} minutes`
        },
        alerts: this.generateSystemAlerts(baseContent.metrics),
        recommendations: baseContent.recommendations.automationOpportunities.slice(0, 5)
      }
    };
  }

  /**
   * Generate cost analysis report
   */
  private generateCostReport(baseContent: any) {
    return {
      ...baseContent,
      costAnalysis: {
        title: 'Cost Analysis and Optimization Report',
        totalCosts: Object.values(baseContent.costBreakdown).reduce((sum: number, cost: any) => sum + cost, 0),
        costBreakdown: baseContent.costBreakdown,
        savings: {
          totalSavings: baseContent.businessImpact.costSavings,
          roi: `${baseContent.metrics.costEfficiency.roi}%`,
          paybackPeriod: this.calculatePaybackPeriod(baseContent.costBreakdown, baseContent.businessImpact.costSavings)
        },
        optimization: {
          immediate: baseContent.recommendations.costOptimization.filter((r: any) => r.effort === 'low'),
          shortTerm: baseContent.recommendations.costOptimization.filter((r: any) => r.effort === 'medium'),
          longTerm: baseContent.recommendations.costOptimization.filter((r: any) => r.effort === 'high')
        },
        trends: {
          costTrend: this.analyzeTrend(baseContent.trends, 'costs'),
          savingsTrend: baseContent.trends.map((t: any) => ({
            date: t.date,
            savings: Math.max(0, 100 - t.costs)
          }))
        }
      }
    };
  }

  /**
   * Format report as HTML
   */
  private async formatAsHTML(content: any, type: ReportConfig['type']): Promise<string> {
    const title = {
      executive: 'Executive Summary Report',
      technical: 'Technical Performance Report',
      operational: 'Operational Dashboard Report',
      cost: 'Cost Analysis Report'
    }[type];

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} - ${format(new Date(), 'MMM dd, yyyy')}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background: #f9fafb;
        }
        .header {
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            margin-bottom: 20px;
        }
        .card {
            background: white;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .metric {
            display: inline-block;
            background: #f3f4f6;
            padding: 15px 20px;
            margin: 10px;
            border-radius: 6px;
            min-width: 150px;
            text-align: center;
        }
        .metric-value {
            font-size: 2em;
            font-weight: bold;
            color: #3b82f6;
        }
        .metric-label {
            font-size: 0.9em;
            color: #6b7280;
            margin-top: 5px;
        }
        .success { color: #10b981; }
        .warning { color: #f59e0b; }
        .danger { color: #ef4444; }
        .chart-placeholder {
            height: 200px;
            background: #f3f4f6;
            border-radius: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #6b7280;
            margin: 20px 0;
        }
        .recommendation {
            background: #eff6ff;
            border-left: 4px solid #3b82f6;
            padding: 15px;
            margin: 10px 0;
        }
        .footer {
            text-align: center;
            color: #6b7280;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>${title}</h1>
        <p>Generated on ${format(new Date(), 'MMMM dd, yyyy \'at\' HH:mm')}</p>
        <p>Reporting Period: ${content.timeRange} | System: QueenOne ProductPrototype</p>
    </div>

    <div class="card">
        <h2>Key Metrics</h2>
        <div class="metric">
            <div class="metric-value ${content.metrics.automationRate.current >= 60 ? 'success' : 'warning'}">
                ${content.metrics.automationRate.current.toFixed(1)}%
            </div>
            <div class="metric-label">Automation Rate</div>
        </div>
        <div class="metric">
            <div class="metric-value success">
                $${content.businessImpact.costSavings.toLocaleString()}
            </div>
            <div class="metric-label">Cost Savings</div>
        </div>
        <div class="metric">
            <div class="metric-value success">
                ${content.metrics.timeSavings.savedHours.toFixed(1)}h
            </div>
            <div class="metric-label">Time Saved</div>
        </div>
        <div class="metric">
            <div class="metric-value ${content.metrics.errorReduction.qualityScore >= 90 ? 'success' : 'warning'}">
                ${content.metrics.errorReduction.qualityScore.toFixed(0)}%
            </div>
            <div class="metric-label">Quality Score</div>
        </div>
    </div>

    ${type === 'executive' ? this.generateExecutiveHTML(content) : ''}
    ${type === 'technical' ? this.generateTechnicalHTML(content) : ''}
    ${type === 'operational' ? this.generateOperationalHTML(content) : ''}
    ${type === 'cost' ? this.generateCostHTML(content) : ''}

    <div class="card">
        <h2>Recommendations</h2>
        ${content.recommendations.automationOpportunities.slice(0, 3).map((rec: any) => `
            <div class="recommendation">
                <h4>${rec.area}</h4>
                <p>Potential automation: ${rec.potentialAutomation}% | Complexity: ${rec.complexity} | Priority: ${rec.priority}</p>
            </div>
        `).join('')}
    </div>

    <div class="footer">
        <p>Generated by QueenOne Automation Analytics System</p>
        <p>This report contains confidential information. Distribution should be limited to authorized personnel.</p>
    </div>
</body>
</html>`;

    return html;
  }

  /**
   * Generate HTML for executive report
   */
  private generateExecutiveHTML(content: any): string {
    if (!content.executiveSummary) return '';

    return `
    <div class="card">
        <h2>Executive Summary</h2>
        <h3>Key Achievements</h3>
        <ul>
            ${content.executiveSummary.keyAchievements.map((achievement: string) => `<li>${achievement}</li>`).join('')}
        </ul>
        
        <h3>Business Value</h3>
        <div class="metric">
            <div class="metric-value success">${content.executiveSummary.businessValue.costSavings}</div>
            <div class="metric-label">Total Cost Savings</div>
        </div>
        <div class="metric">
            <div class="metric-value success">${content.executiveSummary.businessValue.roi}</div>
            <div class="metric-label">Return on Investment</div>
        </div>
        <div class="metric">
            <div class="metric-value">${content.executiveSummary.businessValue.timeToMarket}</div>
            <div class="metric-label">Time to Market</div>
        </div>
        
        <h3>Next Steps</h3>
        <ul>
            ${content.executiveSummary.nextSteps.map((step: string) => `<li>${step}</li>`).join('')}
        </ul>
    </div>`;
  }

  /**
   * Generate HTML for technical report
   */
  private generateTechnicalHTML(content: any): string {
    if (!content.technicalDetails) return '';

    return `
    <div class="card">
        <h2>Technical Performance</h2>
        <h3>System Performance</h3>
        <div class="metric">
            <div class="metric-value">${content.technicalDetails.systemPerformance.uptime}</div>
            <div class="metric-label">System Uptime</div>
        </div>
        <div class="metric">
            <div class="metric-value">${content.technicalDetails.systemPerformance.performance}</div>
            <div class="metric-label">Performance Score</div>
        </div>
        <div class="metric">
            <div class="metric-value">${content.technicalDetails.systemPerformance.resourceUsage}</div>
            <div class="metric-label">Resource Usage</div>
        </div>
        
        <h3>Automation Effectiveness</h3>
        <ul>
            <li>Accuracy: ${content.technicalDetails.automationEffectiveness.automationAccuracy}</li>
            <li>Error Reduction: ${content.technicalDetails.automationEffectiveness.errorReduction}</li>
            <li>Processing Speed: ${content.technicalDetails.automationEffectiveness.processingSpeed}</li>
        </ul>
    </div>`;
  }

  /**
   * Generate HTML for operational report
   */
  private generateOperationalHTML(content: any): string {
    if (!content.operationalMetrics) return '';

    return `
    <div class="card">
        <h2>Operational Status</h2>
        <h3>Current Performance</h3>
        <div class="metric">
            <div class="metric-value">${content.operationalMetrics.currentStatus.automationRate}</div>
            <div class="metric-label">Automation Rate (${content.operationalMetrics.currentStatus.trend})</div>
        </div>
        <div class="metric">
            <div class="metric-value">${content.operationalMetrics.productivity.timeSaved}</div>
            <div class="metric-label">Time Saved</div>
        </div>
        <div class="metric">
            <div class="metric-value">${content.operationalMetrics.qualityMetrics.qualityScore}</div>
            <div class="metric-label">Quality Score</div>
        </div>
    </div>`;
  }

  /**
   * Generate HTML for cost report
   */
  private generateCostHTML(content: any): string {
    if (!content.costAnalysis) return '';

    return `
    <div class="card">
        <h2>Cost Analysis</h2>
        <h3>Cost Breakdown</h3>
        <div class="metric">
            <div class="metric-value">$${content.costAnalysis.totalCosts.toLocaleString()}</div>
            <div class="metric-label">Total Costs</div>
        </div>
        <div class="metric">
            <div class="metric-value success">$${content.costAnalysis.savings.totalSavings.toLocaleString()}</div>
            <div class="metric-label">Total Savings</div>
        </div>
        <div class="metric">
            <div class="metric-value">${content.costAnalysis.savings.roi}</div>
            <div class="metric-label">ROI</div>
        </div>
    </div>`;
  }

  // Helper methods
  private generateChartData(type: string, trends: any[]) {
    return trends.map(t => ({
      date: t.date,
      value: type === 'automationProgress' ? t.automationRate :
             type === 'costSavings' ? Math.max(0, 100 - t.costs) :
             type === 'businessImpact' ? t.userSatisfaction : t.performance
    }));
  }

  private analyzeTrend(trends: any[], field: string) {
    if (trends.length < 2) return 'stable';
    const first = trends[0][field];
    const last = trends[trends.length - 1][field];
    const change = ((last - first) / first) * 100;
    return change > 5 ? 'improving' : change < -5 ? 'declining' : 'stable';
  }

  private generateSystemAlerts(metrics: any) {
    const alerts = [];
    if (metrics.systemHealth.status === 'critical') {
      alerts.push('Critical system issue detected');
    }
    if (metrics.userSatisfaction.bottlenecks.length > 0) {
      alerts.push(`${metrics.userSatisfaction.bottlenecks.length} bottlenecks identified`);
    }
    return alerts;
  }

  private calculatePaybackPeriod(costBreakdown: any, savings: number): string {
    const totalInvestment = costBreakdown.llmApiCosts + costBreakdown.computeResources + costBreakdown.infrastructure;
    const monthsToPayback = totalInvestment / (savings / 12);
    return `${Math.ceil(monthsToPayback)} months`;
  }

  /**
   * Schedule a report
   */
  scheduleReport(schedule: Omit<ReportSchedule, 'id'>): string {
    const id = `schedule-${Date.now()}`;
    const fullSchedule: ReportSchedule = { id, ...schedule };
    this.reportSchedules.set(id, fullSchedule);
    return id;
  }

  /**
   * Start the report scheduler
   */
  private startScheduler() {
    if (this.schedulerInterval) return;

    this.schedulerInterval = setInterval(async () => {
      const now = new Date();
      
      for (const [id, schedule] of this.reportSchedules) {
        if (schedule.enabled && schedule.nextRun <= now) {
          try {
            await this.generateReport(
              schedule.config.type,
              schedule.config.frequency === 'daily' ? '7d' : '30d',
              schedule.config.format,
              schedule.config
            );
            
            // Update next run time
            const nextRun = new Date(now);
            switch (schedule.config.frequency) {
              case 'daily':
                nextRun.setDate(nextRun.getDate() + 1);
                break;
              case 'weekly':
                nextRun.setDate(nextRun.getDate() + 7);
                break;
              case 'monthly':
                nextRun.setMonth(nextRun.getMonth() + 1);
                break;
            }
            
            schedule.nextRun = nextRun;
            schedule.lastRun = now;
          } catch (error) {
            console.error(`Failed to generate scheduled report ${id}:`, error);
          }
        }
      }
    }, 60000); // Check every minute
  }

  /**
   * Stop the scheduler
   */
  stopScheduler() {
    if (this.schedulerInterval) {
      clearInterval(this.schedulerInterval);
      this.schedulerInterval = null;
    }
  }

  /**
   * Get all scheduled reports
   */
  getSchedules(): ReportSchedule[] {
    return Array.from(this.reportSchedules.values());
  }

  /**
   * Remove a scheduled report
   */
  removeSchedule(id: string): boolean {
    return this.reportSchedules.delete(id);
  }
}

export default ReportGenerator;