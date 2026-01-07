
const API_URL = "http://localhost:8000";

export async function fetchStats() {
  const res = await fetch(`${API_URL}/dashboard/stats`);
  return res.json();
}

export async function fetchStudents() {
  const res = await fetch(`${API_URL}/students/`);
  return res.json();
}

export async function addStudent(username, name) {
  const res = await fetch(`${API_URL}/students/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ github_username: username, name: name }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Failed to add student");
  }
  return res.json();
}
