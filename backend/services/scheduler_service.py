from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime, timedelta
from database import SessionLocal, Assignment, Student, Submission
from services.notifications import notification_service
import asyncio

def check_upcoming_deadlines():
    print("Checking for upcoming deadlines...")
    db = SessionLocal()
    try:
        now = datetime.utcnow()
        upcoming_window_start = now + timedelta(days=1)
        upcoming_window_end = now + timedelta(days=1, hours=1) # 1 hour check window to avoid dupes if running frequent
        # Simplify: Just check assignments due tomorrow (between 24h and 48h from now, or exactly 1 day?)
        # Let's say we remind 24 hours before.
        
        # Actually, let's just find anything due in the next 24 hours that hasn't been reminded?
        # A simpler approach for the demo: "Assignments due tomorrow"
        
        tomorrow_start = (datetime.utcnow() + timedelta(days=1)).replace(hour=0, minute=0, second=0)
        tomorrow_end = (datetime.utcnow() + timedelta(days=1)).replace(hour=23, minute=59, second=59)
        
        upcoming_assignments = db.query(Assignment).filter(
            Assignment.deadline >= tomorrow_start,
            Assignment.deadline <= tomorrow_end
        ).all()
        
        for assignment in upcoming_assignments:
            print(f"Processing assignment: {assignment.title}")
            # Get students who haven't submitted
            submitted_ids = [s.student_id for s in db.query(Submission.student_id).filter(Submission.assignment_id == assignment.id).all()]
            
            # Get pending students (all students in classroom - submitted)
            pending_students = db.query(Student).filter(
                Student.classroom_id == assignment.classroom_id,
                ~Student.id.in_(submitted_ids)
            ).all()
            
            for student in pending_students:
                if student.email:
                    notification_service.send_assignment_reminder(
                        student.name, student.email, assignment.title, assignment.deadline
                    )
                    print(f"Sent reminder to {student.email}")
                    
    except Exception as e:
        print(f"Error checking deadlines: {e}")
    finally:
        db.close()

def start_scheduler():
    scheduler = BackgroundScheduler()
    # Check at 9 AM everyday or every hour for demo purposes
    scheduler.add_job(check_upcoming_deadlines, 'interval', hours=1)
    scheduler.start()
    return scheduler
