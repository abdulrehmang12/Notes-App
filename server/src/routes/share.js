import { Router } from "express";
import { Document } from "../models/Document.js";

const router = Router();

router.get("/:shareId", async (req, res) => {
  const document = await Document.findOne({
    shareId: req.params.shareId,
    shareRole: { $in: ["viewer", "editor"] }
  }).populate("owner", "name email");

  if (!document) {
    return res.status(404).json({ message: "Shared document not found or link is disabled." });
  }

  res.json({ document, role: document.shareRole });
});

export default router;
