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
        # HARD DISABLED as per user request - SYSTEM LOCKDOWN
        self.enabled = os.getenv("ENABLE_EMAIL_NOTIFICATIONS", "True").lower() == "true"

    def _send_email(self, to_email: str, subject: str, html_content: str):
        if not self.enabled or not self.user or not self.password:
            print(f"Skipping email to {to_email} (Service disabled or missing credentials)")
            return False
        
        try:
            msg = MIMEMultipart()
            msg['From'] = f"{self.from_name} <{self.user}>"
            msg['To'] = to_email
            msg['Subject'] = subject
            msg.attach(MIMEText(html_content, 'html'))
            
            server = smtplib.SMTP(self.host, self.port)
            server.starttls()
            server.login(self.user, self.password)
            server.send_message(msg)
            server.quit()
            return True
        except Exception as e:
            print(f"Failed to send email to {to_email}: {e}")
            return False

    def send_welcome_email(self, student_name: str, student_email: str, temp_password: str, login_url: str = "http://localhost:5173/login"):
        subject = f"Welcome to {self.from_name}"
        html = f"""
        <h2>Hello {student_name},</h2>
        <p>You have been registered for the GitHub Activity Tracker.</p>
        <p><b>Login Credentials:</b><br>
        Email: {student_email}<br>
        Temporary Password: {temp_password}</p>
        <p>Please login at <a href="{login_url}">{login_url}</a> and change your password.</p>
        """
        return self._send_email(student_email, subject, html)

    def send_assignment_reminder(self, student_name: str, student_email: str, assignment_title: str, deadline: datetime):
        subject = f"Reminder: {assignment_title} is due soon"
        html = f"""
        <h2>Hello {student_name},</h2>
        <p>This is a reminder that the assignment <b>{assignment_title}</b> is due on {deadline.strftime('%Y-%m-%d %H:%M')}.</p>
        <p>Please ensure you have submitted your work via the dashboard.</p>
        """
        return self._send_email(student_email, subject, html)

notification_service = NotificationService()
