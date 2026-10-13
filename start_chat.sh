#!/bin/sh

#
# Before first use, register the mcp tool:
# ollmcp mcp add --transport sse JSONP http://localhost:3000/sse
# 
# if you need to remove the server, use
# ollmcp mcp remove JSONP --scope local
#
# to list registered ollmcp servers:
# ollmcp mcp list

# Starts the chat. The chat model has to be active in ollama
ollmcp --model qwen3:14b
