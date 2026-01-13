# GitHub Activity Tracker - Student Activity Monitoring Dashboard

![Build Status](https://img.shields.io/badge/build-passing-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)
![Version](https://img.shields.io/badge/version-1.0.0-orange)

## Description
A comprehensive tracking system for educational institutions to monitor student GitHub activity. This platform enables HODs, Mentors, and Advisors to identify active contributors, track assignment progress, and monitor overall student engagement through a centralized dashboard.

## Key Features
- **Real-time Activity Tracking**: Automatically fetches commits, pull requests, issues, and reviews using the GitHub API.
- **Multi-level Dashboard**: Insightful views for different roles to monitor classroom-wide and individual student performance.
- **Classroom Management**: Group students into classrooms, organized by academic year, semester, and batch.
- **Assignment Tracking**: Manage assignments with deadlines, points, and automated/manual grading systems.
- **Leaderboards & Analytics**: Visualize top contributors and track activity trends over different time periods (weekly, monthly, yearly).
- **Data Export**: Generate detailed reports in Excel/CSV formats for administrative record-keeping.
- **Semester Archiving**: Archive classroom data at the end of a term to maintain a historical record of student performance.

## Documentation
- [Deployment Guide](docs/DEPLOYMENT.md)
- [Contributing Guidelines](CONTRIBUTING.md)

## Tech Stack
- **Frontend**: [React.js](https://reactjs.org/) with [Vite](https://vitejs.dev/)
- **Backend**: [Python](https://www.python.org/) with [FastAPI](https://fastapi.tiangolo.com/)
- **Database**: [SQLite](https://www.sqlite.org/) (via [SQLAlchemy](https://www.sqlalchemy.org/))
- **Scheduling**: [APScheduler](https://apscheduler.readthedocs.io/) for background data synchronization
- **Containerization**: [Docker](https://www.docker.com/) & [Docker Compose](https://docs.docker.com/compose/)
- **API**: GitHub REST API v3

## Docker Setup
To run the entire application using Docker:
```bash
docker-compose up --build
```
The frontend will be available at `http://localhost:3000` and the backend documentation at `http://localhost:8000/docs`.

## Prerequisites
- **Python 3.8+**
- **Node.js 16+**
- **Docker** (Optional, for containerized deployment)
- **GitHub Personal Access Token** (Fine-grained or classic)

## Installation

### 1. Clone the repository
```bash
git clone https://github.com/Dharunika-07-N/Github_activity_tracker.git
cd Github_activity_tracker
```

### 2. Backend Setup
```bash
cd backend
# Create and activate virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env  # Or create manually
# Edit .env and add your GITHUB_TOKEN

# Initialize and seed database (optional)
python migrate_db.py
python seed_demo.py

# Start the server
python main.py
```

### 3. Frontend Setup
```bash
cd ../frontend
npm install

# Start the development server
npm run dev
```

## Configuration

### Backend `.env`
Create a `.env` file in the `backend/` directory:
```env
GITHUB_TOKEN=your_github_personal_access_token
# Optional: DATABASE_URL=sqlite:///./tracker.db
# Optional: PORT=8000
```

## Usage
1. **Initialize**: Set up your GitHub token in the backend environment.
2. **Setup Classrooms**: Create classrooms and assign them to specific departments/batches.
3. **Add Students**: Import students using their GitHub usernames.
4. **Track Activity**: The system automatically polls GitHub events every hour (configurable).
5. **Manage Assignments**: Create assignments and track student submissions through the dashboard.
6. **Export Reports**: Use the "Export Report" feature to download activity data for offline analysis.

## API Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/dashboard/stats` | Overall system metrics |
| GET | `/dashboard/leaderboard` | Top active students |
| GET | `/students` | List all students |
| POST | `/students` | Add a new student |
| GET | `/classrooms` | List all classrooms |
| GET | `/analytics/export` | Download activity report |

## Screenshots
*(Add screenshots here showing the Dashboard, Leaderboard, and Classroom views)*

## Contributing
Contributions are welcome! Please feel free to submit a Pull Request.

## License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Authors
- **Dharunika N** - *Initial Work*

## Acknowledgments
- GitHub API Documentation
- FastAPI Framework
- Lucide React Icons
