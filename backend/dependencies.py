from fastapi import Depends, HTTPException
from routers.auth import verify_token

def require_role(allowed_roles: list):
    def role_checker(payload: dict = Depends(verify_token)):
        if payload.get("role") not in allowed_roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return payload
    return role_checker

# Common Dependencies
require_admin = require_role(["admin", "hod"])
require_faculty = require_role(["faculty", "admin", "hod"])
require_student = require_role(["student", "faculty", "admin", "hod"])
