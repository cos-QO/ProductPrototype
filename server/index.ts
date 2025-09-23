import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";
import session from "express-session";
import csrf from "csrf";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();

// Security: Session configuration for CSRF protection and session security
app.use(
  session({
    secret:
      process.env.SESSION_SECRET ||
      (() => {
        throw new Error("SESSION_SECRET environment variable is required");
      })(),
    name: "qone_session", // Custom session name to avoid fingerprinting
    resave: false,
    saveUninitialized: false,
    rolling: true, // Reset session expiry on activity
    cookie: {
      secure: process.env.NODE_ENV === "production", // HTTPS only in production
      httpOnly: true, // Prevent XSS access to cookies
      maxAge: 8 * 60 * 60 * 1000, // 8 hours (shorter for security)
      sameSite: "strict", // CSRF protection
    },
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  // Initialize WebSocket service for real-time progress tracking
  const { webSocketService } = await import("./websocket-service");
  webSocketService.initialize(server);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen(port, "0.0.0.0", () => {
    log(`serving on port ${port}`);
    log(`WebSocket server available at ws://localhost:${port}/ws`);
  });

  // Graceful shutdown
  process.on("SIGTERM", () => {
    log("SIGTERM received, shutting down gracefully");
    webSocketService.shutdown();
    server.close(() => {
      log("Server closed");
      process.exit(0);
    });
  });

  process.on("SIGINT", () => {
    log("SIGINT received, shutting down gracefully");
    webSocketService.shutdown();
    server.close(() => {
      log("Server closed");
      process.exit(0);
    });
  });
})();
