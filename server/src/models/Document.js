import mongoose from "mongoose";
import { MemoryDocument } from "./memory.js";

const collaboratorSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    role: {
      type: String,
      enum: ["viewer", "editor"],
      default: "viewer"
    }
  },
  { _id: false }
);

const documentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 140
    },
    notebook: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Notebook",
      required: true
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    content: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({ ops: [{ insert: "\n" }] })
    },
    plainText: {
      type: String,
      default: ""
    },
    shareId: {
      type: String,
      unique: true,
      sparse: true
    },
    shareRole: {
      type: String,
      enum: ["off", "viewer", "editor"],
      default: "off"
    },
    collaborators: [collaboratorSchema]
  },
  { timestamps: true }
);

export const Document = process.env.MEMORY_STORE === "true" ? MemoryDocument : mongoose.model("Document", documentSchema);
