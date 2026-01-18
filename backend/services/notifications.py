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

    
    def send_welcome_email(self, student_name: str, student_email: str, temp_password: str, login_url: str = "http://localhost:5173/login"):
        subject = "Welcome to GitHub Activity Tracker"
        body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
                <h2 style="color: #2563eb;">Welcome, {student_name}!</h2>
                <p>Your account has been successfully created on the GitHub Activity Tracker.</p>
                <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0;">
                    <p style="margin: 0;"><strong>Username:</strong> {student_email}</p>
                    <p style="margin: 10px 0 0;"><strong>Temporary Password:</strong> {temp_password}</p>
                </div>
                <p>Please log in and change your password immediately.</p>
                <div style="text-align: center; margin-top: 25px;">
                    <a href="{login_url}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Login to Dashboard</a>
                </div>
            </div>
        </body>
        </html>
        """
        # Ensure HTML is sent
        try:
            msg = MIMEMultipart()
            msg['From'] = f"{self.from_name} <{self.from_email}>"
            msg['To'] = student_email
            msg['Subject'] = subject
            msg.attach(MIMEText(body, 'html'))
            
            with smtplib.SMTP(self.host, self.port) as server:
                server.starttls()
                server.login(self.user, self.password)
                server.send_message(msg)
            return True
        except Exception as e:
            print(f"Error sending welcome email to {student_email}: {e}")
            return False

    def send_assignment_reminder(self, student_name: str, student_email: str, assignment_title: str, deadline: datetime):
        subject = f"Reminder: {assignment_title} Due Soon"
        body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; color: #333;">
            <div style="border-left: 4px solid #f59e0b; padding-left: 15px;">
                <h3>Assignment Deadline Reminder</h3>
                <p>Hi {student_name},</p>
                <p>This is a reminder that <strong>{assignment_title}</strong> is due on:</p>
                <p style="font-size: 1.1em; font-weight: bold; color: #dc2626;">{deadline.strftime('%B %d, %Y at %I:%M %p')}</p>
                <p>Please ensure you have pushed your code to GitHub before the deadline.</p>
            </div>
        </body>
        </html>
        """
        try:
            msg = MIMEMultipart()
            msg['From'] = f"{self.from_name} <{self.from_email}>"
            msg['To'] = student_email
            msg['Subject'] = subject
            msg.attach(MIMEText(body, 'html'))
            
            with smtplib.SMTP(self.host, self.port) as server:
                server.starttls()
                server.login(self.user, self.password)
                server.send_message(msg)
            return True
        except Exception as e:
            print(f"Error sending reminder to {student_email}: {e}")
            return False

notification_service = NotificationService()
