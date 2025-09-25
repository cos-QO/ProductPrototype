import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  CheckCircle,
  AlertTriangle,
  AlertOctagon,
  Zap,
  Info,
  TrendingUp,
  TrendingDown,
  Minus,
  Eye,
  BarChart3,
  Clock,
  Target,
} from 'lucide-react';

import type { RiskIndicatorProps, RiskLevel, RiskIndicatorConfig } from '@/types/approval-types';

const riskConfigs: Record<RiskLevel, RiskIndicatorConfig> = {
  low: {
    color: 'bg-green-100 text-green-800 border-green-300 hover:bg-green-200',
    icon: 'CheckCircle',
    label: 'Low Risk',
    description: 'Routine operation with minimal impact',
    gradient: 'from-green-50 to-green-100',
  },
  medium: {
    color: 'bg-yellow-100 text-yellow-800 border-yellow-300 hover:bg-yellow-200',
    icon: 'AlertTriangle',
    label: 'Medium Risk',
    description: 'Moderate impact requiring careful review',
    gradient: 'from-yellow-50 to-yellow-100',
  },
  high: {
    color: 'bg-orange-100 text-orange-800 border-orange-300 hover:bg-orange-200',
    icon: 'AlertOctagon',
    label: 'High Risk',
    description: 'Significant impact requiring expert review',
    gradient: 'from-orange-50 to-orange-100',
  },
  critical: {
    color: 'bg-red-100 text-red-800 border-red-300 hover:bg-red-200',
    icon: 'Zap',
    label: 'Critical Risk',
    description: 'Severe impact requiring immediate attention',
    animation: 'animate-pulse',
    gradient: 'from-red-50 to-red-100',
  },
};

const getIcon = (iconName: string, className: string) => {
  const iconMap = {
    CheckCircle: CheckCircle,
    AlertTriangle: AlertTriangle,
    AlertOctagon: AlertOctagon,
    Zap: Zap,
  };
  
  const IconComponent = iconMap[iconName as keyof typeof iconMap] || Info;
  return <IconComponent className={className} />;
};

const getSizeClasses = (size: 'small' | 'medium' | 'large') => {
  const sizeMap = {
    small: {
      badge: 'text-xs px-2 py-1 h-6',
      icon: 'h-3 w-3',
      container: 'gap-1',
    },
    medium: {
      badge: 'text-sm px-3 py-1.5 h-7',
      icon: 'h-4 w-4',
      container: 'gap-1.5',
    },
    large: {
      badge: 'text-base px-4 py-2 h-9',
      icon: 'h-5 w-5',
      container: 'gap-2',
    },
  };
  
  return sizeMap[size];
};

// Risk factor categorization
const categorizeRiskFactors = (factors: string[]) => {
  const categories = {
    data: factors.filter(f => 
      f.toLowerCase().includes('data') || 
      f.toLowerCase().includes('record') || 
      f.toLowerCase().includes('field') ||
      f.toLowerCase().includes('validation')
    ),
    performance: factors.filter(f => 
      f.toLowerCase().includes('performance') || 
      f.toLowerCase().includes('memory') || 
      f.toLowerCase().includes('cpu') ||
      f.toLowerCase().includes('response')
    ),
    security: factors.filter(f => 
      f.toLowerCase().includes('security') || 
      f.toLowerCase().includes('auth') || 
      f.toLowerCase().includes('permission') ||
      f.toLowerCase().includes('injection')
    ),
    business: factors.filter(f => 
      f.toLowerCase().includes('business') || 
      f.toLowerCase().includes('revenue') || 
      f.toLowerCase().includes('compliance') ||
      f.toLowerCase().includes('legal')
    ),
    other: [],
  };

  // Add factors that don't match any category to 'other'
  categories.other = factors.filter(f => 
    !categories.data.includes(f) &&
    !categories.performance.includes(f) &&
    !categories.security.includes(f) &&
    !categories.business.includes(f)
  );

  return categories;
};

