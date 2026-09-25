import express from 'express';
import cors from 'cors';
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { z } from "zod";
const app = express();
app.use(cors());
// 1. Inizializzazione del Server MCP
const server = new McpServer({
    name: "azure-devops-mcp-mock",
    version: "1.0.0"
});
// 2. Registrazione dello strumento fittizio
server.tool("mock_ticket_retrieval", "Recupera i dettagli di un ticket fittizio usando JsonPlaceholder (simula un Work Item di Azure)", {
    id: z.number().describe("L'ID numerico del ticket da cercare (es. 1, 2, 3)")
}, async ({ id }) => {
    console.log(`[LOG] Richiesto ticket fittizio con ID: ${id}`);
    try {
        const response = await fetch(`https://jsonplaceholder.typicode.com/todos/${id}`);
        if (!response.ok) {
            throw new Error(`Errore HTTP: ${response.status}`);
        }
        const data = await response.json();
        return {
            content: [{
                    type: "text",
                    text: `Dettagli del Ticket Simulato:\nTitolo: ${data.title}\nStato Completamento: ${data.completed ? 'Completato' : 'In lavorazione'}`
                }]
        };
    }
    catch (error) {
        console.error("[ERRORE]", error);
        return {
            content: [{ type: "text", text: "Errore durante il recupero del ticket." }],
            isError: true
        };
    }
});
// 3. Configurazione del Trasporto SSE con Express
const PORT = process.env.PORT || 3000;
let transport = null;
app.get('/sse', async (req, res) => {
    // 1. Se il server MCP ha già un trasporto agganciato, chiudiamo la sua istanza
    try {
        await server.close();
    }
    catch (error) {
        // Ignoriamo l'errore in modo silente se non c'era nessuna connessione attiva
    }
    // 2. Inizializziamo il nuovo trasporto con l'URL assoluto
    const messageUrl = `http://localhost:${PORT}/message`;
    transport = new SSEServerTransport(messageUrl, res);
    // 3. Connettiamo il trasporto al server
    await server.connect(transport);
    console.log("[LOG] Client MCP connesso con successo tramite SSE.");
    // 4. FONDAMENTALE: Ascoltiamo la disconnessione del client per liberare il server
    req.on('close', async () => {
        console.log("[LOG] Rilevata disconnessione del client. Pulisco lo stato...");
        try {
            await server.close();
        }
        catch (e) { }
        transport = null;
    });
});
app.post('/message', async (req, res) => {
    if (!transport) {
        res.status(503).send('Connessione SSE non ancora stabilita.');
        return;
    }
    await transport.handlePostMessage(req, res);
});
app.listen(PORT, () => {
    console.log(`Server in esecuzione su http://localhost:${PORT}`);
});
//# sourceMappingURL=index.js.map