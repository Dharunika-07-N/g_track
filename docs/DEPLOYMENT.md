# Deployment Guide

## Local Development
Refer to the `README.md` for local setup instructions.

## Docker Deployment
1. Ensure Docker and Docker Compose are installed.
2. Create a `.env` file in the root directory (or use environment variables).
3. Run `docker-compose up --build`.

## Production Considerations
- **Database**: For production, migrating from SQLite to PostgreSQL is recommended. You can update the `DATABASE_URL` in the environment variables.
- **Security**: Change `SECRET_KEY` and ensure `DEBUG` is set to `False`.
- **CORS**: Update `CORS_ORIGINS` to include only the production frontend URL.
- **Scaling**: The backend can be scaled horizontally behind a load balancer. Ensure the database and Redis (if used) are externally managed.
