import express from 'express';
import cors from 'cors';
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { z } from "zod";

const PORT = Number(process.env.PORT) || 3000;
const app = express();

app.use(cors());

// Logging middleware to track calls
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [HTTP IN] ${req.method} ${req.url}`);
    next();
});

// Initializing the MCP Server
const server = new McpServer({
    name: "azure-devops-mcp-mock",
    version: "1.0.0"
});

// Registering the Tool
// Registering the Tool using the updated SDK method (registerTool)
server.registerTool(
    "get_todo",
    {
        description: "Retrieve the data of a todo from the JSONPlaceholder project. Reply to the user using ONLY  title and status retrieved from the tool, without adding inferred dettails.",
        inputSchema: {
            id: z.coerce.number().describe("Numeric ID of the todo to look for (es. 1, 2, 3)")
        }
    },
    async ({ id }) => {
        console.log(`\n==================================================`);
        console.log(`[TOOL CALL] ---> RUN 'get_todo' FOR ID: ${id} (Type: ${typeof id})`);
        console.log(`==================================================\n`);

        try {
            console.log(`[TOOL CALL] HTTP Call to JsonPlaceholder...`);
            const response = await fetch(`https://jsonplaceholder.typicode.com/todos/${id}`);

            if (!response.ok) {
                throw new Error(`Invalid HTTP response status: ${response.status}`);
            }

            const data = (await response.json()) as { userId: number; title: string; completed: boolean };
            console.log(`[TOOL CALL] Data successfully received:`, data);

            const resultText = `TODO FOUND:\n- User:${data.userId} - ID: ${id}\n- Title: ${data.title}\n- State: ${data.completed ? 'COMPLETED' : 'OPEN'}\n- Source: API Mock JSONPlaceholder`;
            console.log(`[TOOL CALL] Returning answer to AI Agent...`);

            return {
                content: [
                    {
                        type: "text",
                        text: resultText
                    }
                ]
            };
        } catch (error: any) {
            console.error(`[TOOL ERROR] tool execution error:`, error?.message || error);

            return {
                content: [
                    {
                        type: "text",
                        text: `it was not possible to find the ticket with id = ${id}. Error: ${error?.message || 'unknown'}`
                    }
                ],
                isError: true
            };
        }
    }
);

let transport: SSEServerTransport | null = null;

// Endpoint SSE
app.get('/sse', async (req, res) => {
    console.log("[LOG SSE] -> New connection GET /sse");

    if (transport) {
        try {
            await transport.close();
        } catch (e) { }
    }

    try {
        await server.close();
    } catch (e) { }

    const messageUrl = `http://127.0.0.1:${PORT}/message`;
    transport = new SSEServerTransport(messageUrl, res);

    try {
        await server.connect(transport);
        console.log("[LOG SSE] -> SSE transport connected!");
    } catch (err) {
        console.error("[ERROR SSE] -> Connection error:", err);
    }

    req.on('close', async () => {
        console.log("[LOG SSE] -> Client disconneted from /sse");
        try {
            await server.close();
        } catch (e) { }
        transport = null;
    });
});

// Endpoint POST per i messaggi del protocollo MCP
app.post('/message', async (req, res) => {
    console.log("[LOG MESSAGE] -> Received POST /message from client!");

    if (!transport) {
        console.error("[ERROR MESSAGE] -> SSE transport not active.");
        res.status(503).send('SSE connection failed.');
        return;
    }

    try {
        await transport.handlePostMessage(req, res);
        console.log("[LOG MESSAGE] -> POST Message successfully processed");
    } catch (err) {
        console.error("[ERROR MESSAGE] -> Error while processing POST:", err);
        if (!res.headersSent) {
            res.status(500).send('Internal Error.');
        }
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log("==================================================");
    console.log(`Server MCP running on http://localhost:${PORT}`);
    console.log("==================================================");
});