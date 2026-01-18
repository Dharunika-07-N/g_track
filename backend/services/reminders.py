from sqlalchemy.orm import Session
from database import SessionLocal, Assignment, Student, Submission, AssignmentReminderLog
from services.notifications import notification_service
from datetime import datetime, timedelta
import asyncio

async def check_and_send_reminders():
    print("Checking for assignment reminders...")
    db = SessionLocal()
    try:
        now = datetime.utcnow()
        # Find active assignments with upcoming deadlines
        assignments = db.query(Assignment).filter(Assignment.deadline > now).all()
        
        for assignment in assignments:
            deadline = assignment.deadline
            days_left = (deadline - now).days
            
            # Types of reminders: 3 days, 1 day, 0 days (same day)
            target_types = []
            if days_left == 3: target_types.append("reminder_3d")
            elif days_left == 1: target_types.append("reminder_1d")
            elif days_left == 0 and now.hour == 8: target_types.append("reminder_day") # 8 AM reminder
            
            if not target_types:
                continue
                
            # Get students who haven't submitted
            submitted_student_ids = db.query(Submission.student_id).filter(
                Submission.assignment_id == assignment.id,
                Submission.status.in_(["submitted", "graded"])
            ).all()
            submitted_student_ids = [r[0] for r in submitted_student_ids]
            
            pending_students = db.query(Student).filter(
                Student.classroom_id == assignment.classroom_id,
                Student.id.notin_(submitted_student_ids),
                Student.status == "active"
            ).all()
            
            for student in pending_students:
                # Check if reminder already sent for this specific assignment and student
                # For simplicity, we can log it. 
                # notification_service already does some basic sending.
                
                if student.email:
                    success = notification_service.send_assignment_reminder(
                        student.name,
                        student.email,
                        assignment.title,
                        deadline
                    )
                    if success:
                        print(f"Sent reminder to {student.email} for {assignment.title}")
                    
            await asyncio.sleep(0.1) # Throttling
                
    except Exception as e:
        print(f"Error in check_and_send_reminders: {e}")
    finally:
        db.close()
