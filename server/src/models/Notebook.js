import mongoose from "mongoose";
import { MemoryNotebook } from "./memory.js";

const memberSchema = new mongoose.Schema(
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

const notebookSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    members: [memberSchema],
    color: {
      type: String,
      default: "#496651"
    }
  },
  { timestamps: true }
);

export const Notebook = process.env.MEMORY_STORE === "true" ? MemoryNotebook : mongoose.model("Notebook", notebookSchema);
