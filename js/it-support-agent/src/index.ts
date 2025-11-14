import { createGraph } from "./graph";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import swaggerJsdoc from "swagger-jsdoc";
import type { Options } from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

const swaggerOptions: Options = {
  definition: {
    openapi: "3.1.0",
    info: {
      title: "IT Support AI Agent API",
      version: "1.0.0",
      description:
        "API documentation for interacting with the IT Support AI Agent built with LangGraph."
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: "Local development server"
      }
    ],
    components: {
      schemas: {
        ChatRequest: {
          type: "object",
          required: ["message"],
          properties: {
            message: {
              type: "string",
              description: "End-user message to send to the IT Support AI agent"
            },
            sender: {
              type: "string",
              description: "Email address identifying the message originator",
              example: "user@company.com"
            }
          }
        },
        ChatResponse: {
          type: "object",
          properties: {
            success: {
              type: "boolean"
            },
            response: {
              type: "object",
              description: "Raw response returned by the LangGraph engine"
            },
            originalMessage: {
              type: "string"
            },
            sender: {
              type: "string"
            }
          }
        },
        ErrorResponse: {
          type: "object",
          properties: {
            error: {
              type: "string"
            },
            message: {
              type: "string"
            }
          }
        }
      }
    },
    paths: {
      "/health": {
        get: {
          summary: "Health check",
          description: "Check whether the IT Support AI Agent server is running.",
          responses: {
            "200": {
              description: "Server is healthy"
            }
          }
        }
      },
      "/chat": {
        post: {
          summary: "Send a message to the IT Support AI Agent",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ChatRequest"
                }
              }
            }
          },
          responses: {
            "200": {
              description: "Successful response from the AI agent",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/ChatResponse"
                  }
                }
              }
            },
            "400": {
              description: "Invalid request payload",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/ErrorResponse"
                  }
                }
              }
            },
            "500": {
              description: "Internal server error",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/ErrorResponse"
                  }
                }
              }
            }
          }
        }
      }
    }
  },
  apis: []
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Initialize the graph
const graph = createGraph();

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "OK", message: "IT Support AI Agent is running" });
});

// Main endpoint to handle user requests
app.post("/chat", async (req, res) => {
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