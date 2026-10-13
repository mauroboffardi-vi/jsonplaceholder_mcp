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
server.registerTool(
    "get_users",
    {
        description: "Retrieve a single user by ID, or retrieve all users if no ID is provided. ",
        inputSchema: {
            id: z.coerce.number().optional().describe("Numeric ID of the user to look for (es. 1, 2, 3). if omitted, all users are returned"),
            username: z.string().optional().describe("Filter todos belonging to a specific username (e.g. 'Bret'). if omitted, no filter is applied")
        }
    },
    async ({ id, username }) => {
        console.log(`\n==================================================`);
        console.log(`[TOOL CALL] ---> RUN 'get_user' FOR ID: ${id}`);
        console.log(`[TOOL CALL] ---> https://jsonplaceholder.typicode.com/users/${id}`);
        console.log(`==================================================\n`);

        try {
            console.log(`[TOOL CALL] HTTP Call to JsonPlaceholder...`);
            var url = `https://jsonplaceholder.typicode.com/users/${id}`;
            if (id == undefined) {
                url = `https://jsonplaceholder.typicode.com/users`;
            }
            if (username !== undefined) {
                // If no ID, but userId is provided, append query parameters
                url = `https://jsonplaceholder.typicode.com/users?username=${username}`;
            }

            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`Invalid HTTP response status: ${response.status}`);
            }

            const data = (await response.json()) as { userId: number; title: string; completed: boolean };
            console.log(`[TOOL CALL] Data successfully received:`, data);

            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(data, null, 2)
                    }
                ]
            };
        } catch (error: any) {
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
    }
);



/**
 *         TOOL : GET TODO
 */
server.registerTool(
    "get_todos",
    {
        description: "Retrieve the data of all todos from the JSONPlaceholder project. if an id is provided, gets only that specific todo. ",
        inputSchema: {
            id: z.coerce.number().optional().describe("Numeric ID of the todo to look for (es. 1, 2, 3). if omitted, return all todos"),
            userId: z.coerce.number().optional().describe("Filter todos belonging to a specific user ID (e.g. 1). if omitted, no filter is applied")
        }
    },
    async ({ id, userId }) => {
        console.log(`\n==================================================`);
        console.log(`[TOOL CALL] ---> RUN 'get_todo' FOR ID: ${id} (Type: ${typeof id})`);
        console.log(`==================================================\n`);

        try {
            console.log(`[TOOL CALL] get_todo HTTP Call to JsonPlaceholder...`);

            let url = "https://jsonplaceholder.typicode.com/todos";

            if (id !== undefined) {
                // If ID is provided, target the specific item endpoint
                url = `https://jsonplaceholder.typicode.com/todos/${id}`;
            } else if (userId !== undefined) {
                // If no ID, but userId is provided, append query parameters
                url = `https://jsonplaceholder.typicode.com/todos?userId=${userId}`;
            }
            console.log(`[TOOL CALL] ${url}`);

            const response = await fetch(url);

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
                        text: JSON.stringify(data, null, 2)
                    }
                ]
            };
        } catch (error: any) {
            console.error(`[TOOL ERROR] tool execution error:`, error?.message || error);

            return {
                content: [
                    {
                        type: "text",
                        text: `it was not possible to find the todo with id = ${id}. Error: ${error?.message || 'unknown'}`
                    }
                ],
                isError: true
            };
        }
    }
);

/**
 *         TOOL : GET Albums
 */
