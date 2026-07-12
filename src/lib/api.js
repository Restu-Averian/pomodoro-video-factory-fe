const API_BASE = "http://localhost:4000/api";

async function errorMessage(res, fallback) {
  const body = await res.json().catch(() => null);
  return body?.error?.message || fallback;
}

export async function checkBackendHealth() {
  try {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) throw new Error("Backend not healthy");
    return await res.json();
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

export async function checkFfmpegHealth() {
  try {
    const res = await fetch(`${API_BASE}/ffmpeg/health`);
    if (!res.ok) throw new Error("FFmpeg health check failed");
    return await res.json();
  } catch (error) {
    return {
      ffmpegInstalled: false,
      ffprobeInstalled: false,
      error: error.message,
    };
  }
}

export async function getProjects() {
  const res = await fetch(`${API_BASE}/projects`);
  if (!res.ok) throw new Error("Failed to fetch projects");
  return res.json();
}

export async function createProject(payload) {
  const res = await fetch(`${API_BASE}/projects`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok)
    throw new Error(await errorMessage(res, "Failed to create project"));
  return res.json();
}

export async function getProject(id) {
  const res = await fetch(`${API_BASE}/projects/${id}`);
  if (!res.ok) throw new Error("Failed to fetch project");
  return res.json();
}

export async function updateProject(id, payload) {
  const res = await fetch(`${API_BASE}/projects/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok)
    throw new Error(await errorMessage(res, "Failed to update project"));
  return res.json();
}

export async function uploadProjectAsset(projectId, type, file) {
  const formData = new FormData();
  formData.append("type", type);
  formData.append("file", file);

  const res = await fetch(`${API_BASE}/projects/${projectId}/assets`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok)
    throw new Error(await errorMessage(res, `Failed to upload ${type}`));
  return res.json();
}

export async function startPreviewRender(projectId) {
  const res = await fetch(`${API_BASE}/projects/${projectId}/render/preview`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to start preview render");
  return res.json();
}

export async function startFinalRender(projectId) {
  const res = await fetch(`${API_BASE}/projects/${projectId}/render/final`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to start final render");
  return res.json();
}

export async function getRenderJob(jobId) {
  const res = await fetch(`${API_BASE}/render-jobs/${jobId}`);
  if (!res.ok) throw new Error("Failed to fetch render job");
  return res.json();
}

export async function duplicateProject(projectId) {
  const res = await fetch(`${API_BASE}/projects/${projectId}/duplicate`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to duplicate project");
  return res.json();
}

export async function deleteProject(projectId) {
  const res = await fetch(`${API_BASE}/projects/${projectId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete project");
  return res.json();
}

export async function getSessionAudio(projectId) {
  const res = await fetch(`${API_BASE}/projects/${projectId}/session-audio`);
  if (!res.ok)
    throw new Error(await errorMessage(res, "Failed to load session audio"));
  return res.json();
}

export async function saveSessionAudio(projectId, payload) {
  const res = await fetch(`${API_BASE}/projects/${projectId}/session-audio`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok)
    throw new Error(await errorMessage(res, "Failed to save session audio"));
  return res.json();
}

export async function deleteProjectAsset(projectId, assetId) {
  const res = await fetch(
    `${API_BASE}/projects/${projectId}/assets/${assetId}`,
    { method: "DELETE" },
  );
  if (!res.ok)
    throw new Error(await errorMessage(res, "Failed to delete asset"));
  return res.json();
}

export async function checkOllamaHealth() {
  try {
    const res = await fetch(`${API_BASE}/ai/ollama/health`);
    if (!res.ok) throw new Error("Ollama health check failed");
    return await res.json();
  } catch (error) {
    return {
      reachable: false,
      modelInstalled: false,
      error: error.message,
    };
  }
}

export async function generateYouTubeMetadata(projectId, payload) {
  const res = await fetch(
    `${API_BASE}/projects/${projectId}/youtube/metadata/generate`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const err = new Error(
      body?.error?.message || "Failed to generate metadata",
    );
    err.code = body?.error?.code;
    throw err;
  }
  return res.json();
}
