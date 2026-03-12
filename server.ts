import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { createServer } from "http";
import { Server } from "socket.io";
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

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

  // Cleanup old messages every 10 minutes
  setInterval(async () => {
    if (!supabaseUrl || !supabaseAnonKey) return;
    
    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
    const { error } = await supabase
      .from('chat_messages')
      .delete()
      .lt('created_at', sixHoursAgo);
    
    if (error) {
      if (error.code !== 'PGRST116') { // Ignore "no rows" errors if that's the code
        console.error('Error cleaning up messages:', error);
      }
    } else {
      console.log('Cleaned up old messages (older than 6h)');
    }
  }, 10 * 60 * 1000);

  const activeUsers = new Map();

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("user:join", async (userData) => {
      activeUsers.set(socket.id, userData);
      
      // Join a room specific to the user's CNPJ
      if (userData.cnpj) {
        socket.join(`user_${userData.cnpj}`);
      }

      // If admin, join admin room
      if (userData.role === 'admin') {
        socket.join("admin_room");
      }

      // Send message history from Supabase
      if (supabaseUrl && supabaseAnonKey) {
        const { data: history, error } = await supabase
          .from('chat_messages')
          .select('*')
          .order('created_at', { ascending: true });

        if (!error && history) {
          const formattedHistory = history.map(m => ({
            id: m.id,
            text: m.text,
            timestamp: m.created_at,
            from: {
              cnpj: m.from_cnpj,
              username: m.from_username,
              role: m.from_role
            },
            to: m.to_cnpj ? {
              cnpj: m.to_cnpj,
              username: m.to_username
            } : null,
            attachment: m.attachment,
            attachmentType: m.attachment_type
          })).filter(m => 
            userData.role === 'admin' || m.from.cnpj === userData.cnpj || m.to?.cnpj === userData.cnpj
          );

          socket.emit("message:history", formattedHistory);
        } else if (error) {
          console.error('Error fetching chat history:', error);
          socket.emit("message:history", []);
        }
      } else {
        socket.emit("message:history", []);
      }
    });

    socket.on("message:send", async (messageData) => {
      const fullMessage = {
        ...messageData,
        id: Date.now().toString(),
        timestamp: new Date().toISOString()
      };

      // Save to Supabase
      if (supabaseUrl && supabaseAnonKey) {
        const { error } = await supabase
          .from('chat_messages')
          .insert([{
            id: fullMessage.id,
            from_cnpj: fullMessage.from.cnpj,
            from_username: fullMessage.from.username,
            from_role: fullMessage.from.role,
            to_cnpj: fullMessage.to?.cnpj || null,
            to_username: fullMessage.to?.username || null,
            text: fullMessage.text,
            attachment: fullMessage.attachment || null,
            attachment_type: fullMessage.attachmentType || null,
            created_at: fullMessage.timestamp
          }]);

        if (error) console.error('Error saving message to Supabase:', error);
      }

      if (messageData.from.role === 'admin') {
        // Admin sending to specific user
        if (messageData.to?.cnpj) {
          // Send to the specific user's room
          io.to(`user_${messageData.to.cnpj}`).emit("message:receive", fullMessage);
          // Also send to all admins so they see the reply in their history
          io.to("admin_room").emit("message:receive", fullMessage);
        } else {
          // Fallback: broadcast if no target
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
