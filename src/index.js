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
/**
 *         TOOL : GET a USER or a list of USERS
 */
server.registerTool("get_user", {
    description: "Retrieve a single user by ID, or retrieve all users if no ID is provided. Reply by providing ONLY data available in the response, without adding inferred dettails.",
    inputSchema: {
        id: z.coerce.number().optional().describe("Numeric ID of the user to look for (es. 1, 2, 3). if omitted, all users are returned")
    }
}, async ({ id }) => {
    console.log(`\n==================================================`);
    console.log(`[TOOL CALL] ---> RUN 'get_user' FOR ID: ${id}`);
    console.log(`[TOOL CALL] ---> https://jsonplaceholder.typicode.com/users/${id}`);
    console.log(`==================================================\n`);
    try {
        console.log(`[TOOL CALL] HTTP Call to JsonPlaceholder...`);
        var url = `https://jsonplaceholder.typicode.com/users/${id}`;
        if (id == 0) {
            url = `https://jsonplaceholder.typicode.com/users`;
        }
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Invalid HTTP response status: ${response.status}`);
        }
        const data = (await response.json());
        console.log(`[TOOL CALL] Data successfully received:`, data);
        let resultText = "";
        if (Array.isArray(data)) {
            // Response from /todos or /todos?userId=X
            if (data.length === 0) {
                resultText = "No todos found matching the criteria.";
            }
            else {
                const formattedList = data
                    .map((todo) => `- Todo #${todo.id} | Title: ${todo.title} | UserId: ${todo.userId} | Status: ${todo.completed ? 'COMPLETED' : 'OPEN'}`)
                    .join("\n");
                resultText = `TODOS FOUND (${data.length}):\n${formattedList}`;
            }
        }
        else {
            // Single object response from /todos/:id
            resultText = `TODO FOUND:\n- Title: ${data.title}\n- Status: ${data.completed ? 'COMPLETED' : 'OPEN'}`;
        }
        return {
            content: [
                {
                    type: "text",
                    text: resultText
                }
            ]
        };
    }
    catch (error) {
        console.error(`[TOOL ERROR] tool execution error:`, error?.message || error);
        return {
            content: [
                {
                    type: "text",
                    text: `it was not possible to find the user with id = ${id}. Error: ${error?.message || 'unknown'}`
                }
            ],
            isError: true
        };
    }
});
/**
 *         TOOL : GET a single TODO
 */
server.registerTool("get_todo", {
    description: "Retrieve the data of all todos from the JSONPlaceholder project. if an id is provided, gets only that specific todo. Reply to the user using ONLY  title and status retrieved from the tool, without adding inferred dettails.",
    inputSchema: {
        id: z.coerce.number().optional().describe("Numeric ID of the todo to look for (es. 1, 2, 3). if omitted, return all todos"),
        userId: z.coerce.number().optional().describe("Filter todos belonging to a specific user ID (e.g. 1). if omitted, no filter is applied")
    }
}, async ({ id, userId }) => {
    console.log(`\n==================================================`);
    console.log(`[TOOL CALL] ---> RUN 'get_todo' FOR ID: ${id} (Type: ${typeof id})`);
    console.log(`==================================================\n`);
    try {
        console.log(`[TOOL CALL] get_todo HTTP Call to JsonPlaceholder...`);
        let url = "https://jsonplaceholder.typicode.com/todos";
        if (id !== 0) {
            // If ID is provided, target the specific item endpoint
            url = `https://jsonplaceholder.typicode.com/todos/${id}`;
        }
        else if (userId !== 0) {
            // If no ID, but userId is provided, append query parameters
            url = `https://jsonplaceholder.typicode.com/todos?userId=${userId}`;
        }
        console.log(`[TOOL CALL] ${url}`);
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Invalid HTTP response status: ${response.status}`);
        }
        const data = (await response.json());
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
    }
    catch (error) {
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
});
let transport = null;
// Endpoint SSE
app.get('/sse', async (req, res) => {
    console.log("[LOG SSE] -> New connection GET /sse");
    if (transport) {
        try {
            await transport.close();
        }
        catch (e) { }
    }
    try {
        await server.close();
    }
    catch (e) { }
    const messageUrl = `http://127.0.0.1:${PORT}/message`;
    transport = new SSEServerTransport(messageUrl, res);
    try {
        await server.connect(transport);
        console.log("[LOG SSE] -> SSE transport connected!");
    }
    catch (err) {
        console.error("[ERROR SSE] -> Connection error:", err);
    }
    req.on('close', async () => {
        console.log("[LOG SSE] -> Client disconneted from /sse");
        try {
            await server.close();
        }
        catch (e) { }
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
    }
    catch (err) {
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
//# sourceMappingURL=index.js.map