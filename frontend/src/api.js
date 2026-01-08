const API_URL = "http://localhost:8000";

async function handleResponse(res, errorMessage) {
  if (!res.ok) {
    let errorDetail = errorMessage;
    try {
      const data = await res.json();
      errorDetail = data.detail || data.error || errorMessage;
    } catch (e) {
      // Not a JSON error response
    }
    throw new Error(errorDetail);
  }
  return res.json();
}

export async function fetchStats() {
  const res = await fetch(`${API_URL}/dashboard/stats`);
  return handleResponse(res, "Failed to fetch stats");
}

export async function fetchStudents() {
  const res = await fetch(`${API_URL}/students/`);
  return handleResponse(res, "Failed to fetch students");
}

export async function addStudent(username, name) {
  const res = await fetch(`${API_URL}/students/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ github_username: username, name: name }),
  });
  return handleResponse(res, "Failed to add student");
}

export async function refreshStudent(id) {
  const res = await fetch(`${API_URL}/students/${id}/refresh`, {
    method: "POST"
  });
  return handleResponse(res, "Failed to refresh");
}
