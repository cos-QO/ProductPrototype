import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { parse } from 'url';
import { batchProcessor } from './batch-processor';
import type { WorkflowEvent } from './services/workflow-orchestrator';

// Types for WebSocket messages
interface ProgressMessage {
  type: 'progress';
  sessionId: string;
  data: {
    totalRecords: number;
    processedRecords: number;
    successfulRecords: number;
    failedRecords: number;
    currentBatch: number;
    totalBatches: number;
    processingRate: number; // records/second
    estimatedTimeRemaining: number; // seconds
    status: string;
  };
}

interface BatchCompletedMessage {
  type: 'batch_completed';
  sessionId: string;
  data: {
    batchNumber: number;
    success: boolean;
    processedCount: number;
    successCount: number;
    failureCount: number;
    processingTime: number;
  };
}

interface ErrorMessage {
  type: 'error';
  sessionId: string;
  data: {
    error: string;
    timestamp: string;
  };
}

interface CompletedMessage {
  type: 'completed';
  sessionId: string;
  data: {
    totalRecords: number;
    successfulRecords: number;
    failedRecords: number;
    processingTime: number;
    status: 'completed' | 'completed_with_errors' | 'failed';
  };
}

// Workflow-specific message types
interface WorkflowMessage {
  type: 'analysis_complete' | 'preview_generation_started' | 'preview_ready' | 
        'approval_required' | 'workflow_advanced' | 'execution_started' |
        'workflow_error' | 'mapping_suggestions';
  sessionId: string;
  data: any;
  metadata?: {
    autoAdvance?: boolean;
    confidence?: number;
    userAction?: boolean;
    expectedNextStep?: number;
    strategy?: string;
  };
  timestamp: string;
}

type WebSocketMessage = ProgressMessage | BatchCompletedMessage | ErrorMessage | CompletedMessage | WorkflowMessage;

interface ClientConnection {
  ws: WebSocket;
  sessionId: string;
  userId: string;
  connectedAt: Date;
}

export class WebSocketService {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, ClientConnection[]> = new Map(); // sessionId -> clients
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private isInitialized: boolean = false;
  private initializationTimestamp: Date | null = null;
  private initializationCount: number = 0;

  constructor() {
    // Listen to batch processor events
    this.setupBatchProcessorListeners();
  }

  /**
   * Initialize WebSocket server with duplicate protection
   */
  initialize(httpServer: Server): void {
    // SAFETY GUARD: Prevent duplicate initialization
    if (this.isInitialized) {
      const warningMessage = `⚠️  WebSocket service already initialized at ${this.initializationTimestamp}. Skipping duplicate initialization.`;
      console.warn(warningMessage);
      console.warn('  This indicates a potential singleton pattern violation.');
      console.warn('  Stack trace:', new Error('Duplicate initialization').stack);
      return;
    }

    // Track initialization attempts
    this.initializationCount++;
    
    try {
      this.wss = new WebSocketServer({ 
        server: httpServer,
        path: '/ws'
      });

    this.wss.on('connection', (ws: WebSocket, request) => {
      this.handleConnection(ws, request);
    });

    // Add error handling for the WebSocket server
    this.wss.on('error', (error) => {
      console.error('WebSocketServer error:', error);
    });

    // Log WebSocket upgrade requests
    httpServer.on('upgrade', (request, socket, head) => {
      console.log('WebSocket upgrade request:', request.url, request.headers);
    });

    // Setup heartbeat to keep connections alive
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
    }, 30000); // 30 seconds

    // Mark as successfully initialized
    this.isInitialized = true;
    this.initializationTimestamp = new Date();

