import { DragEvent } from "react";

import { anchorDraggingRef, DraggingData } from "./LineRender";
import { nodeDraggingRef } from "./NodeLibs";

export function createAnchorDropProps(
  anchorDrop: (data: DraggingData, index: number, copy: boolean) => void
) {
  const onDragOver = (event: DragEvent) => {
    const draggingData = anchorDraggingRef.current;
    if (draggingData == null) return;
    if (offsetHalfHeight(event) <= 0) return;
    event.dataTransfer.dropEffect =
      event.ctrlKey || event.shiftKey ? "copy" : "link";
    event.preventDefault();
  };

  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    const draggingData = anchorDraggingRef.current;
    if (draggingData == null) return;
    const data = JSON.parse(
      event.dataTransfer.getData("application/json") || "{}"
    );
    const anchorIndex = data.anchor as undefined | number;
    anchorIndex == null ||
      anchorDrop(draggingData, anchorIndex, event.ctrlKey || event.shiftKey);
  };

  return { onDragOver, onDrop };
}

export function createNodeDropProps({
  appendComposite,
  prependDecorator,
  appendAction,
}: {
  appendComposite?: (type: string) => void;
  prependDecorator?: (type: string) => void;
  appendAction?: (type: string) => void;
}) {
  const onDragOver = (event: DragEvent) => {
    const draggingType = nodeDraggingRef.draggingType;
    if (draggingType == null) return;
    switch (draggingType) {
      case "Composite": {
        if (appendComposite == null) return;
        if (offsetHalfHeight(event) <= 0) return;
        break;
      }
      case "Decorator": {
        if (prependDecorator == null) return;
        if (offsetHalfHeight(event) >= 0) return;
        break;
      }
      case "Action": {
        if (appendAction == null) return;
        if (offsetHalfHeight(event) <= 0) return;
        break;
      }
    }

    event.dataTransfer.dropEffect = "copy";
    event.preventDefault();
  };

  const onDrop = (event: DragEvent) => {
    const draggingType = nodeDraggingRef.draggingType;
    if (draggingType == null) return;
    event.preventDefault();
    const node = JSON.parse(event.dataTransfer.getData("application/json"));
    switch (draggingType) {
      case "Composite":
        return appendComposite?.(node.type);
      case "Decorator":
        return prependDecorator?.(node.type);
      case "Action":
        return appendAction?.(node.type);
    }
  };

  return { onDragOver, onDrop };
}

function offsetHalfHeight(event: DragEvent) {
  const rect = event.currentTarget.getBoundingClientRect();
  return event.clientY - rect.top - rect.height / 2;
}