// Calculate dynamic risk score based on multiple factors
const calculateDynamicRiskScore = (
  baseScore: number,
  factors: string[],
  timeRemaining?: number,
  systemLoad?: number
): number => {
  let adjustedScore = baseScore;

  // Time pressure modifier
  if (timeRemaining !== undefined) {
    if (timeRemaining < 15) { // Less than 15 minutes
      adjustedScore += 15;
    } else if (timeRemaining < 60) { // Less than 1 hour
      adjustedScore += 8;
    } else if (timeRemaining < 240) { // Less than 4 hours
      adjustedScore += 3;
    }
  }

  // System load modifier
  if (systemLoad !== undefined) {
    if (systemLoad > 80) {
      adjustedScore += 10;
    } else if (systemLoad > 60) {
      adjustedScore += 5;
    }
  }

  // Factor count modifier
  const factorModifier = Math.min(15, factors.length * 2);
  adjustedScore += factorModifier;

  return Math.min(100, Math.max(0, adjustedScore));
};

export const RiskIndicator: React.FC<RiskIndicatorProps> = ({
  riskLevel,
  riskScore,
  riskFactors,
  showDetails = false,
  size = 'medium',
  animated = false,
  className = '',
}) => {
  const [dynamicScore, setDynamicScore] = useState(riskScore);
  const [showBreakdown, setShowBreakdown] = useState(false);
  
  const config = riskConfigs[riskLevel];
  const sizeClasses = getSizeClasses(size);
  const categorizedFactors = categorizeRiskFactors(riskFactors);
  
  const shouldAnimate = animated || (riskLevel === 'critical' && config.animation);

  // Update dynamic score when props change
  useEffect(() => {
    const newScore = calculateDynamicRiskScore(riskScore, riskFactors);
    setDynamicScore(newScore);
  }, [riskScore, riskFactors]);

  // Get risk trend indicator
  const getRiskTrend = () => {
    if (dynamicScore > riskScore + 5) return { icon: TrendingUp, color: 'text-red-500', label: 'Increasing' };
    if (dynamicScore < riskScore - 5) return { icon: TrendingDown, color: 'text-green-500', label: 'Decreasing' };
    return { icon: Minus, color: 'text-gray-500', label: 'Stable' };
  };

  const trend = getRiskTrend();
  const TrendIcon = trend.icon;

  const indicator = (
    <Badge
      className={`
        ${config.color}
        ${sizeClasses.badge}
        ${shouldAnimate ? config.animation || '' : ''}
        ${className}
        flex items-center ${sizeClasses.container}
        transition-all duration-200
        cursor-help
        border
        relative
        group
      `}
    >
      {getIcon(config.icon, sizeClasses.icon)}
      <span className="font-medium">{config.label}</span>
      {showDetails && dynamicScore && (
        <span className="ml-1 opacity-75">
          ({Math.round(dynamicScore)}/100)
        </span>
      )}
      
      {/* Trend indicator for medium and large sizes */}
      {size !== 'small' && dynamicScore !== riskScore && (
        <TrendIcon className={`h-3 w-3 ml-1 ${trend.color}`} />
      )}
      
      {/* Animated pulse for critical items */}
      {riskLevel === 'critical' && (
        <div className="absolute inset-0 rounded-full bg-red-400 opacity-25 animate-ping" />
      )}
    </Badge>
  );

  // Simple tooltip for basic usage
  if (!showDetails && riskFactors.length === 0) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {indicator}
          </TooltipTrigger>
          <TooltipContent>
            <div className="space-y-1">
              <p className="font-medium">{config.label}</p>
              <p className="text-sm">{config.description}</p>
              {dynamicScore && (
                <p className="text-sm">Risk Score: {Math.round(dynamicScore)}/100</p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Detailed popover for comprehensive risk information
  return (
    <Popover open={showBreakdown} onOpenChange={setShowBreakdown}>
      <PopoverTrigger asChild>
        {indicator}
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="start">
        <div className="p-4 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getIcon(config.icon, 'h-5 w-5')}
              <div>
                <h3 className="font-semibold">{config.label}</h3>
                <p className="text-sm text-muted-foreground">{config.description}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowBreakdown(false)}
              className="h-6 w-6 p-0"
            >
              ×
            </Button>
          </div>

          {/* Risk Score with Progress Bar */}
          {dynamicScore !== undefined && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Risk Score</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm">{Math.round(dynamicScore)}/100</span>
                  {dynamicScore !== riskScore && (
                    <div className="flex items-center gap-1">
                      <TrendIcon className={`h-3 w-3 ${trend.color}`} />
                      <span className="text-xs text-muted-foreground">
                        {trend.label}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              
              <Progress 
                value={dynamicScore} 
                className={`h-2 ${
                  dynamicScore <= 25 ? '[&>div]:bg-green-500' :
                  dynamicScore <= 50 ? '[&>div]:bg-yellow-500' :
                  dynamicScore <= 75 ? '[&>div]:bg-orange-500' :
                  '[&>div]:bg-red-500'
                }`}
              />
              
              {/* Score breakdown */}
              {dynamicScore !== riskScore && (
                <div className="text-xs text-muted-foreground">
                  Base: {riskScore} → Adjusted: {Math.round(dynamicScore)}
                  {dynamicScore > riskScore && (
                    <span className="text-orange-600 ml-1">
                      (+{Math.round(dynamicScore - riskScore)} due to conditions)
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Risk Factors by Category */}
          {riskFactors.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <Target className="h-4 w-4" />
                Risk Factors ({riskFactors.length})
              </h4>
              
              {Object.entries(categorizedFactors).map(([category, factors]) => {
                if (factors.length === 0) return null;
                
                const categoryIcons = {
                  data: '🗄️',
                  performance: '⚡',
                  security: '🔒',
                  business: '💼',
                  other: '📋',
                };

                const categoryLabels = {
                  data: 'Data Integrity',
                  performance: 'Performance',
                  security: 'Security',
                  business: 'Business Impact',
                  other: 'Other Factors',
                };

                return (
                  <div key={category} className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">
                        {categoryIcons[category as keyof typeof categoryIcons]}
                      </span>
                      <span className="text-sm font-medium">
                        {categoryLabels[category as keyof typeof categoryLabels]}
                      </span>
                      <Badge variant="secondary" className="text-xs h-5">
                        {factors.length}
                      </Badge>
                    </div>
                    <ul className="ml-6 space-y-1">
                      {factors.slice(0, 3).map((factor, index) => (
                        <li key={index} className="text-sm text-muted-foreground flex items-start gap-1">
                          <span className="text-muted-foreground mt-1.5 block w-1 h-1 bg-current rounded-full flex-shrink-0" />
                          <span>{factor}</span>
                        </li>
                      ))}
                      {factors.length > 3 && (
                        <li className="text-xs text-muted-foreground ml-2">
                          ...and {factors.length - 3} more
                        </li>
                      )}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}

          {/* Risk Mitigation Suggestions */}
          <div className="border-t pt-3">
            <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
              <Info className="h-4 w-4" />
              Mitigation Strategies
            </h4>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {riskLevel === 'critical' && (
                <>
                  <li>• Require multiple approvers</li>
                  <li>• Implement rollback plan</li>
                  <li>• Enable enhanced monitoring</li>
                </>
              )}
              {riskLevel === 'high' && (
                <>
                  <li>• Review by domain expert</li>
                  <li>• Additional validation checks</li>
                  <li>• Staged implementation</li>
                </>
              )}
              {riskLevel === 'medium' && (
                <>
                  <li>• Standard review process</li>
                  <li>• Basic monitoring</li>
                  <li>• Documentation required</li>
                </>
              )}
              {riskLevel === 'low' && (
                <>
                  <li>• Automated approval eligible</li>
                  <li>• Minimal oversight needed</li>
                  <li>• Standard logging</li>
                </>
              )}
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-2 border-t">
            <Button variant="outline" size="sm" className="text-xs">
              <Eye className="h-3 w-3 mr-1" />
              View Details
            </Button>
            <Button variant="outline" size="sm" className="text-xs">
              <BarChart3 className="h-3 w-3 mr-1" />
              Risk History
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

// Risk Level Comparison Component
interface RiskComparisonProps {
  currentRisk: RiskLevel;
  previousRisk?: RiskLevel;
  trend?: 'increasing' | 'decreasing' | 'stable';
  className?: string;
}

export const RiskComparison: React.FC<RiskComparisonProps> = ({
  currentRisk,
  previousRisk,
  trend,
  className = '',
}) => {
  if (!previousRisk) {
    return <RiskIndicator riskLevel={currentRisk} riskScore={0} riskFactors={[]} />;
  }

  const riskLevels: RiskLevel[] = ['low', 'medium', 'high', 'critical'];
  const currentIndex = riskLevels.indexOf(currentRisk);
  const previousIndex = riskLevels.indexOf(previousRisk);
  
  const isIncreasing = currentIndex > previousIndex;
  const isDecreasing = currentIndex < previousIndex;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <RiskIndicator riskLevel={currentRisk} riskScore={0} riskFactors={[]} />
      <div className="flex items-center">
        {isIncreasing && <TrendingUp className="h-3 w-3 text-red-500" />}
        {isDecreasing && <TrendingDown className="h-3 w-3 text-green-500" />}
        {!isIncreasing && !isDecreasing && <Minus className="h-3 w-3 text-gray-500" />}
      </div>
      <RiskIndicator riskLevel={previousRisk} riskScore={0} riskFactors={[]} size="small" />
    </div>
  );
};

// Risk Matrix Component for showing multiple risks
interface RiskMatrixProps {
  risks: Array<{
    id: string;
    label: string;
    level: RiskLevel;
    score: number;
    factors?: string[];
  }>;
  compact?: boolean;
  className?: string;
  onRiskClick?: (riskId: string) => void;
}

export const RiskMatrix: React.FC<RiskMatrixProps> = ({
  risks,
  compact = false,
  className = '',
  onRiskClick,
}) => {
  const groupedRisks = risks.reduce((acc, risk) => {
    if (!acc[risk.level]) {
      acc[risk.level] = [];
    }
    acc[risk.level].push(risk);
    return acc;
  }, {} as Record<RiskLevel, typeof risks>);

  const totalRisks = risks.length;
  const criticalCount = groupedRisks.critical?.length || 0;
  const highCount = groupedRisks.high?.length || 0;

  if (compact) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {(['critical', 'high', 'medium', 'low'] as RiskLevel[]).map((level) => {
          const count = groupedRisks[level]?.length || 0;
          if (count === 0) return null;
          
          return (
            <TooltipProvider key={level}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1 cursor-pointer hover:opacity-80">
                    <RiskIndicator
                      riskLevel={level}
                      riskScore={0}
                      riskFactors={[]}
                      size="small"
                    />
                    <span className="text-xs text-muted-foreground font-medium">
                      {count}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <div>
                    <p className="font-medium">{count} {level} risk item{count !== 1 ? 's' : ''}</p>
                    <ul className="text-sm mt-1 space-y-1">
                      {groupedRisks[level].slice(0, 3).map((risk) => (
                        <li key={risk.id}>• {risk.label}</li>
                      ))}
                      {groupedRisks[level].length > 3 && (
                        <li className="text-muted-foreground">
                          ...and {groupedRisks[level].length - 3} more
                        </li>
                      )}
                    </ul>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        })}
        
        {/* Summary badge */}
        {totalRisks > 0 && (
          <Badge variant="outline" className="text-xs">
            {criticalCount + highCount > 0 ? (
              <span className="text-red-600 font-medium">
                {criticalCount + highCount} high+ risks
              </span>
            ) : (
              <span className="text-green-600">
                All risks manageable
              </span>
            )}
          </Badge>
        )}
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {(['critical', 'high', 'medium', 'low'] as RiskLevel[]).map((level) => {
        const levelRisks = groupedRisks[level];
        if (!levelRisks?.length) return null;
        
        return (
          <div key={level} className="space-y-2">
            <div className="flex items-center gap-2">
              <RiskIndicator
                riskLevel={level}
                riskScore={0}
                riskFactors={[]}
                size="small"
              />
              <span className="text-sm font-medium">
                {levelRisks.length} item{levelRisks.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="ml-6 space-y-1">
              {levelRisks.map((risk) => (
                <div 
                  key={risk.id} 
                  className={`flex items-center justify-between text-sm p-2 rounded hover:bg-muted/50 transition-colors ${
                    onRiskClick ? 'cursor-pointer' : ''
                  }`}
                  onClick={() => onRiskClick?.(risk.id)}
                >
                  <div className="flex-1">
                    <span className="font-medium">{risk.label}</span>
                    {risk.factors && risk.factors.length > 0 && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {risk.factors.slice(0, 2).join(', ')}
                        {risk.factors.length > 2 && ` +${risk.factors.length - 2} more`}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-muted-foreground">{risk.score}/100</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Risk Trend Component with mini chart
interface RiskTrendProps {
  data: Array<{
    date: string;
    level: RiskLevel;
    score: number;
    timestamp?: Date;
  }>;
  className?: string;
  showMiniChart?: boolean;
}

export const RiskTrend: React.FC<RiskTrendProps> = ({
  data,
  className = '',
  showMiniChart = true,
}) => {
  if (data.length === 0) return null;

  const latest = data[data.length - 1];
  const previous = data.length > 1 ? data[data.length - 2] : null;
  const weekAgo = data.length > 7 ? data[data.length - 8] : null;

  const trendDirection = (() => {
    if (!previous) return 'stable';
    const riskLevels: RiskLevel[] = ['low', 'medium', 'high', 'critical'];
    const currentIndex = riskLevels.indexOf(latest.level);
    const previousIndex = riskLevels.indexOf(previous.level);
    
    if (currentIndex > previousIndex) return 'increasing';
    if (currentIndex < previousIndex) return 'decreasing';
    return 'stable';
  })();

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Risk Trend</span>
        </div>
        {previous && (
          <RiskComparison
            currentRisk={latest.level}
            previousRisk={previous.level}
            trend={trendDirection}
          />
        )}
      </div>
      
      {/* Mini Chart */}
      {showMiniChart && (
        <div className="space-y-2">
          <div className="flex items-end gap-1 h-12 bg-muted/20 rounded p-2">
            {data.slice(-14).map((point, index) => {
              const height = Math.max(4, (point.score / 100) * 40);
              const config = riskConfigs[point.level];
              
              return (
                <TooltipProvider key={index}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className={`w-2 ${config.color.split(' ')[0]} rounded-t transition-all duration-200 hover:opacity-80 cursor-help`}
                        style={{ height: `${height}px` }}
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      <div>
                        <p className="font-medium">{point.date}</p>
                        <p className="text-sm">Score: {point.score}/100</p>
                        <p className="text-sm">Level: {point.level}</p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              );
            })}
          </div>
          
          {/* Trend summary */}
          <div className="text-xs text-muted-foreground">
            {weekAgo && (
              <>
                Past 7 days: {latest.score} vs {weekAgo.score} 
                <span className={`ml-1 ${
                  latest.score > weekAgo.score ? 'text-red-600' : 
                  latest.score < weekAgo.score ? 'text-green-600' : 
                  'text-gray-600'
                }`}>
                  ({latest.score > weekAgo.score ? '+' : ''}{latest.score - weekAgo.score})
                </span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};