import { WebSocketServer, WebSocket } from 'ws';
import { parse } from 'url';
import { batchProcessor } from './batch-processor';
export class WebSocketService {
    wss = null;
    clients = new Map(); // sessionId -> clients
    heartbeatInterval = null;
    isInitialized = false;
    initializationTimestamp = null;
    initializationCount = 0;
    constructor() {
        // Listen to batch processor events
        this.setupBatchProcessorListeners();
    }
    /**
     * Initialize WebSocket server with duplicate protection
     */
    initialize(httpServer) {
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
            this.wss.on('connection', (ws, request) => {
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
        }
        catch (error) {
            console.error('❌ WebSocket server initialization failed:', error);
            this.isInitialized = false;
            this.initializationTimestamp = null;
            throw error;
        }
    }
    /**
     * Handle new WebSocket connection
     */
    handleConnection(ws, request) {
        console.log('WebSocket connection attempt:', request.url);
        const parsedUrl = parse(request.url, true);
        console.log('Parsed URL query:', parsedUrl.query);
        const sessionId = parsedUrl.query.sessionId;
        const userId = parsedUrl.query.userId;
        if (!sessionId || !userId) {
            console.log('WebSocket connection rejected: missing sessionId or userId', { sessionId, userId });
            ws.close(1008, 'Missing sessionId or userId');
            return;
        }
        // Add client to session
        const client = {
            ws,
            sessionId,
            userId,
            connectedAt: new Date()
        };
        if (!this.clients.has(sessionId)) {
            this.clients.set(sessionId, []);
        }
        this.clients.get(sessionId).push(client);
        console.log(`WebSocket client connected: sessionId=${sessionId}, userId=${userId}`);
        // Handle client messages
        ws.on('message', (data) => {
            try {
                const message = JSON.parse(data.toString());
                this.handleClientMessage(client, message);
            }
            catch (error) {
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
    handleClientMessage(client, message) {
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
    setupBatchProcessorListeners() {
        // Progress updates
        batchProcessor.on('progress', (data) => {
            const message = {
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
        batchProcessor.on('batchCompleted', (data) => {
            const message = {
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
        batchProcessor.on('completed', (data) => {
            const message = {
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
        batchProcessor.on('error', (data) => {
            const message = {
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
        batchProcessor.on('batchFailed', (data) => {
            const message = {
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
        batchProcessor.on('cancelled', (data) => {
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
    legacyBroadcastToSession(sessionId, message) {
        const clients = this.clients.get(sessionId);
        if (!clients || clients.length === 0) {
            return;
        }
        const messageStr = JSON.stringify(message);
        clients.forEach(client => {
            if (client.ws.readyState === WebSocket.OPEN) {
                try {
                    client.ws.send(messageStr);
                }
                catch (error) {
                    console.error('Error sending WebSocket message:', error);
                    this.removeClient(client);
                }
            }
        });
    }
    /**
     * Send message to a specific client
     */
    sendToClient(client, message) {
        if (client.ws.readyState === WebSocket.OPEN) {
            try {
                client.ws.send(JSON.stringify(message));
            }
            catch (error) {
                console.error('Error sending WebSocket message to client:', error);
                this.removeClient(client);
            }
        }
    }
    /**
     * Remove client from all sessions
     */
    removeClient(client) {
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
    moveClientToSession(client, newSessionId) {
        // Remove from current session
        this.removeClient(client);
        // Add to new session
        client.sessionId = newSessionId;
        if (!this.clients.has(newSessionId)) {
            this.clients.set(newSessionId, []);
        }
        this.clients.get(newSessionId).push(client);
    }
    /**
     * Send heartbeat to all connected clients
     */
    sendHeartbeat() {
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
                    }
                    catch (error) {
                        console.error('Error sending WebSocket ping:', error);
                        this.removeClient(client);
                    }
                }
                else {
                    this.removeClient(client);
                }
            });
        }
    }
    /**
     * Get total number of connected clients
     */
    getTotalConnections() {
        let total = 0;
        for (const clients of Array.from(this.clients.values())) {
            total += clients.length;
        }
        return total;
    }
    /**
     * Get connection statistics with initialization info
     */
    getStats() {
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
            status: this.isInitialized && this.wss ? 'healthy' : 'error',
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
    async emitWorkflowEvent(sessionId, event) {
        try {
            const message = {
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
        }
        catch (error) {
            console.error('[WEBSOCKET] Error emitting workflow event:', error);
        }
    }
    /**
     * Emit analysis complete event
     */
    async emitAnalysisComplete(sessionId, analysisResult) {
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
    async emitPreviewReady(sessionId, previewData) {
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
    async emitWorkflowError(sessionId, error) {
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
    broadcastToSession(sessionId, message) {
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
                }
                catch (error) {
                    console.error('[WEBSOCKET] Error sending message to client:', error);
                    this.removeClient(client);
                    failureCount++;
                }
            }
            else {
                this.removeClient(client);
                failureCount++;
            }
        });
        console.log(`[WEBSOCKET] Message broadcast to session ${sessionId}: ${successCount} sent, ${failureCount} failed`);
    }
    /**
     * Manually send progress update (for testing)
     */
    sendManualProgress(sessionId, progress) {
        const message = {
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
    shutdown() {
        console.log('🔄 WebSocket service shutdown initiated...');
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
        // Close all client connections
        let closedConnections = 0;
        for (const clients of Array.from(this.clients.values())) {
            clients.forEach((client) => {
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
    healthCheck() {
        const uptime = this.initializationTimestamp
            ? Date.now() - this.initializationTimestamp.getTime()
            : null;
        const serverRunning = this.wss !== null;
        const connectionsActive = this.getTotalConnections();
        let status;
        if (!this.isInitialized || !serverRunning) {
            status = 'error';
        }
        else if (connectionsActive === 0) {
            status = 'degraded';
        }
        else {
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
global.__webSocketServiceInitialized = false;
// Override initialize to add global tracking
const originalInitialize = webSocketService.initialize.bind(webSocketService);
webSocketService.initialize = function (httpServer) {
    if (global.__webSocketServiceInitialized) {
        console.error('🚨 CRITICAL: WebSocket service global initialization check failed!');
        console.error('   Another service instance may have been initialized.');
        console.error('   This indicates a serious singleton pattern violation.');
        return;
    }
    global.__webSocketServiceInitialized = true;
    return originalInitialize(httpServer);
};
// Override shutdown to reset global tracking
const originalShutdown = webSocketService.shutdown.bind(webSocketService);
webSocketService.shutdown = function () {
    global.__webSocketServiceInitialized = false;
    return originalShutdown();
};
//# sourceMappingURL=websocket-service.js.map