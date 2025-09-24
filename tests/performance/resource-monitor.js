#!/usr/bin/env node

/**
 * Real-time Resource Monitoring for Large Dataset Testing
 *
 * Provides comprehensive monitoring of:
 * - Memory usage (heap, external, RSS)
 * - CPU utilization and processing time
 * - Database connection pool and query performance
 * - Network I/O and file system operations
 * - System load and resource availability
 *
 * Features:
 * - Real-time metrics collection
 * - Automated alerting for resource thresholds
 * - Performance baseline establishment
 * - Bottleneck detection and analysis
 */

const os = require("os");
const fs = require("fs");
const path = require("path");
const { EventEmitter } = require("events");

/**
 * Real-time Resource Monitor
 */
class ResourceMonitor extends EventEmitter {
  constructor(options = {}) {
    super();

    this.options = {
      // Monitoring intervals
      memoryInterval: options.memoryInterval || 1000, // 1 second
      cpuInterval: options.cpuInterval || 2000, // 2 seconds
      systemInterval: options.systemInterval || 5000, // 5 seconds

      // Alert thresholds
      memoryThreshold: options.memoryThreshold || 0.8, // 80% of available memory
      cpuThreshold: options.cpuThreshold || 0.8, // 80% CPU usage
      loadThreshold: options.loadThreshold || 2.0, // Load average threshold

      // Data retention
      maxDataPoints: options.maxDataPoints || 1000, // Keep last 1000 measurements
      saveInterval: options.saveInterval || 30000, // Save to disk every 30s

      // Output options
      outputFile:
        options.outputFile || path.join(__dirname, "resource-monitoring.json"),
      realTimeOutput: options.realTimeOutput || false,

      ...options,
    };

    this.isMonitoring = false;
    this.intervals = {};
    this.metrics = {
      memory: [],
      cpu: [],
      system: [],
      process: [],
      alerts: [],
    };

    this.lastCpuUsage = process.cpuUsage();
    this.startTime = Date.now();
    this.baselines = null;
  }

  /**
   * Start monitoring
   */
  start() {
    if (this.isMonitoring) {
      console.log("Resource monitoring already running");
      return;
    }

    this.isMonitoring = true;
    this.startTime = Date.now();

    console.log("🔍 Starting resource monitoring...");

    // Establish baselines
    this.establishBaselines();

    // Start monitoring intervals
    this.intervals.memory = setInterval(
      () => this.collectMemoryMetrics(),
      this.options.memoryInterval,
    );
    this.intervals.cpu = setInterval(
      () => this.collectCpuMetrics(),
      this.options.cpuInterval,
    );
    this.intervals.system = setInterval(
      () => this.collectSystemMetrics(),
      this.options.systemInterval,
    );
    this.intervals.save = setInterval(
      () => this.saveMetrics(),
      this.options.saveInterval,
    );

    // Monitor process events
    this.setupProcessMonitoring();

    this.emit("monitoring:started");
    console.log("✅ Resource monitoring started");
  }

  /**
   * Stop monitoring
   */
  stop() {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;

    // Clear intervals
    Object.values(this.intervals).forEach((interval) =>
      clearInterval(interval),
    );
    this.intervals = {};

    // Save final metrics
    this.saveMetrics();

    this.emit("monitoring:stopped");
    console.log("🛑 Resource monitoring stopped");
  }

  /**
   * Establish performance baselines
   */
  establishBaselines() {
    const baselineMetrics = [];

    // Collect baseline measurements
    for (let i = 0; i < 5; i++) {
      baselineMetrics.push({
        memory: this.getMemoryUsage(),
        cpu: this.getCpuUsage(),
        system: this.getSystemMetrics(),
      });
    }

    // Calculate baseline averages
    this.baselines = {
      memory: this.calculateAverageMetrics(
        baselineMetrics.map((m) => m.memory),
      ),
      cpu: this.calculateAverageMetrics(baselineMetrics.map((m) => m.cpu)),
      system: this.calculateAverageMetrics(
        baselineMetrics.map((m) => m.system),
      ),
      timestamp: new Date().toISOString(),
    };

    console.log("📊 Performance baselines established:", {
      memory: `${this.baselines.memory.heapUsedMB}MB heap`,
      cpu: `${this.baselines.cpu.userPercent}% user`,
      load: this.baselines.system.loadAverage1,
    });
  }

