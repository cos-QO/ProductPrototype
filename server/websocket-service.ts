import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { parse } from 'url';
import { batchProcessor } from './batch-processor';

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

type WebSocketMessage = ProgressMessage | BatchCompletedMessage | ErrorMessage | CompletedMessage;

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

  constructor() {
    // Listen to batch processor events
    this.setupBatchProcessorListeners();
  }

  /**
   * Initialize WebSocket server
   */
  initialize(httpServer: Server): void {
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

    console.log('WebSocket server initialized on /ws');
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
      
      this.broadcastToSession(data.sessionId, message);
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
      
      this.broadcastToSession(data.sessionId, message);
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
      
      this.broadcastToSession(data.sessionId, message);
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
      
      this.broadcastToSession(data.sessionId, message);
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
      
      this.broadcastToSession(data.sessionId, message);
    });

    // Import cancelled
    batchProcessor.on('cancelled', (data: { sessionId: string }) => {
      const message = {
        type: 'cancelled',
        sessionId: data.sessionId,
        timestamp: new Date().toISOString()
      };
      
      this.broadcastToSession(data.sessionId, message);
    });
  }

  /**
   * Broadcast message to all clients subscribed to a session
   */
  private broadcastToSession(sessionId: string, message: any): void {
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
    for (const [sessionId, clients] of this.clients.entries()) {
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
    for (const clients of this.clients.values()) {
      total += clients.length;
    }
    return total;
  }

  /**
   * Get connection statistics
   */
  getStats(): { 
    totalConnections: number, 
    activeSessions: number,
    sessionDetails: Array<{ sessionId: string, clients: number }>
  } {
    const sessionDetails = Array.from(this.clients.entries()).map(([sessionId, clients]) => ({
      sessionId,
      clients: clients.length
    }));

    return {
      totalConnections: this.getTotalConnections(),
      activeSessions: this.clients.size,
      sessionDetails
    };
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
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    // Close all client connections
    for (const clients of this.clients.values()) {
      clients.forEach(client => {
        if (client.ws.readyState === WebSocket.OPEN) {
          client.ws.close(1001, 'Server shutting down');
        }
      });
    }

    this.clients.clear();

    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }

    console.log('WebSocket service shutdown complete');
  }
}

// Export singleton instance
export const webSocketService = new WebSocketService();