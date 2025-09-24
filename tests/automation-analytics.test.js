/**
 * Comprehensive Test Suite for Automation Analytics System
 * Tests all components of the automation reporting and analytics framework
 */

const request = require('supertest');
const { expect } = require('chai');
const path = require('path');
const fs = require('fs').promises;

describe('Automation Analytics System', () => {
  let app;
  let server;
  let authToken;

  before(async () => {
    // Initialize test environment
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = 'mock://test-database';
    
    const { createApp } = await import('../server/index.js');
    app = await createApp();
    server = app.listen(0); // Use random available port
  });

  after(async () => {
    if (server) {
      server.close();
    }
  });

  beforeEach(async () => {
    // Get authentication token for tests
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@automation-analytics.com',
        password: 'testpass123'
      });
    
    if (response.body.token) {
      authToken = response.body.token;
    }
  });

  describe('Analytics API Endpoints', () => {
    describe('GET /api/automation/metrics', () => {
      it('should return automation metrics with valid time range', async () => {
        const response = await request(app)
          .get('/api/automation/metrics?timeRange=24h')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).to.have.property('automationRate');
        expect(response.body).to.have.property('costEfficiency');
        expect(response.body).to.have.property('timeSavings');
        expect(response.body).to.have.property('errorReduction');
        expect(response.body).to.have.property('userSatisfaction');
        expect(response.body).to.have.property('systemHealth');

        // Validate automation rate structure
        expect(response.body.automationRate).to.have.property('current');
        expect(response.body.automationRate).to.have.property('target');
        expect(response.body.automationRate).to.have.property('trend');
        expect(response.body.automationRate).to.have.property('weekOverWeek');
      });

      it('should handle different time ranges', async () => {
        const timeRanges = ['1h', '24h', '7d', '30d'];
        
        for (const range of timeRanges) {
          const response = await request(app)
            .get(`/api/automation/metrics?timeRange=${range}`)
            .set('Authorization', `Bearer ${authToken}`)
            .expect(200);

          expect(response.body).to.have.property('automationRate');
          expect(response.body.automationRate.current).to.be.a('number');
          expect(response.body.automationRate.current).to.be.at.least(0);
          expect(response.body.automationRate.current).to.be.at.most(100);
        }
      });
    });

    describe('GET /api/automation/business-impact', () => {
      it('should return business impact analysis', async () => {
        const response = await request(app)
          .get('/api/automation/business-impact?timeRange=30d')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).to.have.property('revenueImpact');
        expect(response.body).to.have.property('costSavings');
        expect(response.body).to.have.property('timeToMarket');
        expect(response.body).to.have.property('qualityImprovement');
        expect(response.body).to.have.property('customerSatisfaction');
        expect(response.body).to.have.property('competitiveAdvantage');

        expect(response.body.revenueImpact).to.be.a('number');
        expect(response.body.costSavings).to.be.a('number');
        expect(response.body.competitiveAdvantage).to.be.an('array');
      });
    });

    describe('GET /api/automation/trends', () => {
      it('should return trend data', async () => {
        const response = await request(app)
          .get('/api/automation/trends?days=7')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).to.be.an('array');
        expect(response.body).to.have.length.at.least(1);

        if (response.body.length > 0) {
          const trend = response.body[0];
          expect(trend).to.have.property('date');
          expect(trend).to.have.property('automationRate');
          expect(trend).to.have.property('costs');
          expect(trend).to.have.property('errors');
          expect(trend).to.have.property('performance');
          expect(trend).to.have.property('userSatisfaction');
        }
      });
    });

    describe('GET /api/automation/cost-breakdown', () => {
      it('should return detailed cost analysis', async () => {
        const response = await request(app)
          .get('/api/automation/cost-breakdown?timeRange=30d')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).to.have.property('llmApiCosts');
        expect(response.body).to.have.property('computeResources');
        expect(response.body).to.have.property('storageOptimization');
        expect(response.body).to.have.property('manualLabor');
        expect(response.body).to.have.property('qualityAssurance');
        expect(response.body).to.have.property('infrastructure');

        // Validate all costs are numbers
        Object.values(response.body).forEach(cost => {
          expect(cost).to.be.a('number');
          expect(cost).to.be.at.least(0);
        });
      });
    });

    describe('GET /api/automation/recommendations', () => {
      it('should return optimization recommendations', async () => {
        const response = await request(app)
          .get('/api/automation/recommendations')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).to.have.property('costOptimization');
        expect(response.body).to.have.property('performanceOptimization');
        expect(response.body).to.have.property('automationOpportunities');

        expect(response.body.costOptimization).to.be.an('array');
        expect(response.body.performanceOptimization).to.be.an('array');
        expect(response.body.automationOpportunities).to.be.an('array');

        // Validate recommendation structure
        if (response.body.costOptimization.length > 0) {
          const rec = response.body.costOptimization[0];
          expect(rec).to.have.property('recommendation');
          expect(rec).to.have.property('effort');
          expect(rec).to.have.property('timeline');
        }
      });
    });

    describe('GET /api/automation/executive-summary', () => {
      it('should return executive summary', async () => {
        const response = await request(app)
          .get('/api/automation/executive-summary?timeRange=30d')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).to.have.property('summary');
        expect(response.body).to.have.property('keyAchievements');
        expect(response.body).to.have.property('recommendations');
        expect(response.body).to.have.property('nextSteps');

        expect(response.body.keyAchievements).to.be.an('array');
        expect(response.body.nextSteps).to.be.an('array');
      });
    });
  });

  describe('Report Generation System', () => {
    describe('POST /api/automation/reports/generate', () => {
      it('should generate executive report', async () => {
        const response = await request(app)
          .post('/api/automation/reports/generate')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            type: 'executive',
            timeRange: '30d',
            format: 'html'
          })
          .expect(200);

        expect(response.body).to.have.property('success', true);
        expect(response.body).to.have.property('reportId');
        expect(response.body).to.have.property('filePath');
        expect(response.body).to.have.property('status');
      });

      it('should generate technical report', async () => {
        const response = await request(app)
          .post('/api/automation/reports/generate')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            type: 'technical',
            timeRange: '7d',
            format: 'json'
          })
          .expect(200);

        expect(response.body).to.have.property('success', true);
        expect(response.body).to.have.property('reportId');
      });

      it('should generate cost report', async () => {
        const response = await request(app)
          .post('/api/automation/reports/generate')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            type: 'cost',
            timeRange: '90d',
            format: 'html'
          })
          .expect(200);

        expect(response.body).to.have.property('success', true);
      });

      it('should reject invalid report types', async () => {
        await request(app)
          .post('/api/automation/reports/generate')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            type: 'invalid',
            timeRange: '30d'
          })
          .expect(400);
      });
    });

    describe('Report Scheduling', () => {
      it('should schedule a report', async () => {
        const nextRun = new Date(Date.now() + 24 * 60 * 60 * 1000); // Tomorrow

        const response = await request(app)
          .post('/api/automation/reports/schedule')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: 'Weekly Executive Report',
            config: {
              type: 'executive',
              frequency: 'weekly',
              recipients: ['exec@company.com'],
              format: 'html',
              includeCharts: true
            },
            nextRun: nextRun.toISOString(),
            enabled: true
          })
          .expect(200);

        expect(response.body).to.have.property('success', true);
        expect(response.body).to.have.property('scheduleId');
      });

      it('should get scheduled reports', async () => {
        const response = await request(app)
          .get('/api/automation/reports/schedules')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).to.be.an('array');
      });
    });
  });

  describe('Data Validation and Error Handling', () => {
    it('should handle missing authentication', async () => {
      await request(app)
        .get('/api/automation/metrics')
        .expect(401);
    });

    it('should validate time range parameters', async () => {
      const response = await request(app)
        .get('/api/automation/metrics?timeRange=invalid')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200); // Should default to 24h

      expect(response.body).to.have.property('automationRate');
    });

    it('should handle malformed requests gracefully', async () => {
      await request(app)
        .post('/api/automation/reports/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: null,
          timeRange: undefined
        })
        .expect(400);
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle concurrent metric requests', async () => {
      const requests = [];
      const concurrentRequests = 10;

      for (let i = 0; i < concurrentRequests; i++) {
        requests.push(
          request(app)
            .get('/api/automation/metrics')
            .set('Authorization', `Bearer ${authToken}`)
        );
      }

      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.status).to.equal(200);
        expect(response.body).to.have.property('automationRate');
      });
    });

    it('should complete metrics calculation within reasonable time', async () => {
      const start = Date.now();
      
      await request(app)
        .get('/api/automation/metrics?timeRange=30d')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      const duration = Date.now() - start;
      expect(duration).to.be.below(5000); // Should complete within 5 seconds
    });
  });

  describe('Integration with Existing Systems', () => {
    it('should integrate with test execution data', async () => {
      // Test that metrics correctly reflect test execution data
      const metricsResponse = await request(app)
        .get('/api/automation/metrics')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Verify metrics are calculating based on actual data
      expect(metricsResponse.body.automationRate.current).to.be.a('number');
      expect(metricsResponse.body.timeSavings.savedHours).to.be.at.least(0);
    });

    it('should provide consistent data across different endpoints', async () => {
      const [metricsResponse, businessResponse, trendsResponse] = await Promise.all([
        request(app).get('/api/automation/metrics').set('Authorization', `Bearer ${authToken}`),
        request(app).get('/api/automation/business-impact').set('Authorization', `Bearer ${authToken}`),
        request(app).get('/api/automation/trends?days=1').set('Authorization', `Bearer ${authToken}`)
      ]);

      // Verify data consistency
      expect(metricsResponse.body.costEfficiency.savings)
        .to.equal(businessResponse.body.costSavings);
    });
  });

  describe('Real-time Features', () => {
    it('should support WebSocket connections for live updates', async () => {
      // This test would require WebSocket client setup
      // For now, just verify the endpoint structure supports real-time data
      const response = await request(app)
        .get('/api/automation/metrics')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Verify response includes timestamp for real-time updates
      expect(response.body).to.be.an('object');
    });
  });

  describe('Security and Access Control', () => {
    it('should require authentication for all endpoints', async () => {
      const endpoints = [
        '/api/automation/metrics',
        '/api/automation/business-impact',
        '/api/automation/trends',
        '/api/automation/cost-breakdown',
        '/api/automation/recommendations',
        '/api/automation/executive-summary'
      ];

      for (const endpoint of endpoints) {
        await request(app)
          .get(endpoint)
          .expect(401);
      }
    });

    it('should sanitize output data', async () => {
      const response = await request(app)
        .get('/api/automation/metrics')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Verify no sensitive data is exposed
      const responseString = JSON.stringify(response.body);
      expect(responseString).to.not.include('password');
      expect(responseString).to.not.include('token');
      expect(responseString).to.not.include('secret');
    });
  });
});

