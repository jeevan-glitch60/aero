"""WebSocket manager for high-frequency telemetry broadcasting to web clients."""

import json
import logging
from typing import List, Set
from fastapi import WebSocket

logger = logging.getLogger(__name__)


class WebSocketManager:
    """Manages active WebSocket connections and broadcasts synchronized twin packets."""

    def __init__(self):
        self.active_connections: Set[WebSocket] = set()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)
        logger.info(f"WebSocket client connected. Total clients: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        self.active_connections.discard(websocket)
        logger.info(f"WebSocket client disconnected. Total clients: {len(self.active_connections)}")

    async def broadcast_json(self, data: dict):
        """Broadcasts data dictionary to all active clients."""
        if not self.active_connections:
            return

        message = json.dumps(data)
        dead_connections = set()

        for conn in self.active_connections:
            try:
                await conn.send_text(message)
            except Exception as err:
                dead_connections.add(conn)

        for dead in dead_connections:
            self.active_connections.discard(dead)
