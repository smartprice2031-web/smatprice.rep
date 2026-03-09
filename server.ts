import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { createServer } from "http";
import { Server } from "socket.io";

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // Chat logic
  const messages: any[] = [];
  const activeUsers = new Map();

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("user:join", (userData) => {
      activeUsers.set(socket.id, userData);
      // If admin, join admin room
      if (userData.role === 'admin') {
        socket.join("admin_room");
      }
      // Send message history
      socket.emit("message:history", messages.filter(m => 
        userData.role === 'admin' || m.from.cnpj === userData.cnpj || m.to?.cnpj === userData.cnpj
      ));
    });

    socket.on("message:send", (messageData) => {
      const fullMessage = {
        ...messageData,
        id: Date.now().toString(),
        timestamp: new Date().toISOString()
      };
      messages.push(fullMessage);

      if (messageData.from.role === 'admin') {
        // Admin sending to specific user
        io.emit("message:receive", fullMessage);
      } else {
        // User sending to admin
        io.to("admin_room").emit("message:receive", fullMessage);
        // Also send back to the user themselves for UI update
        socket.emit("message:receive", fullMessage);
      }
    });

    socket.on("disconnect", () => {
      activeUsers.delete(socket.id);
      console.log("User disconnected:", socket.id);
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(process.cwd(), "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(process.cwd(), "dist", "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
