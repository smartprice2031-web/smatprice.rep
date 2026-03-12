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
      
      // Join a room specific to the user's CNPJ
      if (userData.cnpj) {
        socket.join(`user_${userData.cnpj}`);
      }

      // If admin, join admin room
      if (userData.role === 'admin') {
        socket.join("admin_room");
      }

      // Send message history
      // Admins see everything, users only see messages involving them
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
        if (messageData.to?.cnpj) {
          // Send to the specific user's room
          io.to(`user_${messageData.to.cnpj}`).emit("message:receive", fullMessage);
          // Also send to all admins so they see the reply in their history
          io.to("admin_room").emit("message:receive", fullMessage);
        } else {
          // Fallback: broadcast if no target (shouldn't happen with current UI)
          io.emit("message:receive", fullMessage);
        }
      } else {
        // User sending to admin
        io.to("admin_room").emit("message:receive", fullMessage);
        // Also send back to the user's own room (for sync across tabs)
        io.to(`user_${messageData.from.cnpj}`).emit("message:receive", fullMessage);
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
