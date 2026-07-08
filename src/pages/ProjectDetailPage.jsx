import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getProject,
  startPreviewRender,
  startFinalRender,
  getRenderJob,
  duplicateProject,
  deleteProject,
} from "../lib/api";
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
import YoutubeUploadPanel from "../components/YoutubeUploadPanel";

export default function ProjectDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [job, setJob] = useState(null);
  const [polling, setPolling] = useState(false);
  const [error, setError] = useState(null);
  const [duplicating, setDuplicating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchProject();
  }, [id]);

  const fetchProject = async () => {
    try {
      const data = await getProject(id);
      setProject(data);
    } catch (err) {
      setError(err.message);
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
      setError(err.message);
    }
  };

  const handleDuplicate = async () => {
    try {
      setDuplicating(true);
      const newProject = await duplicateProject(id);
      navigate(`/projects/${newProject.id}`);
    } catch (err) {
      setError(err.message);
      setDuplicating(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this project? Local files and project data will be deleted.")) return;
    try {
      setDeleting(true);
      await deleteProject(id);
      navigate("/");
    } catch (err) {
      setError(err.message);
      setDeleting(false);
    }
  };

  if (loading) return <div className="p-8">Loading project...</div>;
  if (error && !project)
    return <div className="p-8 text-red-500">Error: {error}</div>;
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
          <CardContent className="space-y-2 text-sm">
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
                <p className="text-red-500 text-sm mt-2 font-medium">
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
            <div className="mt-4 p-4 border border-green-200 bg-green-50 dark:bg-green-950/20 rounded-lg">
              <h3 className="font-medium text-green-800 dark:text-green-400 mb-2">
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
