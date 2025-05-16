//App.tsx for a one page photo editor

import React, { useState, useRef, useCallback, useEffect } from "react";
import Konva from "konva";
import {
  Stage,
  Layer,
  Image as KonvaImage,
  Text,
  Circle,
  Rect,
  Line,
  Transformer,
} from "react-konva";
import {
  Container,
  Row,
  Col,
  ToggleButton,
  Button,
  Card,
  ButtonGroup,
} from "react-bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";
import { useDropzone } from "react-dropzone";
import {
  Type as TypeIcon,
  Circle as CircleIcon,
  Highlighter,
  Crop as CropIcon,
  CornerDownLeft as UndoIcon,
  Save as SaveIcon,
} from "lucide-react";

const THEME_FONT = 'Poppins, "Helvetica Neue", Arial, sans-serif';

interface Edit {
  type: "text" | "circle" | "highlight";
  data: any;
}

const App: React.FC = () => {
  const [history, setHistory] = useState<
    { image: HTMLImageElement | null; edits: Edit[] }[]
  >([]);

  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [edits, setEdits] = useState<Edit[]>([]);
  const [currentStroke, setCurrentStroke] = useState<number[]>([]);
  const [isCropping, setIsCropping] = useState(false);
  const [cropRect, setCropRect] = useState({
    x: 50,
    y: 50,
    width: 200,
    height: 200,
  });
  const [selectedEditIndex, setSelectedEditIndex] = useState<number | null>(
    null
  );
  const [isAddingText, setIsAddingText] = useState(false);
  const [isAddingCircle, setIsAddingCircle] = useState(false);
  const [isHighlighting, setIsHighlighting] = useState(false);
  const [isDrawingHighlight, setIsDrawingHighlight] = useState(false);

  const stageRef = useRef<Konva.Stage>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const transformerRef = useRef<Konva.Transformer>(null);

  const textRefs = useRef<Array<Konva.Text | null>>([]);
  const circleRefs = useRef<Array<Konva.Circle | null>>([]);
  const cropRef = useRef<Konva.Rect>(null);

  const [stageScale, setStageScale] = useState(1);

  const onDrop = useCallback((files: File[]) => {
    const file = files[0];
    const img = new Image();
    img.src = URL.createObjectURL(file);
    img.onload = () => {
      setImage(img);
      setEdits([]);
      setSelectedEditIndex(null);
    };
  }, []);

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: { "image/png": [".png"] },
  });

  const getUnscaledPointer = (): { x: number; y: number } | null => {
    const stage = stageRef.current;
    if (!stage) return null;
    const pos = stage.getPointerPosition();
    if (!pos) return null;
    const scale = stage.scaleX();
    return {
      x: pos.x / scale,
      y: pos.y / scale,
    };
  };
  const pushSnapshot = () => {
    setHistory((h) => [
      ...h,
      { image: image, edits: JSON.parse(JSON.stringify(edits)) },
    ]);
  };

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsAddingText(false);
        setIsAddingCircle(false);
        setIsDrawingHighlight(false);
        setCurrentStroke([]);
        setIsCropping(false);
        setSelectedEditIndex(null);
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [
    isAddingText,
    isAddingCircle,
    isDrawingHighlight,
    isCropping,
    selectedEditIndex,
  ]);

  useEffect(() => {
    const calculateScale = () => {
      if (!image || !containerRef.current || !titleRef.current) {
        return;
      }

      const contRect = containerRef.current.getBoundingClientRect();
      const titleRect = titleRef.current.getBoundingClientRect();
      const style = window.getComputedStyle(containerRef.current);
      const padX =
        parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
      const padY =
        parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);

      const availW = contRect.width - padX;
      const availH = contRect.height - padY - titleRect.height;
      if (
        availW <= 0 ||
        availH <= 0 ||
        image.width === 0 ||
        image.height === 0
      ) {
        setStageScale(1);
        return;
      }
      const scaleX = availW / image.width;
      const scaleY = availH / image.height;

      setStageScale(Math.min(scaleX, scaleY, 1));
    };

    calculateScale();

    window.addEventListener("resize", calculateScale);

    return () => {
      window.removeEventListener("resize", calculateScale);
    };
  }, [image]);

  useEffect(() => {
    const tr = transformerRef.current;
    const layer = tr?.getLayer();
    if (!tr || !layer) {
      if (tr && tr.nodes().length > 0) tr.nodes([]);
      return;
    }

    let animationFrameId: number | null = null;

    tr.nodes([]);
    tr.rotateEnabled(false);

    if (isCropping && cropRef.current) {
      const cropNode = cropRef.current;

      animationFrameId = requestAnimationFrame(() => {
        if (
          isCropping &&
          cropRef.current === cropNode &&
          tr === transformerRef.current
        ) {
          tr.nodes([cropNode]);
          tr.rotateEnabled(false);
          layer.batchDraw();
        } else {
          if (!isCropping && tr.nodes().length > 0) {
            tr.nodes([]);
            layer.batchDraw();
          }
        }
      });
    } else if (
      selectedEditIndex !== null &&
      selectedEditIndex >= 0 &&
      selectedEditIndex < edits.length
    ) {
      const edit = edits[selectedEditIndex]!;
      let node: Konva.Node | null = null;

      if (edit.type === "text") {
        node = textRefs.current[selectedEditIndex];
      } else if (edit.type === "circle") {
        node = circleRefs.current[selectedEditIndex];
      }
      if (node) {
        tr.nodes([node]);
        tr.rotateEnabled(false);
        layer.batchDraw();
      }
    }

    return () => {
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
      }
      const currentTr = transformerRef.current;
      if (currentTr && currentTr.nodes().length > 0) {
        currentTr.nodes([]);
        const currentLayer = currentTr.getLayer();
        currentLayer?.batchDraw();
      }
    };
  }, [selectedEditIndex, edits, isCropping]);

  const handleStageClick = () => {
    if (isAddingText) {
      setIsAddingCircle(false);
      setIsHighlighting(false);
      const pos = getUnscaledPointer();
      if (!pos) return;
      setEdits((prev) => {
        const idx = prev.length;
        const newEdit: Edit = {
          type: "text",
          data: {
            text: "click to edit text…",
            x: pos.x,
            y: pos.y,
            fontSize: 30,
            width: 150,
            fill: "#333",
            draggable: true,
          },
        };
        setSelectedEditIndex(idx);
        return [...prev, newEdit];
      });
      pushSnapshot();
      setIsAddingText(false);
    } else if (isAddingCircle) {
      setIsAddingText(false);
      setIsHighlighting(false);
      const pos = getUnscaledPointer();
      if (!pos) return;
      setEdits((prev) => {
        const idx = prev.length;
        const newCircle: Edit = {
          type: "circle",
          data: {
            x: pos.x,
            y: pos.y,
            radius: 20,
            stroke: "#FF3030",
            strokeWidth: 3,
            draggable: true,
          },
        };
        setSelectedEditIndex(idx);
        return [...prev, newCircle];
      });
      pushSnapshot();
      setIsAddingCircle(false);
    }
  };

  const handleTextClick = (
    e: Konva.KonvaEventObject<MouseEvent>,
    idx: number
  ) => {
    if (e.evt.button !== 0) return;
    e.cancelBubble = true;

    const textNode = e.target as Konva.Text;
    const stage = textNode.getStage();
    if (!stage) return;
    const layer = textNode.getLayer();
    if (!layer) return;

    const textarea = document.createElement("textarea");
    const stageContainer = stage.container();
    const textPosition = textNode.getAbsolutePosition();
    const stageBox = stageContainer.getBoundingClientRect();
    const areaPosition = {
      x: stageBox.left + window.scrollX + textPosition.x,
      y: stageBox.top + window.scrollY + textPosition.y,
    };

    textarea.value = textNode.text();
    textarea.style.position = "absolute";
    textarea.style.top = areaPosition.y + "px";
    textarea.style.left = areaPosition.x + "px";
    textarea.style.width = textNode.width() * stage.scaleX() + "px";

    const fill = textNode.fill();
    textarea.style.color = typeof fill === "string" ? fill : "black";

    textarea.style.height = textNode.height() * stage.scaleY() + "px";
    textarea.style.fontSize = textNode.fontSize() * stage.scaleX() + "px";
    textarea.style.lineHeight = textNode.lineHeight()
      ? String(textNode.lineHeight())
      : "normal";
    textarea.style.fontFamily = textNode.fontFamily();
    textarea.style.border = "1px solid #ccc";
    textarea.style.padding = "0px";
    textarea.style.margin = "0";
    textarea.style.overflow = "hidden";
    textarea.style.background = "transparent";
    textarea.style.outline = "none";
    textarea.style.resize = "none";
    textarea.style.zIndex = "1000";

    document.body.appendChild(textarea);

    textNode.hide();
    layer.batchDraw();

    textarea.focus();
    textarea.select();

    textarea.addEventListener("click", (ev) => {
      ev.stopPropagation();
    });

    const removeTextarea = () => {
      textarea.remove();
      window.removeEventListener("click", handleOutsideClick, true);
      window.removeEventListener("keydown", handleKeyDown, true);
      const currentTextNode = textRefs.current[idx];
      if (currentTextNode) {
        currentTextNode.show();
        layer.batchDraw();
      }
    };

    const updateAndRemove = () => {
      const newText = textarea.value;
      if (newText !== textNode.text()) {
        updateText(idx, newText);
      }
      removeTextarea();
    };

    const handleOutsideClick = (ev: MouseEvent) => {
      if (ev.target !== textarea) {
        updateAndRemove();
      }
    };

    const handleKeyDown = (ev: KeyboardEvent) => {
      if (ev.key === "Enter" && !ev.shiftKey) {
        ev.preventDefault();
        updateAndRemove();
      } else if (ev.key === "Escape") {
        removeTextarea();
      }
    };

    setTimeout(() => {
      window.addEventListener("click", handleOutsideClick, true);
      window.addEventListener("keydown", handleKeyDown, true);
    }, 0);
  };

  const updateText = (idx: number, newText: string) => {
    setEdits((eds) => {
      const copy = [...eds];
      copy[idx] = { ...copy[idx], data: { ...copy[idx].data, text: newText } };
      return copy;
    });
  };

  const undo = () => {
    setHistory((h) => {
      if (h.length === 0) return h;
      const last = h[h.length - 1];
      setImage(last.image);
      setEdits(last.edits);
      return h.slice(0, -1);
    });
  };

  const saveImage = () => {
    if (!stageRef.current) return;
    const uri = stageRef.current.toDataURL();
    const link = document.createElement("a");
    link.download = "edited.png";
    link.href = uri;
    link.click();
  };

  const applyCrop = () => {
    if (!image) return;
    pushSnapshot();

    const canvas = document.createElement("canvas");
    canvas.width = cropRect.width;
    canvas.height = cropRect.height;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(
      image,
      cropRect.x,
      cropRect.y,
      cropRect.width,
      cropRect.height,
      0,
      0,
      cropRect.width,
      cropRect.height
    );
    const newImg = new Image();
    newImg.src = canvas.toDataURL();

    newImg.onload = () => {
      const dx = cropRect.x;
      const dy = cropRect.y;
      const shifted = edits.map((edit) => {
        const e = { ...edit, data: { ...edit.data } };
        switch (e.type) {
          case "text":
          case "circle":
            e.data.x -= dx;
            e.data.y -= dy;
            return e;
          case "highlight":
            if (Array.isArray(e.data.points)) {
              e.data.points = e.data.points.map((v: number, i: number) =>
                i % 2 === 0 ? v - dx : v - dy
              );
            }
            return e;
          default:
            return e;
        }
      });

      setImage(newImg);
      setEdits(shifted);
      setIsCropping(false);
      setCropRect({ x: 0, y: 0, width: newImg.width, height: newImg.height });
    };
  };

  return (
    <Container
      fluid
      className="vh-100 vw-100 p-0"
      style={{ fontFamily: THEME_FONT, background: "#f5f7fa" }}
    >
      <Row className="h-100 g-0">
        <Col
          className="bg-white shadow-sm p-4 h-100 flex-shrink-0"
          style={{ flex: "0 0 300px", maxWidth: "300px" }}
        >
          <Card className="h-100 d-flex flex-column shadow-sm rounded">
            <Card.Body className="d-flex flex-column">
              <Card.Title className="text-black fw-bold fs-4 text-center">
                Editor Tools
              </Card.Title>
              <ButtonGroup vertical className="w-100 mb-3">
                <ToggleButton
                  id="tool-add-text"
                  type="radio"
                  name="tool"
                  value="text"
                  variant={isAddingText ? "primary" : "outline-primary"} // Dynamic variant for better visual feedback
                  checked={isAddingText}
                  onClick={() => {
                    // Toggle the state: if already active, deactivate; otherwise, activate
                    setIsAddingText((prev) => !prev);
                    setIsAddingCircle(false);
                    setIsHighlighting(false);
                    setIsCropping(false);
                    setSelectedEditIndex(null);
                  }}
                  className={`d-flex align-items-center mb-2 ${
                    isAddingText ? "fw-bold" : ""
                  }`} // Remove opacity-75 for consistency
                >
                  <TypeIcon size={18} className="me-2" />
                  Add Text
                </ToggleButton>

                <ToggleButton
                  id="tool-add-circle"
                  type="radio"
                  name="tool"
                  value="circle"
                  variant="danger"
                  checked={isAddingCircle}
                  onChange={() => {
                    setIsAddingText(false);
                    setIsAddingCircle(true);
                    setIsHighlighting(false);
                    setIsCropping(false);
                    setSelectedEditIndex(null);
                  }}
                  className={`d-flex align-items-center mb-2 ${
                    !isAddingCircle ? "opacity-75" : "opacity-100 fw-bold"
                  }`}
                >
                  <CircleIcon size={18} className="me-2" />
                  Add Circle
                </ToggleButton>

                <ToggleButton
                  id="tool-highlight"
                  type="radio"
                  name="tool"
                  value="highlight"
                  variant="warning"
                  checked={isHighlighting}
                  onChange={() => {
                    setIsAddingText(false);
                    setIsAddingCircle(false);
                    setIsHighlighting(true);
                    setIsCropping(false);
                    setSelectedEditIndex(null);
                  }}
                  className={`d-flex align-items-center mb-2 ${
                    !isHighlighting ? "opacity-75" : "opacity-100 fw-bold"
                  }`}
                >
                  <Highlighter size={18} className="me-2" />
                  Highlight
                </ToggleButton>

                <ToggleButton
                  id="tool-crop"
                  type="radio"
                  name="tool"
                  value="crop"
                  variant="info"
                  checked={isCropping}
                  onChange={() => {
                    setIsAddingText(false);
                    setIsAddingCircle(false);
                    setIsHighlighting(false);
                    setIsCropping(true);
                    setSelectedEditIndex(null);
                  }}
                  className={`d-flex align-items-center mb-2 ${
                    !isCropping ? "opacity-75" : "opacity-100 fw-bold"
                  }`}
                >
                  <CropIcon size={18} className="me-2" />
                  Crop
                </ToggleButton>
                {isCropping && (
                  <ToggleButton
                    id="tool-add-text"
                    type="radio"
                    name="tool"
                    value="text"
                    variant="outline-primary"
                    size="sm"
                    className="mt-3"
                    onClick={applyCrop}
                  >
                    Apply Crop
                  </ToggleButton>
                )}
              </ButtonGroup>

              {/* Put Undo in its own group so it’s a normal button, not part of the radio set */}
              <ButtonGroup vertical className="w-100 mb-3">
                <Button
                  variant="secondary"
                  onClick={undo}
                  disabled={history.length === 0}
                  className="d-flex align-items-center"
                >
                  <UndoIcon size={18} className="me-2" />
                  Undo
                </Button>
              </ButtonGroup>
              <ToggleButton
                id="tool-add-text"
                type="radio"
                name="tool"
                value="text"
                variant="success"
                onClick={saveImage}
                disabled={!image}
                className="d-flex	align-items-center	justify-content-center text-white mb-3"
              >
                <SaveIcon size={18} className="me-2" /> Save Image
              </ToggleButton>
              <Card className="border-primary shadow-sm mt-auto">
                <Card.Body {...getRootProps()} className="text-center py-3">
                  <input {...getInputProps()} />
                  <Highlighter size={32} className="text-primary mb-2" />
                  <div className="text-primary">
                    Drop PNG here or click to upload
                  </div>
                </Card.Body>
              </Card>
            </Card.Body>
          </Card>
        </Col>
        <Col
          ref={containerRef}
          className="d-flex flex-column justify-content-start	align-items-center overflow-hidden"
        >
          <Card.Title
            ref={titleRef}
            className="text-black fw-bold fs-1 text-center py-4"
          >
            Image Editor
          </Card.Title>
          <Col className="d-flex	flex-column justify-content-center	align-items-center overflow-hidden">
            {image && (
              <Card className="shadow-sm">
                <Card.Body className="bg-white	p-0">
                  <div
                    style={{
                      display: "inline-block",
                      width: image.width * stageScale,
                      height: image.height * stageScale,
                      overflow: "hidden",
                      backgroundColor: "#fff",
                    }}
                  >
                    <Stage
                      width={image.width}
                      height={image.height}
                      scaleX={stageScale}
                      scaleY={stageScale}
                      onMouseDown={() => {
                        if (!isHighlighting) return;
                        const pos = getUnscaledPointer();
                        if (!pos) return;
                        setCurrentStroke([pos.x, pos.y]);
                        setIsDrawingHighlight(true);
                      }}
                      onMouseMove={() => {
                        if (!isHighlighting || !isDrawingHighlight) return;
                        const pos = getUnscaledPointer();
                        if (!pos) return;
                        setCurrentStroke((pts) => [...pts, pos.x, pos.y]);
                      }}
                      onMouseUp={() => {
                        if (!isHighlighting || !isDrawingHighlight) return;
                        pushSnapshot();
                        setEdits((prev) => [
                          ...prev,
                          {
                            type: "highlight",
                            data: {
                              points: currentStroke,
                              stroke: "rgba(255, 255, 0, 0.6)",
                              strokeWidth: 30,
                              lineCap: "round",
                              lineJoin: "round",
                              listening: false,
                            },
                          },
                        ]);
                        setCurrentStroke([]);
                        setIsDrawingHighlight(false);
                      }}
                      onClick={handleStageClick}
                      ref={stageRef}
                    >
                      <Layer>
                        <KonvaImage image={image} />
                        {isHighlighting && isDrawingHighlight && (
                          <Line
                            points={currentStroke}
                            stroke="rgba(255, 255, 0, 0.6)"
                            strokeWidth={30}
                            lineCap="round"
                            lineJoin="round"
                            listening={false}
                          />
                        )}

                        {edits.map((edit, i) => {
                          switch (edit.type) {
                            case "text": {
                              return (
                                <React.Fragment key={i}>
                                  <Text
                                    ref={(node) => {
                                      textRefs.current[i] = node;
                                    }}
                                    {...edit.data}
                                    fontFamily={THEME_FONT}
                                    onClick={(e) => {
                                      e.cancelBubble = true;
                                      if (selectedEditIndex === i) {
                                        handleTextClick(e, i);
                                      } else {
                                        setSelectedEditIndex(i);
                                      }
                                    }}
                                    onDragEnd={(e) => {
                                      const arr = [...edits];
                                      arr[i].data.x = e.target.x();
                                      arr[i].data.y = e.target.y();
                                      setEdits(arr);
                                      pushSnapshot();
                                    }}
                                    onTransformEnd={(e) => {
                                      const node = e.target as Konva.Text;
                                      const scaleX = node.scaleX();
                                      const scaleY = node.scaleY();

                                      const originalWidth = edit.data.width;
                                      const originalFontSize =
                                        edit.data.fontSize;

                                      const newX = node.x();
                                      const newY = node.y();

                                      let finalWidth = originalWidth;
                                      let finalFontSize = originalFontSize;
                                      const tolerance = 0.02;
                                      const FONT_RESIZE_SENSITIVITY = 0.6;

                                      const scaleXChanged =
                                        Math.abs(scaleX - 1) >= tolerance;
                                      const scaleYChanged =
                                        Math.abs(scaleY - 1) >= tolerance;

                                      if (scaleXChanged && !scaleYChanged) {
                                        finalWidth = originalWidth * scaleX;
                                        finalFontSize = originalFontSize;
                                      } else if (
                                        scaleYChanged &&
                                        !scaleXChanged
                                      ) {
                                        finalWidth = originalWidth;
                                        const adjustedScaleY =
                                          1 +
                                          (scaleY - 1) *
                                            FONT_RESIZE_SENSITIVITY;
                                        finalFontSize =
                                          originalFontSize * adjustedScaleY;
                                      } else if (
                                        scaleXChanged &&
                                        scaleYChanged
                                      ) {
                                        const scaleFactor = Math.max(
                                          scaleX,
                                          scaleY
                                        );
                                        finalWidth =
                                          originalWidth * scaleFactor;

                                        const adjustedScaleFactor =
                                          1 +
                                          (scaleFactor - 1) *
                                            FONT_RESIZE_SENSITIVITY;
                                        finalFontSize =
                                          originalFontSize *
                                          adjustedScaleFactor;
                                      } else {
                                        finalWidth = originalWidth;
                                        finalFontSize = originalFontSize;
                                      }

                                      const minFontSize = 8;
                                      const minWidth = 10;
                                      finalFontSize = Math.max(
                                        minFontSize,
                                        finalFontSize
                                      );
                                      finalWidth = Math.max(
                                        minWidth,
                                        finalWidth
                                      );

                                      setEdits((arr) => {
                                        const copy = [...arr];
                                        copy[i].data = {
                                          ...copy[i].data,
                                          width: finalWidth,
                                          fontSize: finalFontSize,
                                          x: newX,
                                          y: newY,
                                        };
                                        return copy;
                                      });
                                      pushSnapshot();
                                      node.width(finalWidth);
                                      node.fontSize(finalFontSize);
                                      node.position({ x: newX, y: newY });
                                      node.scale({ x: 1, y: 1 });
                                    }}
                                  />
                                </React.Fragment>
                              );
                            }
                            case "circle":
                              return (
                                <React.Fragment key={i}>
                                  <Circle
                                    ref={(node) => {
                                      circleRefs.current[i] = node;
                                    }}
                                    {...edit.data}
                                    draggable
                                    onClick={(e) => {
                                      e.cancelBubble = true;
                                      setSelectedEditIndex(i);
                                    }}
                                    onDragEnd={(e) => {
                                      const { x, y } = e.target.position();
                                      setEdits((edits) => {
                                        const copy = [...edits];
                                        copy[i] = {
                                          ...copy[i],
                                          data: { ...copy[i].data, x, y },
                                        };
                                        return copy;
                                      });
                                      pushSnapshot();
                                    }}
                                    onTransformEnd={(e) => {
                                      const node = e.target as Konva.Circle;
                                      const newRadius =
                                        node.radius() * node.scaleX();
                                      node.scale({ x: 1, y: 1 });
                                      setEdits((edits) => {
                                        const copy = [...edits];
                                        copy[i] = {
                                          ...copy[i],
                                          data: {
                                            ...copy[i].data,
                                            radius: newRadius,
                                          },
                                        };
                                        return copy;
                                      });
                                      pushSnapshot();
                                    }}
                                  />
                                </React.Fragment>
                              );
                            case "highlight":
                              return (
                                <Line
                                  key={i}
                                  points={edit.data.points}
                                  stroke={edit.data.stroke}
                                  strokeWidth={edit.data.strokeWidth}
                                  lineCap={edit.data.lineCap}
                                  lineJoin={edit.data.lineJoin}
                                  listening={false}
                                />
                              );
                            default:
                              return null;
                          }
                        })}
                        {isCropping && (
                          <Rect
                            ref={cropRef}
                            {...cropRect}
                            stroke="#007bff"
                            dash={[6, 4]}
                            draggable
                            onDragEnd={(e) =>
                              setCropRect((r) => ({
                                ...r,
                                x: e.target.x(),
                                y: e.target.y(),
                              }))
                            }
                            onTransformEnd={(e) => {
                              const node = e.target;
                              setCropRect({
                                x: node.x(),
                                y: node.y(),
                                width: node.width() * node.scaleX(),
                                height: node.height() * node.scaleY(),
                              });
                              node.scale({ x: 1, y: 1 });
                            }}
                          />
                        )}

                        <Transformer
                          ref={transformerRef}
                          rotateEnabled={false}
                          anchorSize={8}
                        />
                      </Layer>
                    </Stage>
                  </div>
                </Card.Body>
              </Card>
            )}
          </Col>
        </Col>
      </Row>
    </Container>
  );
};

export default App;