server.registerTool(
    "get_albums",
    {
        description: "Retrieve the data of all albums from the JSONPlaceholder project. if an id is provided, gets only that specific album.",
        inputSchema: {
            id: z.coerce.number().optional().describe("Numeric ID of the album to look for (es. 1, 2, 3). if omitted, return all albums"),
            userId: z.coerce.number().optional().describe("Filter albums belonging to a specific user ID (e.g. 1). if omitted, no filter is applied")
        }
    },
    async ({ id, userId }) => {
        console.log(`\n==================================================`);
        console.log(`[TOOL CALL] ---> RUN 'get_album' FOR ID: ${id} (Type: ${typeof id})`);
        console.log(`==================================================\n`);

        try {
            console.log(`[TOOL CALL] get_todo HTTP Call to JsonPlaceholder...`);

            let url = "https://jsonplaceholder.typicode.com/albums";

            if (id !== undefined) {
                // If ID is provided, target the specific item endpoint
                url = `https://jsonplaceholder.typicode.com/albums/${id}`;
            } else if (userId !== undefined) {
                // If no ID, but userId is provided, append query parameters
                url = `https://jsonplaceholder.typicode.com/albums?userId=${userId}`;
            }
            console.log(`[TOOL CALL] ${url}`);

            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`Invalid HTTP response status: ${response.status}`);
            }

            const data = (await response.json());
            console.log(`[TOOL CALL] Data successfully received:`, JSON.stringify(data, null, 2));

            console.log(`[TOOL CALL] Returning answer to AI Agent...`);

            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(data, null, 2)
                    }
                ]
            };
        } catch (error: any) {
            console.error(`[TOOL ERROR] tool execution error:`, error?.message || error);

            return {
                content: [
                    {
                        type: "text",
                        text: `it was not possible to find the album with id = ${id}. Error: ${error?.message || 'unknown'}`
                    }
                ],
                isError: true
            };
        }
    }
);

/**
 *         TOOL : GET Album Photos
 */
server.registerTool(
    "get_photos",
    {
        description: "Retrieve the data of all photos from the JSONPlaceholder project. if an id is provided, gets only that specific photo. Photos belongs to an album",
        inputSchema: {
            /* edge case: getting ALL photos get a too big payload, so even if the API allows to get all photos at once, we make the id mandatory.
               the AI should filter per album */
            id: z.coerce.number().optional().describe("Numeric ID of the photo to look for (es. 1, 2, 3). If you want to get more photos at once, use the albumID filter. NEVER call this tool without either an id or an albumid."),
            albumId: z.coerce.number().optional().describe("Filter photos belonging to a specific album ID  (e.g. 1). if omitted, no filter is applied"),
            count: z.coerce.boolean().optional().describe("if true, the reponse will contain only the number of photos found, no additional data. default is false.")
        }
    },
    async ({ id, albumId, count }) => {
        console.log(`\n==================================================`);
        console.log(`[TOOL CALL] ---> RUN 'get_photos' FOR ID: ${id} (Type: ${typeof id})`);
        console.log(`==================================================\n`);

        try {
            console.log(`[TOOL CALL] get_todo HTTP Call to JsonPlaceholder...`);

            let url = `https://jsonplaceholder.typicode.com/photos/${id}`;

            if (count) {
                url = `https://jsonplaceholder.typicode.com/photos/`;
            }

            if (albumId !== undefined) {
                url = `https://jsonplaceholder.typicode.com/photos?albumId=${albumId}`;
            }
            console.log(`[TOOL CALL] ${url}`);

            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`Invalid HTTP response status: ${response.status}`);
            }

            const data = (await response.json());
            console.log(`[TOOL CALL] Data successfully received:`, JSON.stringify(data, null, 2));

            console.log(`[TOOL CALL] Returning answer to AI Agent...`);

            if (count) {
                const elementCount = Array.isArray(data) ? data.length : (data ? 1 : 0);
                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify({ count: elementCount })
                        }
                    ]
                }
            }
            else {
                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify(data, null, 2)
                        }
                    ]
                }
            };
        } catch (error: any) {
            console.error(`[TOOL ERROR] tool execution error:`, error?.message || error);

            return {
                content: [
                    {
                        type: "text",
                        text: `it was not possible to find the photo with id = ${id}. Error: ${error?.message || 'unknown'}`
                    }
                ],
                isError: true
            };
        }
    }
);

/**
 *         TOOL : GET Posts
 */
