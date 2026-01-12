# LYNX - Geospatial Intelligence Prototype

## Overview
LYNX is a geospatial intelligence prototype application with a React/Vite frontend and a FastAPI backend. It displays pins and entities on an interactive Leaflet map.

## Project Structure
```
backend/          - FastAPI backend server
  server.py       - Main API endpoints (health, pins CRUD, SSE stream)
  app/            - Additional application modules
  data/           - Data files (entities.json, lynx.db)

frontend/         - React/Vite frontend
  src/
    components/   - React components (MapView, Sidebar, AddEntityModal)
    data/         - API clients and data handling
    types/        - TypeScript type definitions
    ui/           - UI utilities (typeIcons)
    styles/       - CSS styles
```

## Tech Stack
- **Frontend**: React 19, TypeScript, Vite, Leaflet/React-Leaflet
- **Backend**: Python 3.11, FastAPI, Uvicorn

## Development Setup
- Frontend runs on port 5000 (with Vite dev server)
- Backend runs on port 8000 (FastAPI/Uvicorn)
- Frontend proxies `/api` requests to backend

## API Endpoints
- `GET /api/health` - Health check
- `GET /api/pins` - List all pins
- `POST /api/pins` - Create a new pin
- `GET /api/pins/stream` - SSE stream for real-time pin updates

## Recent Changes
- 2026-01-11: Initial Replit setup
  - Configured frontend for port 5000 with allowedHosts: true
  - Renamed app.py to server.py to avoid module naming conflict
  - Set up development workflows for both frontend and backend
- 2026-01-12: UI and Functional Overhaul
  - Implemented non-overlapping UI layout contract
  - Enhanced Add Pin flow with severity/confidence fields
  - Added tabbed sidebar for list/filter views
  - Integrated Ops Overlay with backend health tracking
  - Configured production build for frontend serving via FastAPI