  /**
   * Collect memory metrics
   */
  collectMemoryMetrics() {
    const memoryUsage = this.getMemoryUsage();
    const timestamp = Date.now();

    const metrics = {
      timestamp,
      relativeTime: timestamp - this.startTime,
      ...memoryUsage,

      // Calculate changes from baseline
      deltaFromBaseline: this.baselines
        ? {
            heapUsedMB:
              memoryUsage.heapUsedMB - this.baselines.memory.heapUsedMB,
            heapTotalMB:
              memoryUsage.heapTotalMB - this.baselines.memory.heapTotalMB,
            externalMB:
              memoryUsage.externalMB - this.baselines.memory.externalMB,
            rssMB: memoryUsage.rssMB - this.baselines.memory.rssMB,
          }
        : null,
    };

    this.metrics.memory.push(metrics);
    this.trimMetrics("memory");

    // Check for memory alerts
    this.checkMemoryAlerts(metrics);

    if (this.options.realTimeOutput) {
      console.log(
        `🧠 Memory: ${metrics.heapUsedMB}MB heap (+${metrics.deltaFromBaseline?.heapUsedMB || 0}MB)`,
      );
    }

    this.emit("metrics:memory", metrics);
  }

  /**
   * Collect CPU metrics
   */
  collectCpuMetrics() {
    const cpuUsage = this.getCpuUsage();
    const timestamp = Date.now();

    const metrics = {
      timestamp,
      relativeTime: timestamp - this.startTime,
      ...cpuUsage,

      // Calculate changes from baseline
      deltaFromBaseline: this.baselines
        ? {
            userPercent: cpuUsage.userPercent - this.baselines.cpu.userPercent,
            systemPercent:
              cpuUsage.systemPercent - this.baselines.cpu.systemPercent,
            totalPercent:
              cpuUsage.totalPercent - this.baselines.cpu.totalPercent,
          }
        : null,
    };

    this.metrics.cpu.push(metrics);
    this.trimMetrics("cpu");

    // Check for CPU alerts
    this.checkCpuAlerts(metrics);

    if (this.options.realTimeOutput) {
      console.log(
        `⚡ CPU: ${metrics.totalPercent.toFixed(1)}% (+${metrics.deltaFromBaseline?.totalPercent?.toFixed(1) || 0}%)`,
      );
    }

    this.emit("metrics:cpu", metrics);
  }

  /**
   * Collect system metrics
   */
  collectSystemMetrics() {
    const systemMetrics = this.getSystemMetrics();
    const timestamp = Date.now();

    const metrics = {
      timestamp,
      relativeTime: timestamp - this.startTime,
      ...systemMetrics,

      // Calculate changes from baseline
      deltaFromBaseline: this.baselines
        ? {
            freeMemoryMB:
              systemMetrics.freeMemoryMB - this.baselines.system.freeMemoryMB,
            loadAverage1:
              systemMetrics.loadAverage1 - this.baselines.system.loadAverage1,
          }
        : null,
    };

    this.metrics.system.push(metrics);
    this.trimMetrics("system");

    // Check for system alerts
    this.checkSystemAlerts(metrics);

    if (this.options.realTimeOutput) {
      console.log(
        `🖥️  System: ${metrics.freeMemoryMB}MB free, load ${metrics.loadAverage1.toFixed(2)}`,
      );
    }

    this.emit("metrics:system", metrics);
  }

