import express from 'express';
import cors from 'cors';
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { z } from "zod";

const PORT = process.env.PORT || 3000;
const app = express();

app.use(cors());

// NOTA: Abbiamo rimosso app.use(express.json()) per evitare che consumi lo stream di req

// Logging middleware per tracciare le chiamate
app.use((req, res, next) => {
    const timestamp = new Date().toISOString().split('T')[1].slice(0, 8);
    console.log(`[${timestamp}] [HTTP IN] ${req.method} ${req.url}`);
    next();
});

// Inizializzazione del Server MCP
const server = new McpServer({
    name: "azure-devops-mcp-mock",
    version: "1.0.0"
});

// Registrazione del Tool
server.tool(
    "get_todo",
    "Recupera i dati esatti di un todo del progetto JSONPlaceholder. Rispondi all'utente riportando ESCLUSIVAMENTE il titolo e lo stato restituiti dal tool, senza inventare dettagli aggiuntivi.", {
    // Usa z.coerce.number() invece di z.number()
    // Questo accetterà sia 3 (number) che "3" (stringa) convertendolo automaticamente
    id: z.coerce.number().describe("L'ID numerico del ticket da cercare (es. 1, 2, 3)")
},
    async ({ id }) => {
        console.log(`\n==================================================`);
        console.log(`[TOOL CALL] ---> ESECUZIONE 'get_mock_ticket' PER ID: ${id} (Tipo: ${typeof id})`);
        console.log(`==================================================\n`);

        try {
            console.log(`[TOOL CALL] Chiamata HTTP verso JsonPlaceholder...`);
            const response = await fetch(`https://jsonplaceholder.typicode.com/todos/${id}`);

            if (!response.ok) {
                throw new Error(`Risposta HTTP non valida: ${response.status}`);
            }

            const data = (await response.json()) as { title: string; completed: boolean };
            console.log(`[TOOL CALL] Dati ricevuti con successo:`, data);

            const resultText = `TICKET TROVATO (Simulazione Azure DevOps):\n- ID: ${id}\n- Titolo Task: ${data.title}\n- Stato Completamento: ${data.completed ? 'COMPLETATO' : 'IN LAVORAZIONE'}\n- Sorgente: API Mock JSONPlaceholder`;
            console.log(`[TOOL CALL] Restituzione risposta all'agente AI...`);
            return {
                content: [
                    {
                        type: "text",
                        text: resultText
                    }
                ]
            };
        } catch (error: any) {
            console.error(`[TOOL ERROR] Errore durante l'esecuzione del tool:`, error?.message || error);

            return {
                content: [
                    {
                        type: "text",
                        text: `Impossibile recuperare il ticket ${id}. Errore: ${error?.message || 'Sconosciuto'}`
                    }
                ]
            };
        }
    }
);

let transport: SSEServerTransport | null = null;

// Endpoint SSE
app.get('/sse', async (req, res) => {
    console.log("[LOG SSE] -> Nuova connessione GET /sse");

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
        console.log("[LOG SSE] -> Trasporto SSE connesso con successo!");
    } catch (err) {
        console.error("[ERROR SSE] -> Errore di connessione:", err);
    }

    req.on('close', async () => {
        console.log("[LOG SSE] -> Client disconnesso da /sse");
        try {
            await server.close();
        } catch (e) { }
        transport = null;
    });
});

// Endpoint POST per i messaggi del protocollo MCP
app.post('/message', async (req, res) => {
    console.log("[LOG MESSAGE] -> Ricevuta POST /message dal client!");

    if (!transport) {
        console.error("[ERROR MESSAGE] -> Trasporto SSE non attivo.");
        res.status(503).send('Connessione SSE non stabilita.');
        return;
    }

    try {
        // Passiamo direttamente req (lo stream non parsed) all'SDK
        await transport.handlePostMessage(req, res);
        console.log("[LOG MESSAGE] -> Messaggio POST elaborato con successo dall'SDK!");
    } catch (err) {
        console.error("[ERROR MESSAGE] -> Errore durante la gestione del messaggio POST:", err);
        if (!res.headersSent) {
            res.status(500).send('Errore interno.');
        }
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log("==================================================");
    console.log(`Server MCP in esecuzione su http://localhost:${PORT}`);
    console.log("==================================================");
});