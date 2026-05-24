import mongoose from "mongoose";

export async function connectDatabase(uri) {
  if (process.env.MEMORY_STORE === "true") {
    console.log("In-process dev data store enabled");
    return;
  }

  mongoose.set("strictQuery", true);
  await mongoose.connect(uri);
  console.log("MongoDB connected");
}