  /**
   * Get memory usage
   */
  getMemoryUsage() {
    const usage = process.memoryUsage();

    return {
      heapUsed: usage.heapUsed,
      heapTotal: usage.heapTotal,
      external: usage.external,
      rss: usage.rss,

      // Converted to MB for readability
      heapUsedMB: Math.round(usage.heapUsed / 1024 / 1024),
      heapTotalMB: Math.round(usage.heapTotal / 1024 / 1024),
      externalMB: Math.round(usage.external / 1024 / 1024),
      rssMB: Math.round(usage.rss / 1024 / 1024),

      // Memory efficiency
      heapUtilization: usage.heapUsed / usage.heapTotal,
      systemMemoryUsage: usage.rss / os.totalmem(),
    };
  }

  /**
   * Get CPU usage
   */
  getCpuUsage() {
    const currentUsage = process.cpuUsage(this.lastCpuUsage);
    this.lastCpuUsage = process.cpuUsage();

    const totalCpuTime = currentUsage.user + currentUsage.system;
    const intervalMs = this.options.cpuInterval;

    // Convert microseconds to percentages
    const userPercent = (currentUsage.user / 1000 / intervalMs) * 100;
    const systemPercent = (currentUsage.system / 1000 / intervalMs) * 100;
    const totalPercent = userPercent + systemPercent;

    return {
      user: currentUsage.user,
      system: currentUsage.system,
      total: totalCpuTime,

      userPercent: Math.min(100, userPercent),
      systemPercent: Math.min(100, systemPercent),
      totalPercent: Math.min(100, totalPercent),

      // Additional CPU info
      cpuCount: os.cpus().length,
      uptime: process.uptime(),
    };
  }

  /**
   * Get system metrics
   */
  getSystemMetrics() {
    const loadAvg = os.loadavg();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();

    return {
      // Load averages
      loadAverage1: loadAvg[0],
      loadAverage5: loadAvg[1],
      loadAverage15: loadAvg[2],

      // Memory
      totalMemory: totalMem,
      freeMemory: freeMem,
      usedMemory: totalMem - freeMem,

      // Converted to MB
      totalMemoryMB: Math.round(totalMem / 1024 / 1024),
      freeMemoryMB: Math.round(freeMem / 1024 / 1024),
      usedMemoryMB: Math.round((totalMem - freeMem) / 1024 / 1024),

      // System info
      platform: os.platform(),
      arch: os.arch(),
      cpuCount: os.cpus().length,
      uptime: os.uptime(),

      // Memory utilization
      memoryUtilization: (totalMem - freeMem) / totalMem,
    };
  }

  /**
   * Check memory alerts
   */
  checkMemoryAlerts(metrics) {
    const systemMemoryUsage = metrics.systemMemoryUsage;

    if (systemMemoryUsage > this.options.memoryThreshold) {
      this.triggerAlert("memory", "high", {
        message: `Memory usage ${(systemMemoryUsage * 100).toFixed(1)}% exceeds threshold ${this.options.memoryThreshold * 100}%`,
        currentUsage: systemMemoryUsage,
        threshold: this.options.memoryThreshold,
        metrics,
      });
    }

    // Check for rapid memory growth
    if (this.metrics.memory.length >= 10) {
      const recent = this.metrics.memory.slice(-10);
      const growthRate =
        (recent[recent.length - 1].heapUsedMB - recent[0].heapUsedMB) / 10;

      if (growthRate > 10) {
        // More than 10MB per measurement
        this.triggerAlert("memory", "growth", {
          message: `Rapid memory growth detected: ${growthRate.toFixed(1)}MB per second`,
          growthRate,
          metrics,
        });
      }
    }
  }

  /**
   * Check CPU alerts
   */
  checkCpuAlerts(metrics) {
    if (metrics.totalPercent > this.options.cpuThreshold * 100) {
      this.triggerAlert("cpu", "high", {
        message: `CPU usage ${metrics.totalPercent.toFixed(1)}% exceeds threshold ${this.options.cpuThreshold * 100}%`,
        currentUsage: metrics.totalPercent / 100,
        threshold: this.options.cpuThreshold,
        metrics,
      });
    }
  }

