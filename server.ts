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

// Initialize Supabase only if credentials are provided
const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    path: "/socket.io/",
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
      credentials: true
    },
    transports: ['polling', 'websocket'],
    allowEIO3: true,
    maxHttpBufferSize: 1e8 // 100mb for attachments
  });

  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // In-memory fallback for the last 100 messages
  let inMemoryMessages: any[] = [];

  // Cleanup old messages every 10 minutes
  setInterval(async () => {
    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
    
    // Cleanup in-memory
    inMemoryMessages = inMemoryMessages.filter(m => new Date(m.timestamp) > sixHoursAgo);

    // Cleanup Supabase
    if (supabase) {
      try {
        const { error } = await supabase
          .from('chat_messages')
          .delete()
          .lt('created_at', sixHoursAgo.toISOString());
        
        if (error && error.code !== 'PGRST116') {
          console.error('Error cleaning up Supabase messages:', error);
        }
      } catch (err) {
        console.error('Supabase cleanup exception:', err);
      }
    }
  }, 10 * 60 * 1000);

  const activeUsers = new Map();

  io.on("connection", (socket) => {
    console.log("New socket connection attempt:", socket.id);

    socket.on("error", (err) => {
      console.error("Socket error for", socket.id, ":", err);
    });

    socket.on("user:join", async (userData) => {
      console.log("User joined chat:", userData.username, userData.cnpj, "Role:", userData.role);
      activeUsers.set(socket.id, userData);
      
      if (userData.cnpj) {
        socket.join(`user_${userData.cnpj}`);
      }

      if (userData.role === 'admin') {
        socket.join("admin_room");
      }

      let history: any[] = [];

      // Try to load from Supabase first
      if (supabase) {
        try {
          const { data, error } = await supabase
            .from('chat_messages')
            .select('*')
            .order('created_at', { ascending: true });

          if (!error && data) {
            history = data.map(m => ({
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
            }));
          }
        } catch (err) {
          console.error('Error fetching Supabase history:', err);
        }
      }

      // Merge with in-memory (and remove duplicates)
      const combinedHistory = [...history, ...inMemoryMessages];
      const uniqueHistory = Array.from(new Map(combinedHistory.map(m => [m.id, m])).values())
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      // Filter for the specific user
      const filteredHistory = uniqueHistory.filter(m => 
        userData.role === 'admin' || m.from.cnpj === userData.cnpj || m.to?.cnpj === userData.cnpj
      );

      socket.emit("message:history", filteredHistory);
    });

    socket.on("message:send", async (messageData) => {
      const fullMessage = {
        ...messageData,
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString()
      };

      // Store in-memory
      inMemoryMessages.push(fullMessage);
      if (inMemoryMessages.length > 500) inMemoryMessages.shift();

      // Store in Supabase
      if (supabase) {
        try {
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

          if (error) console.error('Supabase insert error:', error);
        } catch (err) {
          console.error('Supabase insert exception:', err);
        }
      }

      // Route message
      if (messageData.from.role === 'admin') {
        if (messageData.to?.cnpj) {
          // Send to user and all admins
          io.to(`user_${messageData.to.cnpj}`).emit("message:receive", fullMessage);
          io.to("admin_room").emit("message:receive", fullMessage);
        } else {
          // Broadcast to everyone if no target
          io.emit("message:receive", fullMessage);
        }
      } else {
        // Send to all admins and back to the user's rooms
        io.to("admin_room").emit("message:receive", fullMessage);
        io.to(`user_${messageData.from.cnpj}`).emit("message:receive", fullMessage);
      }
    });

    socket.on("disconnect", () => {
      activeUsers.delete(socket.id);
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