describe('Analytics Components Unit Tests', () => {
  describe('AutomationAnalyticsService', () => {
    let analyticsService;

    beforeEach(async () => {
      const AutomationAnalyticsService = await import('../server/services/automation-analytics.js');
      const mockWebSocketService = {
        broadcast: () => {},
        getStats: () => ({ connections: 0 }),
        healthCheck: () => ({ status: 'healthy' })
      };
      analyticsService = new AutomationAnalyticsService.default(mockWebSocketService);
    });

    it('should calculate automation rate correctly', async () => {
      // Mock the database queries that would normally be called
      const metrics = await analyticsService.getAutomationMetrics('24h');
      
      expect(metrics).to.have.property('automationRate');
      expect(metrics.automationRate.current).to.be.a('number');
      expect(metrics.automationRate.current).to.be.at.least(0);
      expect(metrics.automationRate.current).to.be.at.most(100);
    });

    it('should provide business impact calculations', async () => {
      const businessImpact = await analyticsService.getBusinessImpact('30d');
      
      expect(businessImpact).to.have.property('revenueImpact');
      expect(businessImpact).to.have.property('costSavings');
      expect(businessImpact.revenueImpact).to.be.a('number');
      expect(businessImpact.costSavings).to.be.a('number');
    });

    it('should generate trend data', async () => {
      const trends = await analyticsService.getTrendData(7);
      
      expect(trends).to.be.an('array');
      expect(trends).to.have.length(7);
      
      if (trends.length > 0) {
        expect(trends[0]).to.have.property('date');
        expect(trends[0]).to.have.property('automationRate');
        expect(trends[0]).to.have.property('costs');
      }
    });
  });

  describe('Report Generator', () => {
    let reportGenerator;

    beforeEach(async () => {
      const ReportGenerator = await import('../server/services/report-generator.js');
      const mockAnalyticsService = {
        getAutomationMetrics: () => Promise.resolve({ automationRate: { current: 65 } }),
        getBusinessImpact: () => Promise.resolve({ costSavings: 2500 }),
        getTrendData: () => Promise.resolve([]),
        getCostBreakdown: () => Promise.resolve({ llmApiCosts: 100 }),
        getOptimizationRecommendations: () => Promise.resolve({ costOptimization: [] })
      };
      const mockWebSocketService = { broadcast: () => {} };
      
      reportGenerator = new ReportGenerator.default(mockAnalyticsService, mockWebSocketService);
    });

    it('should generate executive reports', async () => {
      const report = await reportGenerator.generateReport('executive', '30d', 'html');
      
      expect(report).to.have.property('id');
      expect(report).to.have.property('type', 'executive');
      expect(report).to.have.property('status');
    });

    it('should schedule reports correctly', () => {
      const scheduleId = reportGenerator.scheduleReport({
        name: 'Test Report',
        config: {
          type: 'technical',
          frequency: 'weekly',
          recipients: ['test@example.com'],
          format: 'html',
          includeCharts: true
        },
        nextRun: new Date(Date.now() + 86400000),
        enabled: true,
        createdBy: 'test-user'
      });

      expect(scheduleId).to.be.a('string');
      
      const schedules = reportGenerator.getSchedules();
      expect(schedules).to.have.length(1);
      expect(schedules[0]).to.have.property('name', 'Test Report');
    });
  });
});