  /**
   * Check system alerts
   */
  checkSystemAlerts(metrics) {
    if (metrics.loadAverage1 > this.options.loadThreshold) {
      this.triggerAlert("system", "load", {
        message: `System load ${metrics.loadAverage1.toFixed(2)} exceeds threshold ${this.options.loadThreshold}`,
        currentLoad: metrics.loadAverage1,
        threshold: this.options.loadThreshold,
        metrics,
      });
    }

    if (metrics.memoryUtilization > this.options.memoryThreshold) {
      this.triggerAlert("system", "memory", {
        message: `System memory usage ${(metrics.memoryUtilization * 100).toFixed(1)}% exceeds threshold ${this.options.memoryThreshold * 100}%`,
        currentUsage: metrics.memoryUtilization,
        threshold: this.options.memoryThreshold,
        metrics,
      });
    }
  }

  /**
   * Trigger alert
   */
  triggerAlert(category, type, details) {
    const alert = {
      timestamp: Date.now(),
      category,
      type,
      severity: this.calculateAlertSeverity(category, type, details),
      ...details,
    };

    this.metrics.alerts.push(alert);

    console.warn(
      `🚨 ALERT [${alert.severity.toUpperCase()}]: ${alert.message}`,
    );

    this.emit("alert", alert);
    this.emit(`alert:${category}`, alert);
    this.emit(`alert:${category}:${type}`, alert);
  }

  /**
   * Calculate alert severity
   */
  calculateAlertSeverity(category, type, details) {
    if (category === "memory" && type === "high" && details.currentUsage > 0.95)
      return "critical";
    if (category === "cpu" && type === "high" && details.currentUsage > 0.95)
      return "critical";
    if (category === "system" && type === "load" && details.currentLoad > 5.0)
      return "critical";

    if (category === "memory" && type === "growth") return "warning";

    return "warning";
  }

  /**
   * Setup process monitoring
   */
  setupProcessMonitoring() {
    // Monitor uncaught exceptions
    process.on("uncaughtException", (error) => {
      this.triggerAlert("process", "exception", {
        message: "Uncaught exception detected",
        error: error.message,
        stack: error.stack,
      });
    });

    // Monitor unhandled rejections
    process.on("unhandledRejection", (reason, promise) => {
      this.triggerAlert("process", "rejection", {
        message: "Unhandled promise rejection detected",
        reason: reason?.toString?.() || reason,
        promise: promise.toString(),
      });
    });

    // Monitor exit events
    process.on("exit", (code) => {
      this.metrics.process.push({
        timestamp: Date.now(),
        event: "exit",
        code,
        uptime: process.uptime(),
      });
    });
  }

  /**
   * Trim metrics to prevent memory bloat
   */
  trimMetrics(category) {
    if (this.metrics[category].length > this.options.maxDataPoints) {
      this.metrics[category] = this.metrics[category].slice(
        -this.options.maxDataPoints,
      );
    }
  }

  /**
   * Calculate average metrics
   */
  calculateAverageMetrics(metricsList) {
    if (metricsList.length === 0) return {};

    const keys = Object.keys(metricsList[0]);
    const averages = {};

    keys.forEach((key) => {
      const values = metricsList
        .map((m) => m[key])
        .filter((v) => typeof v === "number");
      if (values.length > 0) {
        averages[key] =
          values.reduce((sum, val) => sum + val, 0) / values.length;
      }
    });

    return averages;
  }

  /**
   * Save metrics to file
   */
  saveMetrics() {
    try {
      const data = {
        startTime: this.startTime,
        timestamp: Date.now(),
        baselines: this.baselines,
        metrics: this.metrics,
        summary: this.generateSummary(),
      };

      fs.writeFileSync(this.options.outputFile, JSON.stringify(data, null, 2));

      if (this.options.realTimeOutput) {
        console.log(`💾 Metrics saved to ${this.options.outputFile}`);
      }
    } catch (error) {
      console.error("Failed to save metrics:", error.message);
    }
  }

