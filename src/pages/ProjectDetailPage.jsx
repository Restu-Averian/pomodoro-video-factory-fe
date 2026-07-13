import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getProject,
  startPreviewRender,
  startFinalRender,
  getRenderJob,
  duplicateProject,
  deleteProject,
  getSessionAudio,
  saveSessionAudio,
  uploadProjectAsset,
  deleteProjectAsset,
  updateProject,
} from "../lib/api";
import { formatBytes } from "../lib/utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import YoutubeUploadPanel from "../components/YoutubeUploadPanel";

const POMODORO_PRESETS = {
  classic_25_5: {
    focusDurationMinutes: 25,
    breakDurationMinutes: 5,
    sessionCount: 4,
    includeFinalBreak: true,
  },
  deep_work_50_10: {
    focusDurationMinutes: 50,
    breakDurationMinutes: 10,
    sessionCount: 3,
    includeFinalBreak: true,
  },
};

const PRESET_LABELS = {
  classic_25_5: "25/5 Classic Pomodoro",
  deep_work_50_10: "50/10 Deep Work Pomodoro",
  custom: "Custom",
};

function configFromProject(project) {
  return {
    pomodoroPreset: project.pomodoro_preset || "custom",
    focusDurationMinutes: project.focus_duration_minutes,
    breakDurationMinutes: project.break_duration_minutes,
    sessionCount: project.session_count,
    includeFinalBreak: Boolean(project.include_final_break),
  };
}

function matchingPreset(config) {
  return (
    Object.entries(POMODORO_PRESETS).find(([, preset]) =>
      Object.entries(preset).every(([field, value]) => config[field] === value),
    )?.[0] || "custom"
  );
}

