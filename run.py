"""One-click unified launcher for the MALE UAV Aero Piston Engine Digital Twin System."""

import sys
import os
import argparse
import uvicorn


def main():
    parser = argparse.ArgumentParser(description="MALE UAV Aero Piston Engine Digital Twin Server")
    parser.add_argument("--host", default="0.0.0.0", help="Bind host (default: 0.0.0.0)")
    parser.add_argument("--port", type=int, default=8000, help="Bind port (default: 8000)")
    parser.add_argument("--reload", action="store_true", help="Enable auto-reload for development")
    args = parser.parse_args()

    banner = r"""
  ========================================================================
     __  __    _    _     _____   _   _  _____     __  _____        _       
    |  \/  |  / \  | |   | ____| | | | |/ _ \ \   / / |_   _|_      _(_) _ __  
    | |\/| | / _ \ | |   |  _|   | | | | |_| \ \ / /    | | \ \ /\ / / | '_ \ 
    | |  | |/ ___ \| |___| |___  | |_| |  _  |\ V /     | |  \ V  V /| | | | |
    |_|  |_/_/   \_\_____|_____|  \___/|_| |_| \_/      |_|   \_/\_/ |_|_| |_|
                                                                              
    MALE UAV Aero Piston Engine Digital Twin System // Rotax 915/916 iS Class
    Real-Time EKF Synchronization | MVEM Physics | AI/ML Prognostics & RUL
  ========================================================================
    """
    print(banner)
    print(f"[*] Starting Digital Twin Server on http://localhost:{args.port}")
    print(f"[*] Telemetry WebSocket broadcast active at ws://localhost:{args.port}/ws/telemetry")
    print(f"[*] Web UI Dashboard available at http://localhost:{args.port}")
    print(f"[*] API Documentation available at http://localhost:{args.port}/docs\n")

    uvicorn.run("src.api.server:app", host=args.host, port=args.port, reload=args.reload)


if __name__ == "__main__":
    main()