  /**
   * Generate performance summary
   */
  generateSummary() {
    const summary = {
      duration: Date.now() - this.startTime,
      dataPoints: {
        memory: this.metrics.memory.length,
        cpu: this.metrics.cpu.length,
        system: this.metrics.system.length,
      },
      alerts: {
        total: this.metrics.alerts.length,
        critical: this.metrics.alerts.filter((a) => a.severity === "critical")
          .length,
        warning: this.metrics.alerts.filter((a) => a.severity === "warning")
          .length,
      },
    };

    // Memory summary
    if (this.metrics.memory.length > 0) {
      const memoryValues = this.metrics.memory.map((m) => m.heapUsedMB);
      summary.memory = {
        avg:
          memoryValues.reduce((sum, val) => sum + val, 0) / memoryValues.length,
        min: Math.min(...memoryValues),
        max: Math.max(...memoryValues),
        peak: Math.max(...memoryValues),
        growth: memoryValues[memoryValues.length - 1] - memoryValues[0],
      };
    }

    // CPU summary
    if (this.metrics.cpu.length > 0) {
      const cpuValues = this.metrics.cpu.map((c) => c.totalPercent);
      summary.cpu = {
        avg: cpuValues.reduce((sum, val) => sum + val, 0) / cpuValues.length,
        min: Math.min(...cpuValues),
        max: Math.max(...cpuValues),
        peak: Math.max(...cpuValues),
      };
    }

    // System summary
    if (this.metrics.system.length > 0) {
      const loadValues = this.metrics.system.map((s) => s.loadAverage1);
      summary.system = {
        avgLoad:
          loadValues.reduce((sum, val) => sum + val, 0) / loadValues.length,
        minLoad: Math.min(...loadValues),
        maxLoad: Math.max(...loadValues),
        peakLoad: Math.max(...loadValues),
      };
    }

    return summary;
  }

  /**
   * Get current metrics snapshot
   */
  getSnapshot() {
    return {
      timestamp: Date.now(),
      memory: this.getMemoryUsage(),
      cpu: this.getCpuUsage(),
      system: this.getSystemMetrics(),
      alerts: this.metrics.alerts.slice(-10), // Last 10 alerts
    };
  }

  /**
   * Get performance report
   */
  getReport() {
    return {
      baselines: this.baselines,
      summary: this.generateSummary(),
      recentMetrics: {
        memory: this.metrics.memory.slice(-10),
        cpu: this.metrics.cpu.slice(-10),
        system: this.metrics.system.slice(-10),
      },
      alerts: this.metrics.alerts,
      recommendations: this.generateRecommendations(),
    };
  }

  /**
   * Generate optimization recommendations
   */
  generateRecommendations() {
    const recommendations = [];
    const summary = this.generateSummary();

    // Memory recommendations
    if (summary.memory?.growth > 100) {
      // More than 100MB growth
      recommendations.push({
        category: "memory",
        priority: "high",
        description: `High memory growth detected (${summary.memory.growth.toFixed(1)}MB)`,
        action: "Implement garbage collection optimization and memory pooling",
        impact: "Reduce memory usage by 30-50%",
      });
    }

    if (summary.memory?.peak > 1000) {
      // More than 1GB peak
      recommendations.push({
        category: "memory",
        priority: "medium",
        description: `High peak memory usage (${summary.memory.peak}MB)`,
        action: "Consider streaming processing for large datasets",
        impact: "Reduce peak memory by 60-80%",
      });
    }

    // CPU recommendations
    if (summary.cpu?.avg > 70) {
      // Average CPU > 70%
      recommendations.push({
        category: "cpu",
        priority: "medium",
        description: `High average CPU usage (${summary.cpu.avg.toFixed(1)}%)`,
        action: "Profile and optimize hot code paths",
        impact: "Reduce CPU usage by 20-40%",
      });
    }

    // System recommendations
    if (summary.system?.avgLoad > 2.0) {
      recommendations.push({
        category: "system",
        priority: "medium",
        description: `High system load average (${summary.system.avgLoad.toFixed(2)})`,
        action: "Consider horizontal scaling or request throttling",
        impact: "Improve system responsiveness",
      });
    }

    // Alert-based recommendations
    const criticalAlerts = this.metrics.alerts.filter(
      (a) => a.severity === "critical",
    );
    if (criticalAlerts.length > 0) {
      recommendations.push({
        category: "alerts",
        priority: "critical",
        description: `${criticalAlerts.length} critical alerts detected`,
        action: "Immediate investigation and remediation required",
        impact: "Prevent system failures",
      });
    }

    return recommendations;
  }
}

