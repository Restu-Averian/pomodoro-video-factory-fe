import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Switch } from "./ui/switch";
import { API_BASE_URL } from "../lib/utils";
import { generateYouTubeMetadata, checkOllamaHealth } from "../lib/api";
import { Video, ExternalLink, Sparkles, AlertCircle } from "lucide-react";

export default function YoutubeUploadPanel({ project }) {
  const [jobs, setJobs] = useState([]);
  const [polling, setPolling] = useState(false);
  const [formData, setFormData] = useState({
    title: project.youtube_title_draft || project.title || "",
    description: project.youtube_description_draft || project.description || "",
    tags: "pomodoro, focus, study with me",
    privacyStatus: "private",
    scheduledAt: "",
    madeForKids: false,
    containsSyntheticMedia: true,
  });
  const [showMetadataModal, setShowMetadataModal] = useState(false);
  const [metadataTheme, setMetadataTheme] = useState(
    project.youtube_metadata_theme || "",
  );
  const [metadataLoading, setMetadataLoading] = useState(false);
  const [metadataError, setMetadataError] = useState(null);
  const [metadataWarning, setMetadataWarning] = useState(null);
  const [replaceWarning, setReplaceWarning] = useState(false);
  const [aiStatus, setAiStatus] = useState("checking");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchJobs();
    checkOllamaHealth().then((res) => {
      setAiStatus(res.reachable ? "ready" : "unavailable");
    });
  }, [project.id]);

  useEffect(() => {
    let interval;
    if (polling) {
      interval = setInterval(() => {
        fetchJobs();
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [polling]);

  const fetchJobs = async () => {
    try {
      const res = await fetch(
        `${API_BASE_URL}/projects/${project.id}/upload-jobs`,
      );
      if (res.ok) {
        const data = await res.json();
        setJobs(data);
        const hasActiveJobs = data.some((j) =>
          ["queued", "uploading"].includes(j.status),
        );
        setPolling(hasActiveJobs);
      }
    } catch (err) {
      console.error("Failed to fetch jobs", err);
    }
  };

  const handleGenerateClick = () => {
    setMetadataError(null);
    setMetadataWarning(null);
    setReplaceWarning(false);
    setShowMetadataModal(true);
  };

  const submitGenerate = async (forceReplace = false) => {
    if (!forceReplace && (formData.title || formData.description)) {
      setReplaceWarning(true);
      return;
    }

    setMetadataLoading(true);
    setMetadataError(null);
    setMetadataWarning(null);
    try {
      const result = await generateYouTubeMetadata(project.id, {
        theme: metadataTheme,
      });
      setFormData((prev) => ({
        ...prev,
        title: result.title,
        description: result.description,
      }));
      if (result.source === "fallback") {
        setMetadataWarning(
          result.warning?.message ||
            "Local AI was unavailable, so a deterministic fallback description was generated.",
        );
      }
      setShowMetadataModal(false);
      setReplaceWarning(false);
    } catch (err) {
      setMetadataError(err.message);
    } finally {
      setMetadataLoading(false);
    }
  };

  const handleUpload = async () => {
    setLoading(true);
    setError(null);
    try {
      const tagsArray = formData.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const payload = {
        title: formData.title,
        description: formData.description,
        tags: tagsArray,
        privacyStatus: formData.privacyStatus,
        scheduledAt: formData.scheduledAt
          ? new Date(formData.scheduledAt).toISOString()
          : null,
        madeForKids: formData.madeForKids,
        containsSyntheticMedia: formData.containsSyntheticMedia,
      };

      const res = await fetch(
        `${API_BASE_URL}/projects/${project.id}/youtube/upload`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error?.message || "Upload failed");
      }

      fetchJobs();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const currentJob = jobs[0]; // Most recent job

  return (
    <Card className="border-red-100 dark:border-red-900/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Video className="w-5 h-5 text-red-500" />
          Upload to YouTube
        </CardTitle>
        <CardDescription>
          Publish your completed video directly to YouTube.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {currentJob && (
          <div className="bg-secondary p-4 rounded-lg mb-4 space-y-2 text-sm">
            <div className="flex justify-between items-center font-medium">
              <span>Status: {currentJob.status.toUpperCase()}</span>
              {currentJob.youtube_video_id && (
                <a
                  href={`https://youtube.com/watch?v=${currentJob.youtube_video_id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-500 hover:underline flex items-center gap-1"
                >
                  View on YouTube <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
            {currentJob.error_message && (
              <p className="text-red-500 mt-1">{currentJob.error_message}</p>
            )}
            {currentJob.scheduled_at && currentJob.status === "scheduled" && (
              <p className="text-muted-foreground mt-1">
                Scheduled for:{" "}
                {new Date(currentJob.scheduled_at).toLocaleString()}
              </p>
            )}
          </div>
        )}

        {(!currentJob ||
          ["failed", "completed", "scheduled", "uploaded"].includes(
            currentJob.status,
          )) && (
          <div className="space-y-4">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  YouTube Metadata
                </h3>
                <span className="text-xs text-muted-foreground">
                  {aiStatus === "ready"
                    ? "Local AI ready"
                    : aiStatus === "unavailable"
                      ? "Local AI unavailable"
                      : "Checking AI..."}
                </span>
              </div>

              {metadataWarning && (
                <div className="p-3 bg-blue-50 dark:bg-blue-950/50 text-blue-900 dark:text-blue-200 rounded-md text-sm flex gap-2">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <p>{metadataWarning}</p>
                </div>
              )}

              <Button
                type="button"
                variant="secondary"
                onClick={handleGenerateClick}
                className="w-full sm:w-auto self-start flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Generate Title & Description
              </Button>
            </div>

            <div className="grid gap-2 mt-2">
              <Label htmlFor="yt-title">Video Title</Label>
              <Input
                id="yt-title"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder="4 Hours Deep Work Music..."
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="yt-desc">Description</Label>
              <Textarea
                id="yt-desc"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Focus music for coding..."
                rows={3}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="yt-tags">Tags (comma separated)</Label>
              <Input
                id="yt-tags"
                value={formData.tags}
                onChange={(e) =>
                  setFormData({ ...formData, tags: e.target.value })
                }
              />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Visibility</Label>
                <Select
                  value={formData.privacyStatus}
                  onValueChange={(v) =>
                    setFormData({ ...formData, privacyStatus: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select visibility" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="private">Private</SelectItem>
                    <SelectItem value="unlisted">Unlisted</SelectItem>
                    <SelectItem value="public">Public</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="yt-schedule">Schedule (Optional)</Label>
                <Input
                  id="yt-schedule"
                  type="datetime-local"
                  value={formData.scheduledAt}
                  onChange={(e) =>
                    setFormData({ ...formData, scheduledAt: e.target.value })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Requires 'Private' visibility until published.
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <Switch
                id="yt-synthetic"
                checked={formData.containsSyntheticMedia}
                onCheckedChange={(v) =>
                  setFormData({ ...formData, containsSyntheticMedia: v })
                }
              />
              <Label htmlFor="yt-synthetic" className="font-normal">
                Altered or synthetic content (e.g. AI generated)
              </Label>
            </div>
          </div>
        )}
      </CardContent>

      {showMetadataModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md shadow-lg border-muted">
            <CardHeader>
              <CardTitle>Generate YouTube Title & Description</CardTitle>
              <CardDescription>
                The title format, duration, Pomodoro format, timestamps, and
                session data will be generated from this completed project.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {replaceWarning ? (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/50 text-amber-900 dark:text-amber-200 rounded-md text-sm flex gap-2">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <p>
                    Generating new metadata will replace the current title and
                    description.
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid gap-2">
                    <Label htmlFor="meta-theme">Theme</Label>
                    <Input
                      id="meta-theme"
                      value={metadataTheme}
                      onChange={(e) => setMetadataTheme(e.target.value)}
                      placeholder="Rainy Window Study"
                      maxLength={80}
                    />
                  </div>
                  {metadataError && (
                    <p className="text-sm text-red-500">{metadataError}</p>
                  )}
                </>
              )}
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowMetadataModal(false);
                  setReplaceWarning(false);
                }}
                disabled={metadataLoading}
              >
                Cancel
              </Button>
              {replaceWarning ? (
                <Button
                  variant="default"
                  onClick={() => submitGenerate(true)}
                  disabled={metadataLoading}
                >
                  {metadataLoading ? "Generating..." : "Replace & Generate"}
                </Button>
              ) : (
                <Button
                  variant="default"
                  onClick={() => submitGenerate(false)}
                  disabled={metadataLoading || !metadataTheme.trim()}
                >
                  {metadataLoading ? "Generating..." : "Generate"}
                </Button>
              )}
            </CardFooter>
          </Card>
        </div>
      )}

      {(!currentJob ||
        ["failed", "completed", "scheduled", "uploaded"].includes(
          currentJob.status,
        )) && (
        <CardFooter className="flex-col items-start gap-2">
          {error && <p className="text-sm text-red-500 font-medium">{error}</p>}
          <Button
            onClick={handleUpload}
            disabled={loading || !formData.title}
            className="w-full sm:w-auto"
          >
            {loading ? "Starting Upload..." : "Start Upload"}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
