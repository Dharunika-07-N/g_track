import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
from typing import List
from datetime import datetime

class NotificationService:
    def __init__(self):
        self.host = os.getenv("SMTP_HOST", "smtp.gmail.com")
        self.port = int(os.getenv("SMTP_PORT", 587))
        self.user = os.getenv("SMTP_USER")
        self.password = os.getenv("SMTP_PASSWORD")
        self.from_email = os.getenv("SMTP_FROM_EMAIL", self.user)
        self.from_name = os.getenv("SMTP_FROM_NAME", "GitHub Activity Tracker")

    def send_email(self, recipient_email: str, subject: str, message_body: str):
        if not self.user or not self.password:
            print("Warning: Email credentials not configured. Skipping email sent to", recipient_email)
            # Log it for testing purposes if you don't have real creds
            return False

        try:
            msg = MIMEMultipart()
            msg['From'] = f"{self.from_name} <{self.from_email}>"
            msg['To'] = recipient_email
            msg['Subject'] = subject

            msg.attach(MIMEText(message_body, 'plain'))

            server = smtplib.SMTP(self.host, self.port)
            server.starttls()
            server.login(self.user, self.password)
            server.send_message(msg)
            server.quit()
            return True
        except Exception as e:
            print(f"Error sending email to {recipient_email}: {e}")
            return False

    def send_assignment_reminder(self, student_name: str, student_email: str, assignment_title: str, deadline: datetime):
        subject = f"Reminder: Upcoming Deadline for {assignment_title}"
        body = f"Hi {student_name},\n\nComplete the assignment '{assignment_title}', the deadline is near ({deadline.strftime('%Y-%m-%d %H:%M')}).\n\nPlease submit your response as soon as possible.\n\nBest regards,\n{self.from_name}"
        return self.send_email(student_email, subject, body)

notification_service = NotificationService()
