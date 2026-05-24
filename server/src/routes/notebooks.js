import { Router } from "express";
import { z } from "zod";
import { Notebook } from "../models/Notebook.js";
import { Document } from "../models/Document.js";
import { User } from "../models/User.js";
import { requireAuth } from "../middleware/auth.js";
import { canEdit, canRead, getNotebookRole } from "../utils/access.js";

const router = Router();

router.use(requireAuth);

const notebookSchema = z.object({
  name: z.string().trim().min(1).max(100),
  color: z.string().trim().min(4).max(20).optional()
});

router.get("/", async (req, res) => {
  const notebooks = await Notebook.find({
    $or: [{ owner: req.user._id }, { "members.user": req.user._id }]
  })
    .sort({ updatedAt: -1 })
    .populate("owner", "name email")
    .populate("members.user", "name email");

  res.json({ notebooks });
});

router.post("/", async (req, res) => {
  const result = notebookSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({ message: "Notebook name is required." });
  }

  const notebook = await Notebook.create({
    ...result.data,
    owner: req.user._id
  });

  res.status(201).json({ notebook });
});

router.patch("/:id", async (req, res) => {
  const result = notebookSchema.partial().safeParse(req.body);
  const { notebook, role } = await getNotebookRole(req.params.id, req.user._id);

  if (!notebook) {
    return res.status(404).json({ message: "Notebook not found." });
  }

  if (role !== "owner") {
    return res.status(403).json({ message: "Only the owner can update this notebook." });
  }

  if (!result.success) {
    return res.status(400).json({ message: "Invalid notebook data." });
  }

  Object.assign(notebook, result.data);
  await notebook.save();
  res.json({ notebook });
});

router.delete("/:id", async (req, res) => {
  const { notebook, role } = await getNotebookRole(req.params.id, req.user._id);

  if (!notebook) {
    return res.status(404).json({ message: "Notebook not found." });
  }

  if (role !== "owner") {
    return res.status(403).json({ message: "Only the owner can delete this notebook." });
  }

  await Document.deleteMany({ notebook: notebook._id });
  await notebook.deleteOne();
  res.status(204).end();
});

router.post("/:id/members", async (req, res) => {
  const schema = z.object({
    email: z.string().trim().email().toLowerCase(),
    role: z.enum(["viewer", "editor"])
  });
  const result = schema.safeParse(req.body);
  const { notebook, role } = await getNotebookRole(req.params.id, req.user._id);

  if (!notebook) {
    return res.status(404).json({ message: "Notebook not found." });
  }

  if (role !== "owner") {
    return res.status(403).json({ message: "Only the owner can add notebook members." });
  }

  if (!result.success) {
    return res.status(400).json({ message: "Provide a valid member email and role." });
  }

  const memberUser = await User.findOne({ email: result.data.email });
  if (!memberUser) {
    return res.status(404).json({ message: "No user exists for that email." });
  }

  if (memberUser._id.equals(notebook.owner)) {
    return res.status(400).json({ message: "The owner already has full access." });
  }

  const existing = notebook.members.find((member) => member.user.equals(memberUser._id));
  if (existing) {
    existing.role = result.data.role;
  } else {
    notebook.members.push({ user: memberUser._id, role: result.data.role });
  }

  await notebook.save();
  await notebook.populate("members.user", "name email");
  res.json({ notebook });
});

router.get("/:id/documents", async (req, res) => {
  const { notebook, role } = await getNotebookRole(req.params.id, req.user._id);

  if (!notebook) {
    return res.status(404).json({ message: "Notebook not found." });
  }

  if (!canRead(role)) {
    return res.status(403).json({ message: "You do not have access to this notebook." });
  }

  const documents = await Document.find({ notebook: notebook._id })
    .select("title plainText updatedAt createdAt shareRole")
    .sort({ updatedAt: -1 });

  res.json({ documents, role });
});

router.post("/:id/documents", async (req, res) => {
  const schema = z.object({
    title: z.string().trim().min(1).max(140)
  });
  const result = schema.safeParse(req.body);
  const { notebook, role } = await getNotebookRole(req.params.id, req.user._id);

  if (!notebook) {
    return res.status(404).json({ message: "Notebook not found." });
  }

  if (!canEdit(role)) {
    return res.status(403).json({ message: "You need edit access to create documents here." });
  }

  if (!result.success) {
    return res.status(400).json({ message: "Document title is required." });
  }

  const document = await Document.create({
    title: result.data.title,
    notebook: notebook._id,
    owner: req.user._id
  });

  res.status(201).json({ document });
});

export default router;