export default function ProjectDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [job, setJob] = useState(null);
  const [polling, setPolling] = useState(false);
  const [error, setError] = useState(null);
  const [errorKey, setErrorKey] = useState(0);
  const [duplicating, setDuplicating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [sessionRows, setSessionRows] = useState([]);
  const [bellAssetId, setBellAssetId] = useState("");
  const [savingAudio, setSavingAudio] = useState(false);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [editingConfig, setEditingConfig] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [config, setConfig] = useState(null);
  const [mappingSaved, setMappingSaved] = useState(false);

  const showError = (message) => {
    setError(message);
    setErrorKey((key) => key + 1);
  };

  const rowsForCount = (count, rows = []) =>
    Array.from({ length: count }, (_, index) => {
      const existing = rows.find((row) => row.sessionIndex === index + 1);
      return (
        existing || {
          sessionIndex: index + 1,
          focusAudioAssetId: "",
          breakAudioAssetId: "",
        }
      );
    });

  useEffect(() => {
    fetchProject();
  }, [id]);

  useEffect(() => {
    if (!errorKey) return;
    const scrollTarget = document.querySelector("main");
    if (scrollTarget) scrollTarget.scrollTo({ top: 0, behavior: "smooth" });
    else window.scrollTo({ top: 0, behavior: "smooth" });
  }, [errorKey]);

  const fetchProject = async () => {
    try {
      const data = await getProject(id);
      setProject(data);
      setConfig(configFromProject(data));
      const mapping = await getSessionAudio(id);
      setSessionRows(rowsForCount(mapping.sessionCount, mapping.sessions));
      setBellAssetId(mapping.bellAssetId || "");
    } catch (err) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let interval;
    if (polling && job && !["completed", "failed"].includes(job.status)) {
      interval = setInterval(async () => {
        try {
          const updatedJob = await getRenderJob(job.id);
          setJob(updatedJob);
          if (["completed", "failed"].includes(updatedJob.status)) {
            setPolling(false);
            fetchProject(); // Refetch to get updated status and output path
          }
        } catch (err) {
          console.error("Failed to poll job", err);
        }
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [polling, job]);

  const handleStartRender = async (type) => {
    setError(null);
    try {
      let res;
      if (type === "preview") {
        res = await startPreviewRender(id);
      } else {
        res = await startFinalRender(id);
      }
      setJob({
        id: res.jobId,
        status: res.status,
        progress: 0,
        currentStep: "Queued",
      });
      setPolling(true);
      fetchProject(); // Updates project status to queued
    } catch (err) {
      showError(err.message);
    }
  };

  const handleDuplicate = async () => {
    try {
      setDuplicating(true);
      const newProject = await duplicateProject(id);
      navigate(`/projects/${newProject.id}`);
    } catch (err) {
      showError(err.message);
      setDuplicating(false);
    }
  };

  const handleDelete = async () => {
    if (
      !window.confirm(
        "Are you sure you want to delete this project? Local files and project data will be deleted.",
      )
    )
      return;
    try {
      setDeleting(true);
      await deleteProject(id);
      navigate("/");
    } catch (err) {
      showError(err.message);
      setDeleting(false);
    }
  };

  const refreshProject = async () => {
    await fetchProject();
  };

  const saveMappings = async () => {
    setSavingAudio(true);
    setError(null);
    setMappingSaved(false);
    try {
      const saved = await saveSessionAudio(id, {
        bellAssetId: bellAssetId || null,
        sessions: sessionRows,
      });
      setSessionRows(rowsForCount(saved.sessionCount, saved.sessions));
      setBellAssetId(saved.bellAssetId || "");
      await refreshProject();
      setMappingSaved(true);
    } catch (err) {
      showError(err.message);
    } finally {
      setSavingAudio(false);
    }
  };

  const updateConfigValue = (field, value) => {
    const next = { ...config, [field]: value };
    setConfig({ ...next, pomodoroPreset: matchingPreset(next) });
  };

  const setConfigPreset = (pomodoroPreset) =>
    setConfig({
      ...config,
      pomodoroPreset,
      ...(POMODORO_PRESETS[pomodoroPreset] || {}),
    });

  const saveConfig = async () => {
    setSavingConfig(true);
    setError(null);
    setMappingSaved(false);
    try {
      await updateProject(id, config);
      setEditingConfig(false);
      await refreshProject();
    } catch (err) {
      showError(err.message);
    } finally {
      setSavingConfig(false);
    }
  };

  const uploadAudioFiles = async (event, type) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    setUploadingAudio(true);
    setError(null);
    try {
      await Promise.all(
        files.map((file) => uploadProjectAsset(id, type, file)),
      );
      await refreshProject();
    } catch (err) {
      showError(err.message);
    } finally {
      event.target.value = "";
      setUploadingAudio(false);
    }
  };

  const removeAudio = async (assetId) => {
    try {
      await deleteProjectAsset(id, assetId);
      await refreshProject();
    } catch (err) {
      showError(err.message);
    }
  };

  if (loading) return <div className="p-8">Loading project...</div>;
  if (error && !project)
    return <div className="p-8 text-red-600 dark:text-red-300">Error: {error}</div>;
  if (!project) return <div className="p-8">Project not found.</div>;

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{project.title}</h1>
          <p className="text-muted-foreground mt-2">{project.description}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Badge
            variant={
              project.status === "completed"
                ? "default"
                : project.status === "failed"
                  ? "destructive"
                  : "secondary"
            }
          >
            {project.status.toUpperCase()}
          </Badge>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDuplicate}
              disabled={duplicating || deleting}
            >
              {duplicating ? "Duplicating..." : "Duplicate"}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Pomodoro Format</span>
              <span className="font-medium">
                {{
                  classic_25_5: "25/5 Classic",
                  deep_work_50_10: "50/10 Deep Work",
                  custom: "Custom",
                }[project.pomodoro_preset] || "Custom"}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditingConfig(!editingConfig)}
            >
              {editingConfig ? "Cancel" : "Edit configuration"}
            </Button>
            {editingConfig && config && (
              <div className="space-y-3 border-t pt-3">
                <div className="space-y-1">
                  <Label>Pomodoro Format</Label>
                  <Select
                    value={config.pomodoroPreset}
                    onValueChange={setConfigPreset}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue>
                        {(value) => PRESET_LABELS[value] || "Custom"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="classic_25_5">
                        25/5 Classic Pomodoro
                      </SelectItem>
                      <SelectItem value="deep_work_50_10">
                        50/10 Deep Work Pomodoro
                      </SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <label className="space-y-1">
                    <span>Focus</span>
                    <Input
                      type="number"
                      min="1"
                      value={config.focusDurationMinutes}
                      onChange={(event) =>
                        updateConfigValue(
                          "focusDurationMinutes",
                          Number(event.target.value),
                        )
                      }
                    />
                  </label>
                  <label className="space-y-1">
                    <span>Break</span>
                    <Input
                      type="number"
                      min="0"
                      value={config.breakDurationMinutes}
                      onChange={(event) =>
                        updateConfigValue(
                          "breakDurationMinutes",
                          Number(event.target.value),
                        )
                      }
                    />
                  </label>
                  <label className="space-y-1">
                    <span>Sessions</span>
                    <Input
                      type="number"
                      min="1"
                      value={config.sessionCount}
                      onChange={(event) =>
                        updateConfigValue(
                          "sessionCount",
                          Number(event.target.value),
                        )
                      }
                    />
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={config.includeFinalBreak}
                    onCheckedChange={(value) =>
                      updateConfigValue("includeFinalBreak", value)
                    }
                  />
                  <Label>Include Final Break</Label>
                </div>
                <Button size="sm" onClick={saveConfig} disabled={savingConfig}>
                  {savingConfig ? "Saving..." : "Save configuration"}
                </Button>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Focus Duration</span>
              <span className="font-medium">
                {project.focus_duration_minutes}m
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Break Duration</span>
              <span className="font-medium">
                {project.break_duration_minutes}m
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Sessions</span>
              <span className="font-medium">{project.session_count}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Duration</span>
              <span className="font-medium">
                {Math.floor(project.total_duration_seconds / 60)}m{" "}
                {project.total_duration_seconds % 60}s
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Assets</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {project.assets.length === 0 ? (
              <p className="text-muted-foreground">No assets uploaded.</p>
            ) : (
              project.assets.map((a) => (
                <div
                  key={a.id}
                  className="flex justify-between border-b pb-2 last:border-0"
                >
                  <span className="text-muted-foreground">{a.type}</span>
                  <span
                    className="font-medium truncate max-w-[200px]"
                    title={a.original_name}
                  >
                    {a.original_name}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Project Audio Library</CardTitle>
          <CardDescription>
            Upload a track once, then reuse it in any session. Session bell is
            optional.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Audio Tracks</label>
              <input
                type="file"
                accept="audio/mpeg,audio/wav,audio/mp4,audio/x-m4a"
                multiple
                disabled={uploadingAudio}
                onChange={(event) => uploadAudioFiles(event, "audio_track")}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Session Bell</label>
              <input
                type="file"
                accept="audio/mpeg,audio/wav,audio/mp4,audio/x-m4a"
                disabled={uploadingAudio}
                onChange={(event) => uploadAudioFiles(event, "session_bell")}
              />
            </div>
          </div>
          {project.assets.filter((asset) =>
            ["audio", "break_audio", "audio_track", "session_bell"].includes(
              asset.type,
            ),
          ).length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No audio tracks uploaded yet.
            </p>
          ) : (
            project.assets
              .filter((asset) =>
                [
                  "audio",
                  "break_audio",
                  "audio_track",
                  "session_bell",
                ].includes(asset.type),
              )
              .map((asset) => (
                <div
                  key={asset.id}
                  className="flex items-center justify-between gap-3 border-b pb-2 last:border-0"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {asset.original_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {asset.duration_seconds
                        ? `${Math.round(asset.duration_seconds)}s · `
                        : ""}
                      {formatBytes(asset.size_bytes || 0)} · {asset.type}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeAudio(asset.id)}
                  >
                    Remove
                  </Button>
                </div>
              ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Session Audio Mapping</CardTitle>
          <CardDescription>
            Every rendered focus and break segment needs an explicit selected
            track once mapping is saved.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {mappingSaved && (
            <Alert>
              <AlertDescription>Session audio mappings saved.</AlertDescription>
            </Alert>
          )}
          {(() => {
            const audioAssets = project.assets.filter((asset) =>
              ["audio", "break_audio", "audio_track", "session_bell"].includes(
                asset.type,
              ),
            );
            const updateRow = (sessionIndex, field, value) =>
              setSessionRows(
                sessionRows.map((row) =>
                  row.sessionIndex === sessionIndex
                    ? { ...row, [field]: value }
                    : row,
                ),
              );
            return (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Session Bell</label>
                  <select
                    className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                    value={bellAssetId}
                    onChange={(event) => setBellAssetId(event.target.value)}
                  >
                    <option value="">No bell</option>
                    {audioAssets.map((asset) => (
                      <option key={asset.id} value={asset.id}>
                        {asset.original_name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground">
                    Played at the beginning of every focus and break segment.
                  </p>
                </div>
                {sessionRows.map((row) => {
                  const needsBreak =
                    row.sessionIndex < project.session_count ||
                    Boolean(project.include_final_break);
                  return (
                    <div
                      key={row.sessionIndex}
                      className="grid gap-3 rounded-lg border p-3 md:grid-cols-2"
                    >
                      <p className="font-medium md:col-span-2">
                        Session {row.sessionIndex}
                      </p>
                      <label className="space-y-1 text-sm">
                        Focus track
                        <select
                          className="mt-1 h-8 w-full rounded-lg border border-input bg-transparent px-2.5"
                          value={row.focusAudioAssetId || ""}
                          onChange={(event) =>
                            updateRow(
                              row.sessionIndex,
                              "focusAudioAssetId",
                              event.target.value,
                            )
                          }
                        >
                          <option value="">Select focus audio</option>
                          {audioAssets.map((asset) => (
                            <option key={asset.id} value={asset.id}>
                              {asset.original_name}
                            </option>
                          ))}
                        </select>
                      </label>
                      {needsBreak && (
                        <label className="space-y-1 text-sm">
                          Break track
                          <select
                            className="mt-1 h-8 w-full rounded-lg border border-input bg-transparent px-2.5"
                            value={row.breakAudioAssetId || ""}
                            onChange={(event) =>
                              updateRow(
                                row.sessionIndex,
                                "breakAudioAssetId",
                                event.target.value,
                              )
                            }
                          >
                            <option value="">Select break audio</option>
                            {audioAssets.map((asset) => (
                              <option key={asset.id} value={asset.id}>
                                {asset.original_name}
                              </option>
                            ))}
                          </select>
                        </label>
                      )}
                    </div>
                  );
                })}
                {sessionRows.some(
                  (row) =>
                    !row.focusAudioAssetId ||
                    ((row.sessionIndex < project.session_count ||
                      Boolean(project.include_final_break)) &&
                      !row.breakAudioAssetId),
                ) && (
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    Missing selections are saved as warnings; mapped renders
                    will fail with the affected session name until completed.
                  </p>
                )}
                <Button
                  onClick={saveMappings}
                  disabled={savingAudio || uploadingAudio}
                >
                  {savingAudio ? "Saving..." : "Save Session Audio"}
                </Button>
              </>
            );
          })()}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Render Controls</CardTitle>
          <CardDescription>Generate your final output video</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex gap-4">
            <Button
              variant="outline"
              onClick={() => handleStartRender("preview")}
              disabled={
                polling || ["queued", "rendering"].includes(project.status)
              }
            >
              Generate Preview
            </Button>
            <Button
              onClick={() => handleStartRender("final")}
              disabled={
                polling || ["queued", "rendering"].includes(project.status)
              }
            >
              Start Final Render
            </Button>
          </div>

          {(job ||
            polling ||
            ["queued", "rendering"].includes(project.status)) && (
            <div className="bg-secondary p-4 rounded-lg space-y-3">
              <div className="flex justify-between text-sm font-medium">
                <span>{job?.currentStep || "Initializing..."}</span>
                <span>{Math.round(job?.progress || 0)}%</span>
              </div>
              <Progress value={job?.progress || 0} />

              <div className="flex justify-between text-xs text-muted-foreground mt-2">
                {job?.startedAt && (
                  <span>
                    Started: {new Date(job.startedAt).toLocaleTimeString()}
                  </span>
                )}
                {job?.completedAt && (
                  <span>
                    Completed: {new Date(job.completedAt).toLocaleTimeString()}
                  </span>
                )}
              </div>

              {job?.errorMessage && (
                <p className="text-red-600 dark:text-red-300 text-sm mt-2 font-medium">
                  Error: {job.errorMessage}
                </p>
              )}
            </div>
          )}

          {project.preview_path && (
            <div className="mt-4 space-y-2">
              <h3 className="font-medium">Preview Video</h3>
              <video
                src={`http://localhost:4000${project.preview_path}`}
                controls
                className="w-full max-w-lg rounded-md border"
              />
            </div>
          )}

          {project.status === "completed" && project.output_path && (
            <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900/60 dark:bg-green-950/30">
              <h3 className="mb-2 font-medium text-green-800 dark:text-green-300">
                Render Complete!
              </h3>
              <Button asChild>
                <a
                  href={`http://localhost:4000${project.output_path}`}
                  target="_blank"
                  rel="noreferrer"
                  download
                >
                  Download Video
                </a>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {project.status === "completed" && project.output_path && (
        <YoutubeUploadPanel project={project} />
      )}
    </div>
  );
}