server.registerTool(
    "get_posts",
    {
        description: "Retrieve the data of all posts from the JSONPlaceholder project. if an id is provided, gets only that specific post.",
        inputSchema: {
            id: z.coerce.number().optional().describe("Numeric ID of the post to look for (es. 1, 2, 3). if omitted, return all posts"),
            userId: z.coerce.number().optional().describe("Filter posts belonging to a specific user ID (e.g. 1). if omitted, no filter is applied")
        }
    },
    async ({ id, userId }) => {
        console.log(`\n==================================================`);
        console.log(`[TOOL CALL] ---> RUN 'get_posts' FOR ID: ${id} (Type: ${typeof id})`);
        console.log(`==================================================\n`);

        try {
            console.log(`[TOOL CALL] get_todo HTTP Call to JsonPlaceholder...`);

            let url = "https://jsonplaceholder.typicode.com/posts";

            if (id !== undefined) {
                // If ID is provided, target the specific item endpoint
                url = `https://jsonplaceholder.typicode.com/posts/${id}`;
            } else if (userId !== undefined) {
                // If no ID, but userId is provided, append query parameters
                url = `https://jsonplaceholder.typicode.com/posts?userId=${userId}`;
            }
            console.log(`[TOOL CALL] ${url}`);

            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`Invalid HTTP response status: ${response.status}`);
            }

            const data = (await response.json());
            console.log(`[TOOL CALL] Data successfully received:`, JSON.stringify(data, null, 2));

            console.log(`[TOOL CALL] Returning answer to AI Agent...`);

            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(data, null, 2)
                    }
                ]
            };
        } catch (error: any) {
            console.error(`[TOOL ERROR] tool execution error:`, error?.message || error);

            return {
                content: [
                    {
                        type: "text",
                        text: `it was not possible to find the post with id = ${id}. Error: ${error?.message || 'unknown'}`
                    }
                ],
                isError: true
            };
        }
    }
);

/**
 *         TOOL : GET Comments from Posts
 */
server.registerTool(
    "get_comments",
    {
        description: "Retrieve the data of all comments from the JSONPlaceholder project. if an id is provided, gets only that specific comment. comments have an id, a postId that specifies the posts they belongs to, the body with the actual text of the comment, and name and email of the person that left the comment",
        inputSchema: {
            id: z.coerce.number().optional().describe("Numeric ID of the comment to look for (es. 1, 2, 3). if omitted, return all comments"),
            postId: z.coerce.number().optional().describe("Filter posts belonging to a specific post (e.g. 1). if omitted, no filter is applied")
        }
    },
    async ({ id, postId }) => {
        console.log(`\n==================================================`);
        console.log(`[TOOL CALL] ---> RUN 'get_posts' FOR ID: ${id} (Type: ${typeof id})`);
        console.log(`==================================================\n`);

        try {
            console.log(`[TOOL CALL] get_todo HTTP Call to JsonPlaceholder...`);

            let url = "https://jsonplaceholder.typicode.com/comments";

            if (id !== undefined) {
                // If ID is provided, target the specific item endpoint
                url = `https://jsonplaceholder.typicode.com/comments/${id}`;
            }
            if (postId !== undefined) {
                // If no ID, but userId is provided, append query parameters
                url = `https://jsonplaceholder.typicode.com/comments?postId=${postId}`;
            }
            console.log(`[TOOL CALL] ${url}`);

            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`Invalid HTTP response status: ${response.status}`);
            }

            const data = (await response.json());
            console.log(`[TOOL CALL] Data successfully received:`, JSON.stringify(data, null, 2));

            console.log(`[TOOL CALL] Returning answer to AI Agent...`);

            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(data, null, 2)
                    }
                ]
            };
        } catch (error: any) {
            console.error(`[TOOL ERROR] tool execution error:`, error?.message || error);

            return {
                content: [
                    {
                        type: "text",
                        text: `it was not possible to find the comment with id = ${id}. Error: ${error?.message || 'unknown'}`
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

    // 🟢 KEEP-ALIVE (HEARTBEAT): Sends a keepalive comment (comments starts with ":") to avoid ReadTimeout from the MCP Client
    const keepAliveInterval = setInterval(() => {
        if (!res.writableEnded) {
            console.log("keep-alive...");
            // a comment keeps the TCP/HTTP open.
            res.write(': keep-alive\n\n');
        }
    }, 30000);

    req.on('close', async () => {
        console.log("[LOG SSE] -> Client disconnected from /sse");
        // 🔴 Clear the interval when the client disconnects
        clearInterval(keepAliveInterval);

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