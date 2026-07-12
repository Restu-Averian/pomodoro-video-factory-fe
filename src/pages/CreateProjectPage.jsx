import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  createProject,
  saveSessionAudio,
  uploadProjectAsset,
} from "../lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

const POMODORO_PRESET_LABELS = {
  classic_25_5: "25/5 Classic Pomodoro",
  deep_work_50_10: "50/10 Deep Work Pomodoro",
  custom: "Custom",
};

function matchingPreset(form) {
  return (
    Object.entries(POMODORO_PRESETS).find(([, preset]) =>
      Object.entries(preset).every(([field, value]) => form[field] === value),
    )?.[0] || "custom"
  );
}

export default function CreateProjectPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [sessionMappings, setSessionMappings] = useState(() =>
    Array.from({ length: 4 }, (_, index) => ({
      sessionIndex: index + 1,
      focusAudioFile: null,
      breakAudioFile: null,
    })),
  );

  const [form, setForm] = useState({
    title: "",
    description: "",
    pomodoroPreset: "classic_25_5",
    focusDurationMinutes: 25,
    breakDurationMinutes: 5,
    sessionCount: 4,
    includeFinalBreak: true,
    timerTextColor: "#ffffff",
    outputResolution: "1920x1080",
  });

  const [files, setFiles] = useState({
    focusVideo: null,
    breakVideo: null,
    audio: null,
    breakAudio: null,
    sessionBell: null,
  });

  const resizeMappings = (sessionCount) => {
    setSessionMappings((current) =>
      Array.from(
        { length: sessionCount },
        (_, index) =>
          current.find((row) => row.sessionIndex === index + 1) || {
            sessionIndex: index + 1,
            focusAudioFile: null,
            breakAudioFile: null,
          },
      ),
    );
  };

  const estimatedDuration = useMemo(() => {
    const focus = form.focusDurationMinutes;
    const brk = form.breakDurationMinutes;
    const count = form.sessionCount;

    let totalMins = 0;
    if (form.includeFinalBreak) {
      totalMins = count * (focus + brk);
    } else {
      totalMins = count * focus + (count - 1) * brk;
    }

    if (isNaN(totalMins) || totalMins < 0) return "0h 0m";
    const hrs = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    return `${hrs}h ${mins}m`;
  }, [form]);

  const setPreset = (pomodoroPreset) => {
    const nextForm = {
      ...form,
      pomodoroPreset,
      ...(POMODORO_PRESETS[pomodoroPreset] || {}),
    };
    setForm(nextForm);
    resizeMappings(nextForm.sessionCount);
  };

  const updateControlledValue = (field, value) => {
    const nextForm = { ...form, [field]: value };
    setForm({ ...nextForm, pomodoroPreset: matchingPreset(nextForm) });
    if (field === "sessionCount") resizeMappings(nextForm.sessionCount);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const incomplete = sessionMappings.find(
      (row) =>
        !row.focusAudioFile ||
        ((row.sessionIndex < form.sessionCount || form.includeFinalBreak) &&
          !row.breakAudioFile),
    );
    if (!form.title || !files.focusVideo || !files.breakVideo || incomplete) {
      setError(
        incomplete
          ? `Select audio files for Session ${incomplete.sessionIndex}.`
          : "Title and both video files are required.",
      );
      return;
    }

    setLoading(true);
    setError(null);
    setUploadProgress(0);

    try {
      // 1. Create project
      const project = await createProject(form);
      setUploadProgress(20);

      // 2. Upload assets (could do Promise.all but sequential is safer for progress)
      await uploadProjectAsset(project.id, "focus_video", files.focusVideo);
      setUploadProgress(40);

      await uploadProjectAsset(project.id, "break_video", files.breakVideo);
      setUploadProgress(60);

      if (files.audio)
        await uploadProjectAsset(project.id, "audio", files.audio);
      if (files.breakAudio) {
        await uploadProjectAsset(project.id, "break_audio", files.breakAudio);
      }
      const bell = files.sessionBell
        ? await uploadProjectAsset(
            project.id,
            "session_bell",
            files.sessionBell,
          )
        : null;

      const sessions = [];
      for (const row of sessionMappings) {
        const focus = await uploadProjectAsset(
          project.id,
          "audio_track",
          row.focusAudioFile,
        );
        const needsBreak =
          row.sessionIndex < form.sessionCount || form.includeFinalBreak;
        const breakTrack = needsBreak
          ? await uploadProjectAsset(
              project.id,
              "audio_track",
              row.breakAudioFile,
            )
          : null;
        sessions.push({
          sessionIndex: row.sessionIndex,
          focusAudioAssetId: focus.id,
          breakAudioAssetId: breakTrack?.id || null,
        });
      }
      setUploadProgress(100);

      await saveSessionAudio(project.id, {
        bellAssetId: bell?.id || null,
        sessions,
      });
      navigate(`/projects/${project.id}`);
    } catch (err) {
      setError(err.message || "Failed to create project");
      setLoading(false);
    }
  };

  const updateSessionFile = (sessionIndex, field, value) => {
    setSessionMappings((current) =>
      current.map((row) =>
        row.sessionIndex === sessionIndex ? { ...row, [field]: value } : row,
      ),
    );
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Create Project</h1>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Project Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Rainy Coding Room"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="Optional description"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Assets</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Focus Video (MP4)</Label>
              <Input
                type="file"
                accept="video/*"
                onChange={(e) =>
                  setFiles({ ...files, focusVideo: e.target.files[0] })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Break Video (MP4)</Label>
              <Input
                type="file"
                accept="video/*"
                onChange={(e) =>
                  setFiles({ ...files, breakVideo: e.target.files[0] })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Session Bell — Optional</Label>
              <p className="text-xs text-muted-foreground">
                Played at the beginning of every Focus and Break segment.
              </p>
              <Input
                type="file"
                accept="audio/mpeg,audio/wav,audio/mp4,audio/x-m4a"
                onChange={(e) =>
                  setFiles({ ...files, sessionBell: e.target.files[0] || null })
                }
              />
            </div>
            <details className="rounded-lg border p-3">
              <summary className="cursor-pointer text-sm font-medium">
                Legacy Audio Fallback
              </summary>
              <p className="mt-2 text-xs text-muted-foreground">
                Only for legacy fallback projects. New projects should use the
                project audio library and session mapping.
              </p>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <label className="space-y-1 text-sm">
                  Legacy Focus Audio
                  <Input
                    type="file"
                    accept="audio/*"
                    onChange={(e) =>
                      setFiles({ ...files, audio: e.target.files[0] })
                    }
                  />
                </label>
                <label className="space-y-1 text-sm">
                  Legacy Break Audio
                  <Input
                    type="file"
                    accept="audio/*"
                    onChange={(e) =>
                      setFiles({ ...files, breakAudio: e.target.files[0] })
                    }
                  />
                </label>
              </div>
            </details>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pomodoro Config</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Pomodoro Format</Label>
              <Select value={form.pomodoroPreset} onValueChange={setPreset}>
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {(value) => POMODORO_PRESET_LABELS[value] || "Custom"}
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
              <p className="text-xs text-muted-foreground">
                Focus: {form.focusDurationMinutes} min · Break:{" "}
                {form.breakDurationMinutes} min · Sessions: {form.sessionCount}{" "}
                · Final break:{" "}
                {form.includeFinalBreak ? "Included" : "Excluded"}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Focus Duration (minutes)</Label>
                <Input
                  type="number"
                  min="1"
                  value={form.focusDurationMinutes}
                  onChange={(e) =>
                    updateControlledValue(
                      "focusDurationMinutes",
                      parseInt(e.target.value),
                    )
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Break Duration (minutes)</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.breakDurationMinutes}
                  onChange={(e) =>
                    updateControlledValue(
                      "breakDurationMinutes",
                      parseInt(e.target.value),
                    )
                  }
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Session Count</Label>
                <Input
                  type="number"
                  min="1"
                  value={form.sessionCount}
                  onChange={(e) =>
                    updateControlledValue(
                      "sessionCount",
                      parseInt(e.target.value),
                    )
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Timer Text Color</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    className="w-12 p-1 cursor-pointer"
                    value={form.timerTextColor}
                    onChange={(e) =>
                      setForm({ ...form, timerTextColor: e.target.value })
                    }
                  />
                  <Input
                    type="text"
                    value={form.timerTextColor}
                    onChange={(e) =>
                      setForm({ ...form, timerTextColor: e.target.value })
                    }
                    placeholder="#ffffff"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <Switch
                checked={form.includeFinalBreak}
                onCheckedChange={(v) =>
                  updateControlledValue("includeFinalBreak", v)
                }
              />
              <Label>Include Final Break</Label>
            </div>

            <div className="mt-4 p-4 bg-secondary rounded-lg">
              <p className="font-semibold text-lg text-secondary-foreground">
                Estimated duration: {estimatedDuration}
              </p>
            </div>
          </CardContent>
        </Card>

        {loading && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Creating & Uploading...</span>
              <span>{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} />
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Session Audio Mapping</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Each selected file is uploaded once for this segment and saved as
              an audio asset ID.
            </p>
            {sessionMappings.map((row) => {
              const needsBreak =
                row.sessionIndex < form.sessionCount || form.includeFinalBreak;
              return (
                <div
                  key={row.sessionIndex}
                  className="grid gap-3 rounded-lg border p-3 md:grid-cols-2"
                >
                  <p className="font-medium md:col-span-2">
                    Session {row.sessionIndex}
                  </p>
                  <label className="space-y-1 text-sm">
                    Focus Audio
                    <Input
                      type="file"
                      accept="audio/mpeg,audio/wav,audio/mp4,audio/x-m4a"
                      onChange={(event) =>
                        updateSessionFile(
                          row.sessionIndex,
                          "focusAudioFile",
                          event.target.files[0] || null,
                        )
                      }
                    />
                    {row.focusAudioFile && (
                      <span className="block text-xs text-muted-foreground">
                        {row.focusAudioFile.name}
                      </span>
                    )}
                  </label>
                  {needsBreak && (
                    <label className="space-y-1 text-sm">
                      Break Audio
                      <Input
                        type="file"
                        accept="audio/mpeg,audio/wav,audio/mp4,audio/x-m4a"
                        onChange={(event) =>
                          updateSessionFile(
                            row.sessionIndex,
                            "breakAudioFile",
                            event.target.files[0] || null,
                          )
                        }
                      />
                      {row.breakAudioFile && (
                        <span className="block text-xs text-muted-foreground">
                          {row.breakAudioFile.name}
                        </span>
                      )}
                    </label>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Button type="submit" disabled={loading} className="w-full" size="lg">
          {loading ? "Creating Project..." : "Create Project & Upload Audio"}
        </Button>
      </form>
    </div>
  );
}