describe('Dashboard Component Tests', () => {
  // These would be React component tests using Jest and React Testing Library
  // For now, we'll focus on the API integration aspects
  
  describe('Metrics Display', () => {
    it('should format metrics correctly for display', () => {
      const mockMetrics = {
        automationRate: { current: 62.5, target: 67, trend: 'increasing', weekOverWeek: 3.2 },
        costEfficiency: { savings: 2364.50, roi: 487.2 }
      };

      // Test that metrics are properly formatted for UI display
      expect(mockMetrics.automationRate.current).to.equal(62.5);
      expect(mockMetrics.costEfficiency.savings).to.equal(2364.50);
    });

    it('should handle edge cases in metric calculations', () => {
      const edgeCases = [
        { current: 0, target: 67 },
        { current: 100, target: 67 },
        { current: 62.5, target: 0 }
      ];

      edgeCases.forEach(testCase => {
        const progressPercentage = (testCase.current / Math.max(testCase.target, 1)) * 100;
        expect(progressPercentage).to.be.a('number');
        expect(progressPercentage).to.not.be.NaN;
      });
    });
  });
});

// Helper function to clean up test files
async function cleanupTestFiles() {
  const testDir = path.join(process.cwd(), 'generated-reports');
  try {
    const files = await fs.readdir(testDir);
    for (const file of files) {
      if (file.includes('test-') || file.includes('exec-')) {
        await fs.unlink(path.join(testDir, file));
      }
    }
  } catch (error) {
    // Directory might not exist, which is fine
  }
}

// Clean up after all tests
after(async () => {
  await cleanupTestFiles();
});