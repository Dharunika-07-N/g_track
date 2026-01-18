from sqlalchemy.orm import Session
from database import Submission, Assignment, AutogradingTest, Student
import os
import shutil
import git
import subprocess
import tempfile
import re
from datetime import datetime

class AutogradingService:
    def __init__(self):
        self.temp_dir = tempfile.gettempdir()

    def grade_submission(self, db: Session, submission_id: int):
        submission = db.query(Submission).filter(Submission.id == submission_id).first()
        if not submission:
            return {"error": "Submission not found"}
        
        assignment = submission.assignment
        if not assignment.tests:
            return {"message": "No tests configured for this assignment"}

        # Preparing workspace
        work_dir = os.path.join(self.temp_dir, f"submission_{submission_id}_{datetime.now().strftime('%Y%m%d%H%M%S')}")
        if os.path.exists(work_dir):
            shutil.rmtree(work_dir)
        os.makedirs(work_dir)

        try:
            # 1. Clone Repo
            print(f"Cloning {submission.repo_url} into {work_dir}...")
            # For private repos, we might need a token. Assuming public or token in URL for now.
            # In production, inject token into URL: https://<token>@github.com/...
            git.Repo.clone_from(submission.repo_url, work_dir)

            total_score = 0
            max_score = 0
            results = []

            # 2. Run Tests
            for test in assignment.tests:
                max_score += test.points
                print(f"Running test: {test.test_name}")
                
                # Setup
                if test.setup_commands:
                    for cmd in test.setup_commands.split('\n'):
                        if cmd.strip():
                            subprocess.run(cmd, shell=True, cwd=work_dir, check=False)

                # Execution
                try:
                    # Default timeout 10s
                    result = subprocess.run(
                        test.run_command, 
                        shell=True, 
                        cwd=work_dir, 
                        capture_output=True, 
                        text=True, 
                        timeout=test.timeout or 10
                    )
                    output = result.stdout.strip()
                    error = result.stderr.strip()
                    
                    # Comparison
                    passed = False
                    if test.test_type == "regex":
                        if re.search(test.expected_output, output):
                            passed = True
                    else: # strict match
                        if output == test.expected_output.strip():
                            passed = True
                    
                    if passed:
                        total_score += test.points
                    
                    results.append({
                        "test": test.test_name,
                        "passed": passed,
                        "output": output,
                        "error": error
                    })

                except subprocess.TimeoutExpired:
                    results.append({
                        "test": test.test_name,
                        "passed": False,
                        "output": "Timeout",
                        "error": "Execution timed out"
                    })
                except Exception as e:
                    results.append({
                        "test": test.test_name,
                        "passed": False,
                        "output": "Error",
                        "error": str(e)
                    })

            # 3. Update Submission
            submission.autograde_score = total_score
            submission.status = "graded"
            # Auto-calculate grade (assuming grade is purely autograde for now, or mixed?)
            # Let's say grade = total_score for now
            submission.grade = total_score
            
            db.commit()
            
            return {
                "submission_id": submission_id,
                "score": total_score,
                "max_score": max_score,
                "results": results
            }

        except Exception as e:
            print(f"Grading error: {e}")
            return {"error": str(e)}
        finally:
            # Cleanup
            if os.path.exists(work_dir):
                # On Windows, git packing might hold locks, ignore errors best effort
                shutil.rmtree(work_dir, ignore_errors=True)

grader_service = AutogradingService()
