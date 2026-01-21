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

## Environment Variables Reference

| Variable | Description | Default |
| :--- | :--- | :--- |
| `DATABASE_URL` | SQLAlchemy DB URL | `sqlite:///./tracker.db` |
| `SECRET_KEY` | JWT Secret Key | `None` (CRITICAL) |
| `GITHUB_TOKEN` | GitHub API Token | `None` (CRITICAL) |
| `ENABLE_EMAIL_NOTIFICATIONS` | Toggle Email Notifications | `False` |
| `SMTP_USER` | SMTP Username | `None` |
| `SMTP_PASS` | SMTP App Password | `None` |

## Database Migrations

If you have an existing database and need to update the schema:
```bash
# From the root directory
python update_db_schema.py
```
