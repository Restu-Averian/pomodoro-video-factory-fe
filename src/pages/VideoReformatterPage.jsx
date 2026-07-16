import React, { useState, useRef } from "react";
import {
  Upload,
  RefreshCw,
  Download,
  Video,
  Crop,
} from "lucide-react";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../components/ui/card";
import { Label } from "../components/ui/label";
import { API_BASE_URL } from "@/lib/utils";

export default function VideoReformatterPage() {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");

  const [zoom, setZoom] = useState(1.0);
  const [x, setX] = useState(0);
  const [y, setY] = useState(0);
  const [topBar, setTopBar] = useState(0);
  const [bottomBar, setBottomBar] = useState(0);

  const videoRef = useRef(null);
  const containerRef = useRef(null);

  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [initialPos, setInitialPos] = useState({ x: 0, y: 0 });

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      if (!selected.type.startsWith("video/")) {
        setError("Please select a valid video file.");
        return;
      }
      setFile(selected);
      setError("");
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(selected));
      // Reset params
      setZoom(1.0);
      setX(0);
      setY(0);
      setTopBar(0);
      setBottomBar(0);
    }
  };

  const handlePointerDown = (e) => {
    if (!file) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setInitialPos({ x, y });
    e.target.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;
    const container = containerRef.current;
    if (!container) return;

    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;

    const rect = container.getBoundingClientRect();
    const scaleX = 1920 / rect.width;
    const scaleY = 1080 / rect.height;

    const newX = initialPos.x + deltaX * scaleX;
    const newY = initialPos.y + deltaY * scaleY;

    setX(Math.round(newX));
    setY(Math.round(newY));
  };

  const handlePointerUp = (e) => {
    setIsDragging(false);
    e.target.releasePointerCapture(e.pointerId);
  };

  const handleProcess = async () => {
    if (!file) return;
    setIsProcessing(true);
    setError("");

    const formData = new FormData();
    formData.append("video", file);
    formData.append("zoom", zoom);
    formData.append("x", x);
    formData.append("y", y);
    formData.append("topBar", topBar);
    formData.append("bottomBar", bottomBar);

    try {
      const response = await fetch(`${API_BASE_URL}/reformat-video`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        let msg = "Processing failed";
        try {
          const errData = await response.json();
          msg = errData.error || msg;
        } catch (e) {}
        throw new Error(msg);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `reformatted-${Date.now()}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const videoTransform = `translate(${(x / 1920) * 100}%, ${(y / 1080) * 100}%) scale(${zoom})`;
  const topBarPct = (topBar / 1080) * 100;
  const bottomBarPct = (bottomBar / 1080) * 100;

  return (
    <div className="flex-1 flex flex-col min-h-0 text-foreground">
      {/* Top Header */}
      <header className="flex h-[60px] shrink-0 items-center justify-between border-b border-border/10 px-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
          <Crop className="w-4 h-4" />
          <span>Video Reformatter</span>
        </div>
      </header>

      <div className="p-8 space-y-8 max-w-[1400px] w-full mx-auto overflow-y-auto pb-20">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Video Reformatter
          </h1>
          <p className="text-muted-foreground mt-2">
            Adjust zoom, position, and add cinematic black bars. Processes
            locally without saving to projects.
          </p>
        </div>

        {error && (
          <div className="bg-red-950/20 text-red-400 p-4 rounded-xl border border-red-900/30 text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="overflow-hidden border border-border/10 rounded-2xl bg-[#241e1a] shadow-none h-full min-h-[500px]">
              <div
                ref={containerRef}
                className="relative w-full h-full bg-black overflow-hidden select-none cursor-move rounded-2xl"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
              >
                {!previewUrl ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground bg-black pointer-events-none">
                    <Video className="w-12 h-12 mb-4 opacity-50 text-orange-400" />
                    <p>Upload a video to preview</p>
                  </div>
                ) : (
                  <>
                    <video
                      ref={videoRef}
                      src={previewUrl}
                      className="absolute w-full h-full object-contain pointer-events-none"
                      style={{
                        transform: videoTransform,
                        transformOrigin: "center center",
                      }}
                      autoPlay
                      loop
                      muted
                      playsInline
                    />
                    <div
                      className="absolute top-0 left-0 w-full bg-[#0a0a0a] pointer-events-none transition-all duration-75"
                      style={{ height: `${topBarPct}%` }}
                    />
                    <div
                      className="absolute bottom-0 left-0 w-full bg-[#0a0a0a] pointer-events-none transition-all duration-75"
                      style={{ height: `${bottomBarPct}%` }}
                    />

                  </>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <Card className="rounded-2xl bg-[#241e1a] border-border/10 shadow-none overflow-hidden">
              <div className="p-6 pb-2">
                <h2 className="text-base font-semibold text-foreground">
                  Adjustments
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Drag the video to reposition
                </p>
              </div>
              <CardContent className="p-6 pt-4 space-y-6">
                {!file && (
                  <div className="flex items-center justify-center border border-dashed border-border/20 bg-[#1a1715] rounded-xl p-8 hover:bg-white/5 transition-colors cursor-pointer">
                    <label className="flex flex-col items-center cursor-pointer w-full">
                      <Upload className="w-8 h-8 mb-3 text-orange-400" />
                      <span className="text-sm font-medium text-foreground">
                        Select Video
                      </span>
                      <input
                        type="file"
                        className="hidden"
                        accept="video/*"
                        onChange={handleFileChange}
                      />
                    </label>
                  </div>
                )}

                {file && (
                  <>
                    <div className="flex items-center justify-between text-sm mb-6">
                      <span className="text-muted-foreground font-medium truncate max-w-[200px]">
                        {file.name}
                      </span>
                      <label className="text-orange-400 font-medium hover:text-orange-300 transition-colors cursor-pointer">
                        Change
                        <input
                          type="file"
                          className="hidden"
                          accept="video/*"
                          onChange={handleFileChange}
                        />
                      </label>
                    </div>

                    <div className="space-y-6">
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <Label className="text-foreground">Zoom</Label>
                          <span className="text-sm text-muted-foreground">
                            {zoom.toFixed(2)}x
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0.1"
                          max="5.0"
                          step="0.01"
                          value={zoom}
                          onChange={(e) => setZoom(parseFloat(e.target.value))}
                          className="w-full h-1.5 bg-[#1a1715] rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-orange-400 hover:[&::-webkit-slider-thumb]:bg-orange-300"
                        />
                      </div>

                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <Label className="text-foreground">Position X</Label>
                          <span className="text-sm text-muted-foreground">
                            {x} px
                          </span>
                        </div>
                        <input
                          type="range"
                          min="-1920"
                          max="1920"
                          step="1"
                          value={x}
                          onChange={(e) => setX(parseInt(e.target.value))}
                          className="w-full h-1.5 bg-[#1a1715] rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-orange-400 hover:[&::-webkit-slider-thumb]:bg-orange-300"
                        />
                      </div>

                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <Label className="text-foreground">Position Y</Label>
                          <span className="text-sm text-muted-foreground">
                            {y} px
                          </span>
                        </div>
                        <input
                          type="range"
                          min="-1080"
                          max="1080"
                          step="1"
                          value={y}
                          onChange={(e) => setY(parseInt(e.target.value))}
                          className="w-full h-1.5 bg-[#1a1715] rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-orange-400 hover:[&::-webkit-slider-thumb]:bg-orange-300"
                        />
                      </div>

                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <Label className="text-foreground">
                            Top Black Bar
                          </Label>
                          <span className="text-sm text-muted-foreground">
                            {topBar} px
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="540"
                          step="1"
                          value={topBar}
                          onChange={(e) => setTopBar(parseInt(e.target.value))}
                          className="w-full h-1.5 bg-[#1a1715] rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-orange-400 hover:[&::-webkit-slider-thumb]:bg-orange-300"
                        />
                      </div>

                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <Label className="text-foreground">
                            Bottom Black Bar
                          </Label>
                          <span className="text-sm text-muted-foreground">
                            {bottomBar} px
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="540"
                          step="1"
                          value={bottomBar}
                          onChange={(e) =>
                            setBottomBar(parseInt(e.target.value))
                          }
                          className="w-full h-1.5 bg-[#1a1715] rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-orange-400 hover:[&::-webkit-slider-thumb]:bg-orange-300"
                        />
                      </div>
                    </div>

                    <div className="flex gap-4 pt-8">
                      <Button
                        variant="outline"
                        className="flex-[0.4] bg-[#1a1715] hover:bg-white/5 border-border/20 text-foreground h-12 rounded-xl transition-colors"
                        onClick={() => {
                          setZoom(1);
                          setX(0);
                          setY(0);
                          setTopBar(0);
                          setBottomBar(0);
                        }}
                        disabled={isProcessing}
                      >
                        Reset
                      </Button>
                      <Button
                        className="flex-1 bg-orange-400 hover:bg-orange-500 text-orange-950 font-bold h-12 rounded-xl transition-colors"
                        onClick={handleProcess}
                        disabled={isProcessing}
                      >
                        {isProcessing ? (
                          <>
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <Download className="w-4 h-4 mr-2" />
                            Download
                          </>
                        )}
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
