import React, { useState, useRef } from "react";
import { Upload, RefreshCw, Download, Video } from "lucide-react";
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
    <div className="container mx-auto p-6 max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Video Reformatter
          </h1>
          <p className="text-muted-foreground mt-2">
            Adjust zoom, position, and add cinematic black bars. Processes
            locally without saving to projects.
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/15 text-destructive p-4 rounded-md border border-destructive/20 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card className="overflow-hidden border-border bg-card">
            <div
              ref={containerRef}
              className="relative w-full aspect-video bg-black overflow-hidden select-none cursor-move"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            >
              {!previewUrl ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground pointer-events-none">
                  <Video className="w-12 h-12 mb-4 opacity-50" />
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
                    className="absolute top-0 left-0 w-full bg-black pointer-events-none"
                    style={{ height: `${topBarPct}%` }}
                  />
                  <div
                    className="absolute bottom-0 left-0 w-full bg-black pointer-events-none"
                    style={{ height: `${bottomBarPct}%` }}
                  />
                </>
              )}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Adjustments</CardTitle>
              <CardDescription>Drag the video to reposition</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {!file && (
                <div className="flex items-center justify-center border-2 border-dashed border-border rounded-lg p-6 hover:bg-accent/50 transition-colors">
                  <label className="flex flex-col items-center cursor-pointer w-full">
                    <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
                    <span className="text-sm font-medium">Select Video</span>
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
                  <div className="flex items-center justify-between text-sm mb-4">
                    <span className="text-muted-foreground truncate max-w-[200px]">
                      {file.name}
                    </span>
                    <label className="text-primary hover:underline cursor-pointer">
                      Change
                      <input
                        type="file"
                        className="hidden"
                        accept="video/*"
                        onChange={handleFileChange}
                      />
                    </label>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <Label>Zoom</Label>
                        <span className="text-xs text-muted-foreground">
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
                        className="w-full accent-primary h-2 bg-secondary rounded-lg appearance-none cursor-pointer"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <Label>Position X</Label>
                        <span className="text-xs text-muted-foreground">
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
                        className="w-full accent-primary h-2 bg-secondary rounded-lg appearance-none cursor-pointer"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <Label>Position Y</Label>
                        <span className="text-xs text-muted-foreground">
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
                        className="w-full accent-primary h-2 bg-secondary rounded-lg appearance-none cursor-pointer"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <Label>Top Black Bar</Label>
                        <span className="text-xs text-muted-foreground">
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
                        className="w-full accent-primary h-2 bg-secondary rounded-lg appearance-none cursor-pointer"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <Label>Bottom Black Bar</Label>
                        <span className="text-xs text-muted-foreground">
                          {bottomBar} px
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="540"
                        step="1"
                        value={bottomBar}
                        onChange={(e) => setBottomBar(parseInt(e.target.value))}
                        className="w-full accent-primary h-2 bg-secondary rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button
                      variant="outline"
                      className="flex-1"
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
                      className="flex-2"
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
  );
}