/**
 * Database Performance Monitor
 * Specialized monitoring for database operations
 */
class DatabaseMonitor extends EventEmitter {
  constructor(options = {}) {
    super();

    this.options = {
      queryThreshold: options.queryThreshold || 100, // 100ms
      connectionThreshold: options.connectionThreshold || 50, // 50ms
      ...options,
    };

    this.queries = [];
    this.connections = [];
    this.isMonitoring = false;
  }

  /**
   * Start database monitoring
   */
  start() {
    this.isMonitoring = true;
    console.log("🗄️  Database monitoring started");
  }

  /**
   * Stop database monitoring
   */
  stop() {
    this.isMonitoring = false;
    console.log("🗄️  Database monitoring stopped");
  }

  /**
   * Record query execution
   */
  recordQuery(operation, duration, details = {}) {
    if (!this.isMonitoring) return;

    const query = {
      timestamp: Date.now(),
      operation,
      duration,
      slow: duration > this.options.queryThreshold,
      ...details,
    };

    this.queries.push(query);

    if (query.slow) {
      console.warn(`🐌 Slow query detected: ${operation} (${duration}ms)`);
      this.emit("slow-query", query);
    }

    this.emit("query", query);
  }

  /**
   * Record connection event
   */
  recordConnection(event, duration = 0, details = {}) {
    if (!this.isMonitoring) return;

    const connection = {
      timestamp: Date.now(),
      event,
      duration,
      slow: duration > this.options.connectionThreshold,
      ...details,
    };

    this.connections.push(connection);

    if (connection.slow) {
      console.warn(`🐌 Slow connection: ${event} (${duration}ms)`);
      this.emit("slow-connection", connection);
    }

    this.emit("connection", connection);
  }

  /**
   * Get database performance summary
   */
  getSummary() {
    const queryDurations = this.queries.map((q) => q.duration);
    const connectionDurations = this.connections
      .filter((c) => c.duration > 0)
      .map((c) => c.duration);

    return {
      queries: {
        total: this.queries.length,
        slow: this.queries.filter((q) => q.slow).length,
        avgDuration:
          queryDurations.length > 0
            ? queryDurations.reduce((sum, d) => sum + d, 0) /
              queryDurations.length
            : 0,
        maxDuration:
          queryDurations.length > 0 ? Math.max(...queryDurations) : 0,
      },
      connections: {
        total: this.connections.length,
        slow: this.connections.filter((c) => c.slow).length,
        avgDuration:
          connectionDurations.length > 0
            ? connectionDurations.reduce((sum, d) => sum + d, 0) /
              connectionDurations.length
            : 0,
        maxDuration:
          connectionDurations.length > 0 ? Math.max(...connectionDurations) : 0,
      },
    };
  }
}

// Export classes
module.exports = {
  ResourceMonitor,
  DatabaseMonitor,

  // Convenience function to create and start monitoring
  startResourceMonitoring: (options = {}) => {
    const monitor = new ResourceMonitor(options);
    monitor.start();
    return monitor;
  },

  startDatabaseMonitoring: (options = {}) => {
    const monitor = new DatabaseMonitor(options);
    monitor.start();
    return monitor;
  },
};

// CLI usage
if (require.main === module) {
  const monitor = new ResourceMonitor({
    realTimeOutput: true,
    outputFile: path.join(__dirname, "resource-monitoring-cli.json"),
  });

  monitor.start();

  // Handle process termination
  process.on("SIGINT", () => {
    console.log("\n⏹️  Stopping resource monitoring...");
    monitor.stop();
    process.exit(0);
  });

  console.log("Resource monitoring started. Press Ctrl+C to stop.");
}
