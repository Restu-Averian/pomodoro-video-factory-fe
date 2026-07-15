import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  PlusCircle,
  User,
  ChevronDown,
  FileText,
  Folder,
  Timer,
  Hourglass,
  AudioLines,
  CloudUpload,
  Play,
} from "lucide-react";
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
    <div className="flex-1 flex flex-col min-h-0 text-foreground">
      {/* Top Header */}
      <header className="flex h-[60px] shrink-0 items-center justify-between border-b border-border/10 px-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
          <PlusCircle className="w-4 h-4 text-orange-400" />
          <span>Create Project</span>
        </div>
        <button className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border/20 bg-[#241e1a] hover:bg-white/5 transition-colors">
          <User className="w-4 h-4 text-muted-foreground" />
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </header>

      <div className="p-8 space-y-8 max-w-[1000px] w-full mx-auto overflow-y-auto pb-20">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Create Project
        </h1>

        {error && (
          <Alert
            variant="destructive"
            className="bg-red-950/20 border-red-900/30 text-red-400"
          >
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="rounded-2xl bg-[#241e1a] border-border/10 shadow-none overflow-hidden">
            <div className="p-6 border-b border-border/5 flex items-center gap-2">
              <FileText className="w-5 h-5 text-orange-400" />
              <h2 className="text-base font-semibold text-foreground">
                Project Info
              </h2>
            </div>
            <CardContent className="p-6 space-y-5">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Title</Label>
                <Input
                  className="bg-[#1a1715] border-border/20 h-11 text-foreground"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Rainy Coding Room"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Description</Label>
                <Textarea
                  className="bg-[#1a1715] border-border/20 min-h-[100px] text-foreground resize-none"
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  placeholder="Optional description"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl bg-[#241e1a] border-border/10 shadow-none overflow-hidden">
            <div className="p-6 border-b border-border/5 flex items-center gap-2">
              <Folder className="w-5 h-5 text-orange-400" />
              <h2 className="text-base font-semibold text-foreground">
                Assets
              </h2>
            </div>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-2">
                <Label className="text-foreground">Focus Video (MP4)</Label>
                <Input
                  type="file"
                  accept="video/*"
                  className="bg-[#1a1715] border-border/20 h-11 text-muted-foreground file:bg-[#27211d] file:text-foreground file:border-0 file:border-r file:border-border/20 file:mr-4 file:px-4 file:h-full file:font-medium hover:file:bg-white/10 file:transition-colors file:cursor-pointer overflow-hidden p-0"
                  onChange={(e) =>
                    setFiles({ ...files, focusVideo: e.target.files[0] })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Break Video (MP4)</Label>
                <Input
                  type="file"
                  accept="video/*"
                  className="bg-[#1a1715] border-border/20 h-11 text-muted-foreground file:bg-[#27211d] file:text-foreground file:border-0 file:border-r file:border-border/20 file:mr-4 file:px-4 file:h-full file:font-medium hover:file:bg-white/10 file:transition-colors file:cursor-pointer overflow-hidden p-0"
                  onChange={(e) =>
                    setFiles({ ...files, breakVideo: e.target.files[0] })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">
                  Session Bell — Optional
                </Label>
                <p className="text-xs text-muted-foreground">
                  Played at the beginning of every Focus and Break segment.
                </p>
                <Input
                  type="file"
                  accept="audio/mpeg,audio/wav,audio/mp4,audio/x-m4a"
                  className="bg-[#1a1715] border-border/20 h-11 text-muted-foreground file:bg-[#27211d] file:text-foreground file:border-0 file:border-r file:border-border/20 file:mr-4 file:px-4 file:h-full file:font-medium hover:file:bg-white/10 file:transition-colors file:cursor-pointer overflow-hidden p-0"
                  onChange={(e) =>
                    setFiles({
                      ...files,
                      sessionBell: e.target.files[0] || null,
                    })
                  }
                />
              </div>
              <details className="rounded-lg border border-border/20 bg-[#1a1715] overflow-hidden group">
                <summary className="cursor-pointer text-sm font-medium p-4 flex items-center gap-2 hover:bg-white/5 transition-colors">
                  <Play className="w-4 h-4 text-muted-foreground group-open:rotate-90 transition-transform" />
                  Legacy Audio Fallback
                </summary>
                <div className="px-4 pb-4">
                  <p className="mt-2 text-xs text-muted-foreground">
                    Only for legacy fallback projects. New projects should use
                    the project audio library and session mapping.
                  </p>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <label className="space-y-2 text-sm text-foreground">
                      Legacy Focus Audio
                      <Input
                        type="file"
                        accept="audio/*"
                        className="bg-[#161311] border-border/20 h-11 text-muted-foreground file:bg-[#27211d] file:text-foreground file:border-0 file:border-r file:border-border/20 file:mr-4 file:px-4 file:h-full file:font-medium hover:file:bg-white/10 file:transition-colors file:cursor-pointer overflow-hidden p-0"
                        onChange={(e) =>
                          setFiles({ ...files, audio: e.target.files[0] })
                        }
                      />
                    </label>
                    <label className="space-y-2 text-sm text-foreground">
                      Legacy Break Audio
                      <Input
                        type="file"
                        accept="audio/*"
                        className="bg-[#161311] border-border/20 h-11 text-muted-foreground file:bg-[#27211d] file:text-foreground file:border-0 file:border-r file:border-border/20 file:mr-4 file:px-4 file:h-full file:font-medium hover:file:bg-white/10 file:transition-colors file:cursor-pointer overflow-hidden p-0"
                        onChange={(e) =>
                          setFiles({ ...files, breakAudio: e.target.files[0] })
                        }
                      />
                    </label>
                  </div>
                </div>
              </details>
            </CardContent>
          </Card>

          <Card className="rounded-2xl bg-[#241e1a] border-border/10 shadow-none overflow-hidden">
            <div className="p-6 border-b border-border/5 flex items-center gap-2">
              <Timer className="w-5 h-5 text-orange-400" />
              <h2 className="text-base font-semibold text-foreground">
                Pomodoro Config
              </h2>
            </div>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-2">
                <Label className="text-foreground">Pomodoro Format</Label>
                <Select value={form.pomodoroPreset} onValueChange={setPreset}>
                  <SelectTrigger className="w-full bg-[#1a1715] border-border/20 h-11 text-foreground">
                    <SelectValue>
                      {(value) => POMODORO_PRESET_LABELS[value] || "Custom"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="bg-[#241e1a] border-border/20 text-foreground">
                    <SelectItem
                      value="classic_25_5"
                      className="hover:bg-white/5 focus:bg-white/5 focus:text-foreground"
                    >
                      25/5 Classic Pomodoro
                    </SelectItem>
                    <SelectItem
                      value="deep_work_50_10"
                      className="hover:bg-white/5 focus:bg-white/5 focus:text-foreground"
                    >
                      50/10 Deep Work Pomodoro
                    </SelectItem>
                    <SelectItem
                      value="custom"
                      className="hover:bg-white/5 focus:bg-white/5 focus:text-foreground"
                    >
                      Custom
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground pt-1">
                  Focus: {form.focusDurationMinutes} min · Break:{" "}
                  {form.breakDurationMinutes} min · Sessions:{" "}
                  {form.sessionCount} · Final break:{" "}
                  {form.includeFinalBreak ? "Included" : "Excluded"}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-foreground">
                    Focus Duration (minutes)
                  </Label>
                  <Input
                    type="number"
                    min="1"
                    className="bg-[#1a1715] border-border/20 h-11 text-foreground"
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
                  <Label className="text-foreground">
                    Break Duration (minutes)
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    className="bg-[#1a1715] border-border/20 h-11 text-foreground"
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

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-foreground">Session Count</Label>
                  <Input
                    type="number"
                    min="1"
                    className="bg-[#1a1715] border-border/20 h-11 text-foreground"
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
                  <Label className="text-foreground">Timer Text Color</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      className="w-12 h-11 p-1 bg-[#1a1715] border-border/20 cursor-pointer rounded-md overflow-hidden"
                      value={form.timerTextColor}
                      onChange={(e) =>
                        setForm({ ...form, timerTextColor: e.target.value })
                      }
                    />
                    <Input
                      type="text"
                      className="flex-1 bg-[#1a1715] border-border/20 h-11 text-foreground"
                      value={form.timerTextColor}
                      onChange={(e) =>
                        setForm({ ...form, timerTextColor: e.target.value })
                      }
                      placeholder="#ffffff"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-3 pt-2">
                <Switch
                  className="data-[state=checked]:bg-orange-400"
                  checked={form.includeFinalBreak}
                  onCheckedChange={(v) =>
                    updateControlledValue("includeFinalBreak", v)
                  }
                />
                <Label className="text-foreground font-medium cursor-pointer">
                  Include Final Break
                </Label>
              </div>

              <div className="mt-6 p-4 bg-[#1a1715] border border-border/10 rounded-xl flex items-center gap-3">
                <Hourglass className="w-5 h-5 text-orange-400" />
                <p className="font-semibold text-sm text-foreground">
                  Estimated duration:{" "}
                  <span className="text-muted-foreground">
                    {estimatedDuration}
                  </span>
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

          <Card className="rounded-2xl bg-[#241e1a] border-border/10 shadow-none overflow-hidden">
            <div className="p-6 border-b border-border/5 flex items-center gap-2">
              <AudioLines className="w-5 h-5 text-orange-400" />
              <h2 className="text-base font-semibold text-foreground">
                Session Audio Mapping
              </h2>
            </div>
            <CardContent className="p-6 space-y-6">
              <p className="text-sm text-muted-foreground">
                Each selected file is uploaded once for this segment and saved
                as an audio asset ID.
              </p>
              <div className="space-y-4">
                {sessionMappings.map((row) => {
                  const needsBreak =
                    row.sessionIndex < form.sessionCount ||
                    form.includeFinalBreak;
                  return (
                    <div
                      key={row.sessionIndex}
                      className="grid gap-6 rounded-xl border border-border/10 bg-[#1a1715] p-5 md:grid-cols-2"
                    >
                      <p className="font-medium text-sm text-foreground md:col-span-2">
                        Session {row.sessionIndex}
                      </p>
                      <label className="space-y-2 text-sm text-foreground">
                        Focus Audio
                        <Input
                          type="file"
                          accept="audio/mpeg,audio/wav,audio/mp4,audio/x-m4a"
                          className="bg-[#241e1a] border-border/20 h-11 text-muted-foreground file:bg-[#27211d] file:text-foreground file:border-0 file:border-r file:border-border/20 file:mr-4 file:px-4 file:h-full file:font-medium hover:file:bg-white/10 file:transition-colors file:cursor-pointer overflow-hidden p-0"
                          onChange={(event) =>
                            updateSessionFile(
                              row.sessionIndex,
                              "focusAudioFile",
                              event.target.files[0] || null,
                            )
                          }
                        />
                        {row.focusAudioFile && (
                          <span className="block text-xs text-muted-foreground mt-2">
                            {row.focusAudioFile.name}
                          </span>
                        )}
                      </label>
                      {needsBreak && (
                        <label className="space-y-2 text-sm text-foreground">
                          Break Audio
                          <Input
                            type="file"
                            accept="audio/mpeg,audio/wav,audio/mp4,audio/x-m4a"
                            className="bg-[#241e1a] border-border/20 h-11 text-muted-foreground file:bg-[#27211d] file:text-foreground file:border-0 file:border-r file:border-border/20 file:mr-4 file:px-4 file:h-full file:font-medium hover:file:bg-white/10 file:transition-colors file:cursor-pointer overflow-hidden p-0"
                            onChange={(event) =>
                              updateSessionFile(
                                row.sessionIndex,
                                "breakAudioFile",
                                event.target.files[0] || null,
                              )
                            }
                          />
                          {row.breakAudioFile && (
                            <span className="block text-xs text-muted-foreground mt-2">
                              {row.breakAudioFile.name}
                            </span>
                          )}
                        </label>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-14 bg-orange-400 hover:bg-orange-500 text-orange-950 font-bold rounded-xl transition-colors text-base"
          >
            <CloudUpload className="w-5 h-5 mr-2" />
            {loading ? "Creating Project..." : "Create Project & Upload Audio"}
          </Button>
        </form>
      </div>
    </div>
  );
}
