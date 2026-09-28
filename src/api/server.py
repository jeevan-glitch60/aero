"""Main FastAPI application factory and asynchronous WebSocket telemetry loop."""

import asyncio
import os
from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from src.api.routes import router as api_router, get_simulator
from src.api.ws_manager import WebSocketManager

# Global WebSocket broadcast manager
ws_manager = WebSocketManager()
_background_sim_task: asyncio.Task = None


async def telemetry_broadcast_loop():
    """Background loop stepping the digital twin simulator and broadcasting at 10 Hz."""
    sim = get_simulator()
    while True:
        try:
            # Step simulator by 0.1s
            packet = sim.step(dt_real_s=0.1)
            # Broadcast to active WebSockets
            await ws_manager.broadcast_json(packet.model_dump())
        except Exception as e:
            pass
        await asyncio.sleep(0.1)  # 10 Hz broadcast rate


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Starts background telemetry broadcast task on app startup and cancels on shutdown."""
    global _background_sim_task
    _background_sim_task = asyncio.create_task(telemetry_broadcast_loop())
    yield
    if _background_sim_task:
        _background_sim_task.cancel()


def create_app() -> FastAPI:
    """Creates configured FastAPI application."""
    app = FastAPI(
        title="MALE UAV Aero Piston Engine Digital Twin",
        description="Real-time Physics-Informed Digital Twin, EKF Synchronization, Diagnostics & RUL",
        version="1.0.0",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Mount REST routes
    app.include_router(api_router)

    # WebSocket telemetry route
    @app.websocket("/ws/telemetry")
    async def websocket_telemetry_endpoint(websocket: WebSocket):
        await ws_manager.connect(websocket)
        try:
            while True:
                # Handle any client messages / commands
                data = await websocket.receive_text()
        except WebSocketDisconnect:
            ws_manager.disconnect(websocket)
        except Exception:
            ws_manager.disconnect(websocket)

    # Mount Static Frontend
    frontend_dir = Path(__file__).resolve().parent.parent.parent / "frontend"
    if frontend_dir.exists():
        app.mount("/", StaticFiles(directory=str(frontend_dir), html=True), name="frontend")

    return app


app = create_app()
