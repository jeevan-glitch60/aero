# AeroTwin Deployment & GitHub Publishing Guide

This guide provides instructions to publish the **AeroTwin Digital Twin** repository to GitHub and deploy it across modern cloud environments (Render, Railway, Docker, or GitHub Pages).

---

## 📁 Repository Structure Overview

```text
aero/
├── .github/
│   └── workflows/
│       ├── ci.yml                # Automated CI pipeline running pytest on Python 3.11 & 3.12
│       └── pages.yml             # Automated GitHub Pages frontend deployment
├── config/                       # Engine YAML & fleet registry configurations
│   ├── engine_specs_rotax915.yaml
│   ├── fault_definitions.yaml
│   ├── fleet_registry.json
│   └── flight_profiles.yaml
├── frontend/                     # Web UI Single Page Application
│   ├── css/                      # Modular styling & design tokens
│   ├── js/                       # Core SPA controllers, 3D engines & views
│   │   ├── vendor/               # Three.js & OrbitControls libraries
│   │   ├── engine_3d_turbo.js    # Turbocharged 3D cutaway visualization
│   │   ├── engine_3d_sim.js      # Multi-architecture physics simulation
│   │   └── app.js                # Main application orchestrator
│   └── index.html                # Single-page dashboard interface
├── src/                          # Backend core services & models
│   ├── api/                      # FastAPI REST & WebSocket endpoints
│   ├── core/                     # Type schemas & shared registries
│   ├── health/                   # Fault isolation & anomaly detectors
│   ├── ingestion/                # Telemetry streaming & processing
│   ├── maps/                     # Engine performance maps
│   ├── physics/                  # MVEM thermodynamics, turbo, atmosphere
│   ├── predictive/               # RUL estimators & wear models
│   ├── simulation/               # Mission simulator & fault injector
│   └── synchronization/          # Extended Kalman Filter (EKF)
├── tests/                        # Comprehensive automated test suite
│   ├── e2e/                      # Playwright browser end-to-end test scripts
│   ├── test_api.py               # REST API & WebSocket tests
│   ├── test_physics.py           # Thermodynamic physics tests
│   └── ...
├── .gitignore                    # Optimized ignore rules (Python, cache, OS)
├── Dockerfile                    # Production container image
├── docker-compose.yml            # 1-command container orchestration
├── Procfile                      # PaaS deployment runner (Render, Railway, Heroku)
├── render.yaml                   # Infrastructure-as-code for Render.com
├── requirements.txt              # Pinned Python package dependencies
├── run.py                        # Unified one-click application launcher
├── LICENSE                       # MIT License
├── DEPLOYMENT.md                 # This deployment guide
└── README.md                     # Project overview and documentation
```

---

## 🚀 Part 1: Publishing to GitHub

If Git is not yet installed on your system, download and install it from [git-scm.com](https://git-scm.com/download/win).

### Step 1: Initialize Git and Stage Files
Open your terminal (PowerShell or Bash) in the project directory:

```bash
# Initialize git repository
git init

# Check that ignored cache files are excluded
git status

# Stage all project files
git add .

# Create the initial commit
git commit -m "feat: initial commit of AeroTwin digital twin platform"
```

### Step 2: Create a New GitHub Repository
1. Navigate to [github.com/new](https://github.com/new).
2. Set your repository name (e.g., `aerotwin` or `aerotwin-digital-twin`).
3. Set visibility to **Public** or **Private**.
4. **Do not** initialize with a README, .gitignore, or license (these are already configured).
5. Click **Create repository**.

### Step 3: Link and Push to GitHub
```bash
# Rename branch to main
git branch -M main

# Add your GitHub repository remote (replace <YOUR_USERNAME> and <YOUR_REPO>)
git remote add origin https://github.com/<YOUR_USERNAME>/<YOUR_REPO>.git

# Push code to GitHub
git push -u origin main
```

---

## ☁️ Part 2: Deployment Options

### Option A: Render.com (Recommended Free Cloud Deployment)
Render offers free cloud hosting with native support for FastAPI, WebSockets, and background tasks.

1. Create a free account at [render.com](https://render.com).
2. Go to your **Dashboard** -> **New +** -> **Web Service**.
3. Connect your GitHub repository.
4. Render will auto-detect settings or use `render.yaml`:
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `python run.py --host 0.0.0.0 --port $PORT`
5. Click **Deploy Web Service**.
6. Once deployed, your digital twin will be live with full REST and WebSocket capabilities at `https://<your-service>.onrender.com`.

---

### Option B: Docker Container Deployment (Any Cloud / VPS)
You can deploy anywhere Docker is supported (AWS, Google Cloud Run, DigitalOcean, Railway, or Fly.io).

#### Build & Run Locally with Docker Compose:
```bash
# Build and start container in detached mode
docker compose up --build -d

# View live application logs
docker compose logs -f

# Stop container
docker compose down
```

The application will be accessible at [http://localhost:8000](http://localhost:8000).

#### Single Docker Run Command:
```bash
docker build -t aerotwin:latest .
docker run -p 8000:8000 aerotwin:latest
```

---

### Option C: Railway or Fly.io
The repository includes a standard [`Procfile`](file:///c:/Users/Jeevan/OneDrive/Desktop/aero/Procfile):
```text
web: python run.py --host 0.0.0.0 --port ${PORT:-8000}
```
Simply connect your GitHub repo on [railway.app](https://railway.app) or run `fly launch` with [fly.io](https://fly.io), and the service will automatically detect the Procfile and build the project.

---

### Option D: GitHub Pages (Frontend Only Demo)
The repository includes a ready-to-use GitHub Actions workflow [`.github/workflows/pages.yml`](file:///c:/Users/Jeevan/OneDrive/Desktop/aero/.github/workflows/pages.yml):
1. In your GitHub repository, go to **Settings** -> **Pages**.
2. Under **Build and deployment** -> **Source**, select **GitHub Actions**.
3. Push to `main` branch. GitHub Actions will automatically deploy the static frontend dashboard to `https://<YOUR_USERNAME>.github.io/<YOUR_REPO>/`.
4. The 3D Engine simulator features a standalone browser-side synthetic physics engine that runs autonomously on GitHub Pages without requiring a backend server.

---

## 💻 Part 3: Local Development & Testing

```bash
# 1. Create a virtual environment
python -m venv venv

# 2. Activate virtual environment
# On Windows PowerShell:
.\venv\Scripts\Activate.ps1
# On Linux/macOS:
source venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Run test suite
pytest

# 5. Launch application
python run.py
```
Open [http://localhost:8000](http://localhost:8000) in your web browser.
