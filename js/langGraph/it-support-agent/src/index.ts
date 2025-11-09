import { createGraph } from "./graph";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize the graph
const graph = createGraph();

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "OK", message: "IT Support AI Agent is running" });
});

// Main endpoint to handle user requests
app.post("/support", async (req, res) => {
  try {
    const { message, sender = "user@company.com" } = req.body;
    
    if (!message) {
      return res.status(400).json({ 
        error: "Message is required" 
      });
    }

    console.log(`Processing request from ${sender}: ${message}`);

    // Invoke the graph with the user's message
    const response = await graph.invoke({
      message: {
        sender,
        message,
      },
    });

    console.log("Response:", response);

    res.json({
      success: true,
      response,
      originalMessage: message,
      sender
    });

  } catch (error) {
    console.error("Error processing request:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`🚀 IT Support AI Agent server running on port ${PORT}`);
  console.log(`📝 Send POST requests to http://localhost:${PORT}/support`);
  console.log(`🔍 Health check: http://localhost:${PORT}/health`);
});