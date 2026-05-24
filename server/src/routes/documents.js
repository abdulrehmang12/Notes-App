import { Router } from "express";
import { nanoid } from "nanoid";
import { z } from "zod";
import { Document } from "../models/Document.js";
import { User } from "../models/User.js";
import { requireAuth } from "../middleware/auth.js";
import { canEdit, canRead, getDocumentAccess } from "../utils/access.js";

const router = Router();

router.use(requireAuth);

router.get("/:id", async (req, res) => {
  const { document, role } = await getDocumentAccess({
    documentId: req.params.id,
    userId: req.user._id
  });

  if (!document) {
    return res.status(404).json({ message: "Document not found." });
  }

  if (!canRead(role)) {
    return res.status(403).json({ message: "You do not have access to this document." });
  }

  await document.populate("owner", "name email");
  await document.populate("collaborators.user", "name email");
  res.json({ document, role });
});

router.patch("/:id", async (req, res) => {
  const schema = z.object({
    title: z.string().trim().min(1).max(140).optional(),
    content: z.unknown().optional(),
    plainText: z.string().max(100000).optional()
  });
  const result = schema.safeParse(req.body);
  const { document, role } = await getDocumentAccess({
    documentId: req.params.id,
    userId: req.user._id
  });

  if (!document) {
    return res.status(404).json({ message: "Document not found." });
  }

  if (!canEdit(role)) {
    return res.status(403).json({ message: "You need edit access to update this document." });
  }

  if (!result.success) {
    return res.status(400).json({ message: "Invalid document update." });
  }

  Object.assign(document, result.data);
  await document.save();
  res.json({ document, role });
});

router.delete("/:id", async (req, res) => {
  const { document, role } = await getDocumentAccess({
    documentId: req.params.id,
    userId: req.user._id
  });

  if (!document) {
    return res.status(404).json({ message: "Document not found." });
  }

  if (role !== "owner") {
    return res.status(403).json({ message: "Only the owner can delete this document." });
  }

  await document.deleteOne();
  res.status(204).end();
});

router.put("/:id/share", async (req, res) => {
  const schema = z.object({
    shareRole: z.enum(["off", "viewer", "editor"])
  });
  const result = schema.safeParse(req.body);
  const { document, role } = await getDocumentAccess({
    documentId: req.params.id,
    userId: req.user._id
  });

  if (!document) {
    return res.status(404).json({ message: "Document not found." });
  }

  if (role !== "owner") {
    return res.status(403).json({ message: "Only the owner can change sharing." });
  }

  if (!result.success) {
    return res.status(400).json({ message: "Choose a valid share permission." });
  }

  document.shareRole = result.data.shareRole;
  if (result.data.shareRole === "off") {
    document.shareId = undefined;
  } else if (!document.shareId) {
    document.shareId = nanoid(12);
  }

  await document.save();
  res.json({ shareId: document.shareId, shareRole: document.shareRole });
});

router.post("/:id/collaborators", async (req, res) => {
  const schema = z.object({
    email: z.string().trim().email().toLowerCase(),
    role: z.enum(["viewer", "editor"])
  });
  const result = schema.safeParse(req.body);
  const { document, role } = await getDocumentAccess({
    documentId: req.params.id,
    userId: req.user._id
  });

  if (!document) {
    return res.status(404).json({ message: "Document not found." });
  }

  if (role !== "owner") {
    return res.status(403).json({ message: "Only the owner can add collaborators." });
  }

  if (!result.success) {
    return res.status(400).json({ message: "Provide a valid collaborator email and role." });
  }

  const collaboratorUser = await User.findOne({ email: result.data.email });
  if (!collaboratorUser) {
    return res.status(404).json({ message: "No user exists for that email." });
  }

  if (collaboratorUser._id.equals(document.owner)) {
    return res.status(400).json({ message: "The owner already has full access." });
  }

  const existing = document.collaborators.find((entry) => entry.user.equals(collaboratorUser._id));
  if (existing) {
    existing.role = result.data.role;
  } else {
    document.collaborators.push({ user: collaboratorUser._id, role: result.data.role });
  }

  await document.save();
  await document.populate("collaborators.user", "name email");
  res.json({ document });
});

export default router;
