import { API_BASE as API_URL } from './config';

function getHeaders() {
  const token = localStorage.getItem('token');
  return {
    "Content-Type": "application/json",
    ...(token ? { "Authorization": `Bearer ${token}` } : {})
  };
}

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

export async function fetchStats(period = "monthly") {
  const res = await fetch(`${API_URL}/dashboard/stats?period=${period}`, {
    headers: getHeaders()
  });
  return handleResponse(res, "Failed to fetch stats");
}

export async function fetchStudents(period = "monthly") {
  const res = await fetch(`${API_URL}/students/?period=${period}`, {
    headers: getHeaders()
  });
  return handleResponse(res, "Failed to fetch students");
}

export async function addStudent(username, name) {
  const res = await fetch(`${API_URL}/students/`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ github_username: username, name: name }),
  });
  return handleResponse(res, "Failed to add student");
}

export async function refreshStudent(id) {
  const res = await fetch(`${API_URL}/students/${id}/refresh`, {
    method: "POST",
    headers: getHeaders()
  });
  return handleResponse(res, "Failed to refresh");
}

export async function removeStudent(id) {
  const res = await fetch(`${API_URL}/students/${id}`, {
    method: "DELETE",
    headers: getHeaders()
  });
  return handleResponse(res, "Failed to remove student");
}

export async function uploadStudents(file) {
  const formData = new FormData();
  formData.append("file", file);

  const token = localStorage.getItem('token');
  const headers = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}/students/upload`, {
    method: "POST",
    headers: headers,
    body: formData,
  });
  return handleResponse(res, "Failed to upload file");
}