    console.log(`✅ WebSocket server initialized successfully on /ws at ${this.initializationTimestamp}`);
    console.log(`   Initialization count: ${this.initializationCount}`);
    } catch (error) {
      console.error('❌ WebSocket server initialization failed:', error);
      this.isInitialized = false;
      this.initializationTimestamp = null;
      throw error;
    }
  }

  /**
   * Handle new WebSocket connection
   */
  private handleConnection(ws: WebSocket, request: any): void {
    console.log('WebSocket connection attempt:', request.url);
    const parsedUrl = parse(request.url, true);
    console.log('Parsed URL query:', parsedUrl.query);
    
    const sessionId = parsedUrl.query.sessionId as string;
    const userId = parsedUrl.query.userId as string;

    if (!sessionId || !userId) {
      console.log('WebSocket connection rejected: missing sessionId or userId', { sessionId, userId });
      ws.close(1008, 'Missing sessionId or userId');
      return;
    }

    // Add client to session
    const client: ClientConnection = {
      ws,
      sessionId,
      userId,
      connectedAt: new Date()
    };

    if (!this.clients.has(sessionId)) {
      this.clients.set(sessionId, []);
    }
    this.clients.get(sessionId)!.push(client);

    console.log(`WebSocket client connected: sessionId=${sessionId}, userId=${userId}`);

    // Handle client messages
    ws.on('message', (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        this.handleClientMessage(client, message);
      } catch (error) {
        console.error('Invalid WebSocket message:', error);
      }
    });

    // Handle client disconnect
    ws.on('close', () => {
      this.removeClient(client);
      console.log(`WebSocket client disconnected: sessionId=${sessionId}, userId=${userId}`);
    });

    // Handle WebSocket errors
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      this.removeClient(client);
    });

    // Send initial connection confirmation
    this.sendToClient(client, {
      type: 'connected',
      sessionId,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Handle messages from clients
   */
  private handleClientMessage(client: ClientConnection, message: any): void {
    switch (message.type) {
      case 'ping':
        this.sendToClient(client, { type: 'pong', timestamp: new Date().toISOString() });
        break;
      
      case 'subscribe':
        // Client wants to subscribe to a specific session
        const { sessionId } = message;
        if (sessionId && sessionId !== client.sessionId) {
          client.sessionId = sessionId;
          // Move client to new session
          this.moveClientToSession(client, sessionId);
        }
        break;
      
      default:
        console.log('Unknown WebSocket message type:', message.type);
    }
  }

  /**
   * Setup listeners for batch processor events
   */
  private setupBatchProcessorListeners(): void {
    // Progress updates
    batchProcessor.on('progress', (data: { sessionId: string, metrics: any }) => {
      const message: ProgressMessage = {
        type: 'progress',
        sessionId: data.sessionId,
        data: {
          totalRecords: data.metrics.totalRecords,
          processedRecords: data.metrics.processedRecords,
          successfulRecords: data.metrics.successfulRecords,
          failedRecords: data.metrics.failedRecords,
          currentBatch: Math.ceil(data.metrics.processedRecords / 100), // Assuming batch size of 100
          totalBatches: Math.ceil(data.metrics.totalRecords / 100),
          processingRate: data.metrics.throughput,
          estimatedTimeRemaining: data.metrics.estimatedCompletion 
            ? Math.round((data.metrics.estimatedCompletion.getTime() - Date.now()) / 1000)
            : 0,
          status: 'processing'
        }
      };
      
      this.legacyBroadcastToSession(data.sessionId, message);
    });

    // Batch completed
    batchProcessor.on('batchCompleted', (data: { sessionId: string, result: any }) => {
      const message: BatchCompletedMessage = {
        type: 'batch_completed',
        sessionId: data.sessionId,
        data: {
          batchNumber: data.result.batchNumber,
          success: data.result.success,
          processedCount: data.result.processedCount,
          successCount: data.result.successCount,
          failureCount: data.result.failureCount,
          processingTime: data.result.processingTime
        }
      };
      
      this.legacyBroadcastToSession(data.sessionId, message);
    });

    // Import completed
    batchProcessor.on('completed', (data: { sessionId: string, metrics: any }) => {
      const message: CompletedMessage = {
        type: 'completed',
        sessionId: data.sessionId,
        data: {
          totalRecords: data.metrics.totalRecords,
          successfulRecords: data.metrics.successfulRecords,
          failedRecords: data.metrics.failedRecords,
          processingTime: Date.now() - data.metrics.startTime.getTime(),
          status: data.metrics.failedRecords === 0 ? 'completed' : 'completed_with_errors'
        }
      };
      
      this.legacyBroadcastToSession(data.sessionId, message);
    });

    // Import errors
    batchProcessor.on('error', (data: { sessionId: string, error: any }) => {
      const message: ErrorMessage = {
        type: 'error',
        sessionId: data.sessionId,
        data: {
          error: data.error.message || 'Unknown error',
          timestamp: new Date().toISOString()
        }
      };
      
      this.legacyBroadcastToSession(data.sessionId, message);
    });

    // Batch failed
    batchProcessor.on('batchFailed', (data: { sessionId: string, batchNumber: number, error: any }) => {
      const message: ErrorMessage = {
        type: 'error',
        sessionId: data.sessionId,
        data: {
          error: `Batch ${data.batchNumber} failed: ${data.error.message}`,
          timestamp: new Date().toISOString()
        }
      };
      
      this.legacyBroadcastToSession(data.sessionId, message);
    });

    // Import cancelled
    batchProcessor.on('cancelled', (data: { sessionId: string }) => {
      const message = {
        type: 'cancelled',
        sessionId: data.sessionId,
        timestamp: new Date().toISOString()
      };
      
      this.legacyBroadcastToSession(data.sessionId, message);
    });
  }

  /**
   * Legacy broadcast method - replaced with enhanced version above
   * Kept for backward compatibility with batch processor
   */
  private legacyBroadcastToSession(sessionId: string, message: any): void {
    const clients = this.clients.get(sessionId);
    if (!clients || clients.length === 0) {
      return;
    }

    const messageStr = JSON.stringify(message);
    
    clients.forEach(client => {
      if (client.ws.readyState === WebSocket.OPEN) {
        try {
          client.ws.send(messageStr);
        } catch (error) {
          console.error('Error sending WebSocket message:', error);
          this.removeClient(client);
        }
      }
    });
  }

  /**
   * Send message to a specific client
   */
  private sendToClient(client: ClientConnection, message: any): void {
    if (client.ws.readyState === WebSocket.OPEN) {
      try {
        client.ws.send(JSON.stringify(message));
      } catch (error) {
        console.error('Error sending WebSocket message to client:', error);
        this.removeClient(client);
      }
    }
  }

  /**
   * Remove client from all sessions
   */
  private removeClient(client: ClientConnection): void {
    for (const [sessionId, clients] of Array.from(this.clients.entries())) {
      const index = clients.indexOf(client);
      if (index > -1) {
        clients.splice(index, 1);
        
        // Clean up empty sessions
        if (clients.length === 0) {
          this.clients.delete(sessionId);
        }
        break;
      }
    }
  }

  /**
   * Move client to a different session
   */
  private moveClientToSession(client: ClientConnection, newSessionId: string): void {
    // Remove from current session
    this.removeClient(client);
    
    // Add to new session
    client.sessionId = newSessionId;
    if (!this.clients.has(newSessionId)) {
      this.clients.set(newSessionId, []);
    }
    this.clients.get(newSessionId)!.push(client);
  }

  /**
   * Send heartbeat to all connected clients
   */
  private sendHeartbeat(): void {
    const heartbeatMessage = {
      type: 'heartbeat',
      timestamp: new Date().toISOString(),
      connections: this.getTotalConnections()
    };

    for (const [sessionId, clients] of this.clients.entries()) {
      clients.forEach(client => {
        if (client.ws.readyState === WebSocket.OPEN) {
          try {
            client.ws.ping();
          } catch (error) {
            console.error('Error sending WebSocket ping:', error);
            this.removeClient(client);
          }
        } else {
          this.removeClient(client);
        }
      });
    }
  }

  /**
   * Get total number of connected clients
   */
  private getTotalConnections(): number {
    let total = 0;
    for (const clients of Array.from(this.clients.values())) {
      total += clients.length;
    }
    return total;
  }

  /**
   * Get connection statistics with initialization info
   */
  getStats(): { 
    totalConnections: number, 
    activeSessions: number,
    sessionDetails: Array<{ sessionId: string, clients: number }>,
    initialization: {
      isInitialized: boolean,
      timestamp: Date | null,
      count: number,
      uptime: number | null
    },
    health: {
      status: 'healthy' | 'degraded' | 'error',
      lastHeartbeat: Date | null,
      serverStatus: string
    }
  } {
    const sessionDetails = Array.from(this.clients.entries()).map(([sessionId, clients]) => ({
      sessionId,
      clients: clients.length
    }));

    const uptime = this.initializationTimestamp 
      ? Date.now() - this.initializationTimestamp.getTime()
      : null;

    const serverStatus = this.wss 
      ? 'running'
      : 'not_initialized';

    const health = {
      status: this.isInitialized && this.wss ? 'healthy' as const : 'error' as const,
      lastHeartbeat: new Date(),
      serverStatus
    };

    return {
      totalConnections: this.getTotalConnections(),
      activeSessions: this.clients.size,
      sessionDetails,
      initialization: {
        isInitialized: this.isInitialized,
        timestamp: this.initializationTimestamp,
        count: this.initializationCount,
        uptime
      },
      health
    };
  }

  /**
   * NEW: Emit workflow-specific events for automation
   */
  async emitWorkflowEvent(sessionId: string, event: WorkflowEvent): Promise<void> {
    try {
      const message: WorkflowMessage = {
        type: event.type,
        sessionId,
        data: event.payload,
        metadata: event.metadata,
        timestamp: new Date().toISOString()
      };
      
      this.broadcastToSession(sessionId, message);
      
      // Log workflow progression for debugging
      console.log(`[WEBSOCKET] Workflow event emitted: ${event.type} for session ${sessionId}`, {
        confidence: event.metadata?.confidence,
        autoAdvance: event.metadata?.autoAdvance,
        expectedNextStep: event.metadata?.expectedNextStep
      });
    } catch (error) {
      console.error('[WEBSOCKET] Error emitting workflow event:', error);
    }
  }

  /**
   * Emit analysis complete event
   */
  async emitAnalysisComplete(sessionId: string, analysisResult: any): Promise<void> {
    await this.emitWorkflowEvent(sessionId, {
      type: 'analysis_complete',
      sessionId,
      payload: analysisResult,
      timestamp: new Date(),
      metadata: { autoAdvance: true }
    });
  }

  /**
   * Emit preview ready event
   */
  async emitPreviewReady(sessionId: string, previewData: any): Promise<void> {
    await this.emitWorkflowEvent(sessionId, {
      type: 'preview_ready',
      sessionId, 
      payload: previewData,
      timestamp: new Date(),
      metadata: { autoAdvance: true }
    });
  }

  /**
   * Emit workflow error event
   */
  async emitWorkflowError(sessionId: string, error: any): Promise<void> {
    await this.emitWorkflowEvent(sessionId, {
      type: 'workflow_error',
      sessionId,
      payload: {
        error: error.message || 'Unknown workflow error',
        recoverable: true,
        fallbackAction: 'manual_intervention_required'
      },
      timestamp: new Date(),
      metadata: { autoAdvance: false, userAction: true }
    });
  }

  /**
   * Enhanced broadcast with message filtering and validation
   */
  private broadcastToSession(sessionId: string, message: any): void {
    const clients = this.clients.get(sessionId);
    if (!clients || clients.length === 0) {
      console.log(`[WEBSOCKET] No clients connected for session ${sessionId}`);
      return;
    }

    const messageStr = JSON.stringify(message);
    let successCount = 0;
    let failureCount = 0;
    
    clients.forEach(client => {
      if (client.ws.readyState === WebSocket.OPEN) {
        try {
          client.ws.send(messageStr);
          successCount++;
        } catch (error) {
          console.error('[WEBSOCKET] Error sending message to client:', error);
          this.removeClient(client);
          failureCount++;
        }
      } else {
        this.removeClient(client);
        failureCount++;
      }
    });

    console.log(`[WEBSOCKET] Message broadcast to session ${sessionId}: ${successCount} sent, ${failureCount} failed`);
  }

  /**
   * Manually send progress update (for testing)
   */
  sendManualProgress(sessionId: string, progress: Partial<ProgressMessage['data']>): void {
    const message: ProgressMessage = {
      type: 'progress',
      sessionId,
      data: {
        totalRecords: 0,
        processedRecords: 0,
        successfulRecords: 0,
        failedRecords: 0,
        currentBatch: 0,
        totalBatches: 0,
        processingRate: 0,
        estimatedTimeRemaining: 0,
        status: 'processing',
        ...progress
      }
    };

    this.broadcastToSession(sessionId, message);
  }

  /**
   * Close all connections and cleanup
   */
  shutdown(): void {
    console.log('🔄 WebSocket service shutdown initiated...');
    
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    // Close all client connections
    let closedConnections = 0;
    for (const clients of Array.from(this.clients.values())) {
      clients.forEach((client: ClientConnection) => {
        if (client.ws.readyState === WebSocket.OPEN) {
          client.ws.close(1001, 'Server shutting down');
          closedConnections++;
        }
      });
    }

    this.clients.clear();

    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }

    // Reset initialization state
    this.isInitialized = false;
    this.initializationTimestamp = null;
    
    console.log(`✅ WebSocket service shutdown complete. Closed ${closedConnections} connections.`);
  }

  /**
   * Health check method for monitoring
   */
  healthCheck(): {
    status: 'healthy' | 'degraded' | 'error',
    details: {
      initialized: boolean,
      serverRunning: boolean,
      connectionsActive: number,
      uptime: number | null,
      lastCheck: Date
    }
  } {
    const uptime = this.initializationTimestamp 
      ? Date.now() - this.initializationTimestamp.getTime()
      : null;
    
    const serverRunning = this.wss !== null;
    const connectionsActive = this.getTotalConnections();
    
    let status: 'healthy' | 'degraded' | 'error';
    
    if (!this.isInitialized || !serverRunning) {
      status = 'error';
    } else if (connectionsActive === 0) {
      status = 'degraded';
    } else {
      status = 'healthy';
    }
    
    return {
      status,
      details: {
        initialized: this.isInitialized,
        serverRunning,
        connectionsActive,
        uptime,
        lastCheck: new Date()
      }
    };
  }
}

// Export singleton instance
export const webSocketService = new WebSocketService();

// Global initialization tracking for additional safety
(global as any).__webSocketServiceInitialized = false;

// Override initialize to add global tracking
const originalInitialize = webSocketService.initialize.bind(webSocketService);
webSocketService.initialize = function(httpServer: any) {
  if ((global as any).__webSocketServiceInitialized) {
    console.error('🚨 CRITICAL: WebSocket service global initialization check failed!');
    console.error('   Another service instance may have been initialized.');
    console.error('   This indicates a serious singleton pattern violation.');
    return;
  }
  
  (global as any).__webSocketServiceInitialized = true;
  return originalInitialize(httpServer);
};

// Override shutdown to reset global tracking
const originalShutdown = webSocketService.shutdown.bind(webSocketService);
webSocketService.shutdown = function() {
  (global as any).__webSocketServiceInitialized = false;
  return originalShutdown();
};