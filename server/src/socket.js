import { Server } from "socket.io";
import { Document } from "./models/Document.js";
import { getDocumentAccess, canEdit, canRead } from "./utils/access.js";
import { verifyToken } from "./utils/tokens.js";

function parseUserFromSocket(socket) {
  const token = socket.handshake.auth?.token;

  if (!token) {
    return null;
  }

  try {
    return verifyToken(token);
  } catch (_error) {
    return null;
  }
}

export function registerSocketServer(httpServer, corsOrigin) {
  const io = new Server(httpServer, {
    cors: {
      origin: corsOrigin,
      credentials: true
    }
  });

  io.on("connection", (socket) => {
    const user = parseUserFromSocket(socket);

    socket.on("join-document", async ({ documentId, shareId }, callback) => {
      try {
        const { document, role } = await getDocumentAccess({
          documentId,
          userId: user?.id,
          shareId
        });

        if (!document || !canRead(role)) {
          callback?.({ ok: false, message: "No access to this document." });
          return;
        }

        socket.data.documentId = document._id.toString();
        socket.data.role = role;
        socket.data.user = user || {
          id: socket.id,
          name: "Guest reader",
          email: ""
        };

        socket.join(document._id.toString());
        socket.to(document._id.toString()).emit("presence-joined", {
          id: socket.id,
          user: socket.data.user
        });

        callback?.({
          ok: true,
          role,
          document: {
            id: document._id,
            title: document.title,
            content: document.content
          }
        });
      } catch (error) {
        callback?.({ ok: false, message: error.message });
      }
    });

    socket.on("document-change", async ({ documentId, delta, content, plainText }) => {
      if (socket.data.documentId !== documentId || !canEdit(socket.data.role)) {
        return;
      }

      socket.to(documentId).emit("receive-change", {
        delta,
        user: socket.data.user
      });

      await Document.findByIdAndUpdate(documentId, {
        content,
        plainText: plainText || "",
        updatedAt: new Date()
      });
    });

    socket.on("cursor-change", ({ documentId, range, color }) => {
      if (socket.data.documentId !== documentId || !canRead(socket.data.role)) {
        return;
      }

      socket.to(documentId).emit("remote-cursor", {
        socketId: socket.id,
        user: socket.data.user,
        range,
        color
      });
    });

    socket.on("disconnect", () => {
      const documentId = socket.data.documentId;
      if (documentId) {
        socket.to(documentId).emit("presence-left", { socketId: socket.id });
      }
    });
  });

  return io;
}
