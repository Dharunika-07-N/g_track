# Deployment Guide

This guide describes how to deploy the GitHub Activity Tracker in a production environment.

## Option 1: Docker Compose (Easiest)

1.  **Configure Environment Variables**:
    Create a `.env` file in the root directory (using `.env.example` as a template).
2.  **Build and Start**:
    ```bash
    docker-compose up -d --build
    ```
    This will start the backend on port 8000 and the frontend on port 3000.

## Option 2: Single-Box Deployment (Served by Backend)

1.  **Build Frontend**:
    ```bash
    cd frontend
    npm install
    npm run build
    ```
2.  **Move Frontend to Backend**:
    Move the `frontend/dist` folder to `backend/static`.
    ```bash
    mv frontend/dist backend/static
    ```
3.  **Run Backend**:
    ```bash
    cd backend
    pip install -r requirements.txt
    gunicorn main:app --workers 4 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
    ```

## Option 3: Deploying to Render.com (Recommended)

Render is excellent for hosting this application. We recommend a **Single-Box Docker Deployment** to keep costs low and configuration simple.

### 1. Create a PostgreSQL Database
1.  Log in to [Render.com](https://render.com).
2.  Click **New** > **Database**.
3.  Name it `github-tracker-db`.
4.  Select the **Free Tier** (or as per your needs).
5.  Once created, copy the **Internal Database URL** (e.g., `postgresql://user:pass@host:port/db`).

### 2. Create a Web Service
1.  Click **New** > **Web Service**.
2.  Connect your GitHub repository.
3.  **Name**: `github-activity-tracker`.
4.  **Environment**: `Docker`.
5.  **Docker Command**: Leave as default (it will use `backend/Dockerfile`).
6.  **Advanced Settings** > **Environment Variables**:
    *   `DATABASE_URL`: Paste your **Internal Database URL** from Step 1.
    *   `SECRET_KEY`: Generate a random string (e.g., `openssl rand -hex 32`).
    *   `GITHUB_TOKEN`: Your GitHub Personal Access Token.
    *   `JWT_SECRET_KEY`: Another random string.
    *   `PORT`: `8000` (Render will bind to this).
    *   `ENVIRONMENT`: `production`
    *   `STATIC_DIR`: `static`

### 3. Handle Frontend Building (Crucial)
Since we are using a Single-Box setup, the backend needs the built frontend files in its `static` folder. You have two ways to do this on Render:

**Method A: Pre-build & Push (Easiest)**
1.  On your local machine, run: `npm run prod:build` (from the root).
2.  Commit the `backend/static` folder to GitHub.
3.  Render will find these files and serve them.

**Method B: Build on Render (Automated)**
Modify `backend/Dockerfile` to include a multi-stage build that compiles the frontend and moves it to the `static` folder. (See Updated Dockerfile below).

---

## Environment Variables Reference

| Variable | Description | Default |
| :--- | :--- | :--- |
| `DATABASE_URL` | SQLAlchemy DB URL | `sqlite:///./tracker.db` |
| `SECRET_KEY` | Security key for sessions | `None` (CRITICAL) |
| `JWT_SECRET_KEY` | Secondary key for JWT | `None` (CRITICAL) |
| `GITHUB_TOKEN` | GitHub API Token | `None` (CRITICAL) |
| `ENABLE_EMAIL_NOTIFICATIONS` | Toggle Email Notifications | `False` |
| `ENVIRONMENT` | `development` or `production` | `development` |

## Database Migrations

If you need to update the schema on Render:
1. Go to the **Shell** tab in your Render Web Service.
2. Run: `python update_db_schema.py`

---

## Troubleshooting

### 404 Error on `/register` or other frontend routes

**Problem**: After deployment, navigating to routes like `/register`, `/login`, or refreshing the page shows a 404 error.

**Cause**: This is a common Single Page Application (SPA) routing issue. The browser tries to fetch `/register` as a server resource, but:
- Your backend API uses `/auth/register` (not `/register`)
- The static file server doesn't know to fallback to `index.html` for client-side routes

**Solution**: The application now includes a SPA fallback route in `backend/main.py` that:
1. Serves `index.html` for all non-API routes (like `/register`, `/login`, `/dashboard`)
2. Allows React Router to handle client-side routing
3. Still properly routes API calls to their respective endpoints

**What was fixed**:
- Added a catch-all route `@app.get("/{full_path:path}")` that serves `index.html` for client routes
- Removed the automatic static file mounting to prevent route conflicts
- Created a `_redirects` file in the frontend for additional SPA support

**After deploying these changes**, all routes should work correctly, including:
- Direct navigation to `/register` or `/login`
- Page refreshes on any route
- Browser back/forward buttons

