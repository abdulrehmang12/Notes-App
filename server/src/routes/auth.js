import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { User } from "../models/User.js";
import { Notebook } from "../models/Notebook.js";
import { Document } from "../models/Document.js";
import { signToken } from "../utils/tokens.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

const authSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  email: z.string().trim().email().toLowerCase(),
  password: z.string().min(8).max(128)
});

router.post("/signup", async (req, res) => {
  const result = authSchema.required({ name: true }).safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({ message: "Please provide a valid name, email, and password." });
  }

  const existing = await User.findOne({ email: result.data.email });
  if (existing) {
    return res.status(409).json({ message: "An account already exists for this email." });
  }

  const passwordHash = await bcrypt.hash(result.data.password, 12);
  const user = await User.create({
    name: result.data.name,
    email: result.data.email,
    passwordHash
  });

  res.status(201).json({ token: signToken(user), user });
});

router.post("/login", async (req, res) => {
  const result = authSchema.omit({ name: true }).safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({ message: "Please provide a valid email and password." });
  }

  const user = await User.findOne({ email: result.data.email });
  const passwordMatches = user ? await bcrypt.compare(result.data.password, user.passwordHash) : false;

  if (!user || !passwordMatches) {
    return res.status(401).json({ message: "Invalid email or password." });
  }

  res.json({ token: signToken(user), user });
});

router.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

router.patch("/me", requireAuth, async (req, res) => {
  const schema = z.object({
    name: z.string().trim().min(2).max(80).optional(),
    email: z.string().trim().email().toLowerCase().optional(),
    currentPassword: z.string().optional(),
    password: z.string().min(8).max(128).optional()
  });
  const result = schema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({ message: "Provide valid account details." });
  }

  if (result.data.email && result.data.email !== req.user.email) {
    const existing = await User.findOne({ email: result.data.email });
    if (existing) {
      return res.status(409).json({ message: "That email is already in use." });
    }
    req.user.email = result.data.email;
  }

  if (result.data.name) {
    req.user.name = result.data.name;
  }

  if (result.data.password) {
    const passwordMatches = await bcrypt.compare(result.data.currentPassword || "", req.user.passwordHash);
    if (!passwordMatches) {
      return res.status(401).json({ message: "Current password is required to change your password." });
    }
    req.user.passwordHash = await bcrypt.hash(result.data.password, 12);
  }

  await req.user.save();
  res.json({ token: signToken(req.user), user: req.user });
});

router.delete("/me", requireAuth, async (req, res) => {
  const schema = z.object({
    currentPassword: z.string().min(1),
    confirmation: z.literal("DELETE")
  });
  const result = schema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({ message: "Enter your password and DELETE to confirm." });
  }

  const passwordMatches = await bcrypt.compare(result.data.currentPassword, req.user.passwordHash);
  if (!passwordMatches) {
    return res.status(401).json({ message: "Password does not match." });
  }

  const ownedNotebooks = await Notebook.find({ owner: req.user._id });
  await Document.deleteMany({
    $or: [{ owner: req.user._id }, { notebook: { $in: ownedNotebooks.map((notebook) => notebook._id) } }]
  });
  await Notebook.deleteMany({ owner: req.user._id });

  const memberNotebooks = await Notebook.find({ "members.user": req.user._id });
  for (const notebook of memberNotebooks) {
    notebook.members = notebook.members.filter((member) => !member.user.equals(req.user._id));
    await notebook.save();
  }

  const collaboratorDocs = await Document.find({ "collaborators.user": req.user._id });
  for (const document of collaboratorDocs) {
    document.collaborators = document.collaborators.filter((collaborator) => !collaborator.user.equals(req.user._id));
    await document.save();
  }

  await req.user.deleteOne();
  res.status(204).end();
});

export default router;
