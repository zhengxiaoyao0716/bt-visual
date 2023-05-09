import { DragEvent } from "react";
import {
  Action,
  Composite,
  Decorator,
  Node,
  Tree,
} from "../behavior-tree/type";
import { getNodeType } from "../behavior-tree/utils";
import { clipboardSalt } from "../components/clipboard";

import { nodeDraggingRef } from "./NodeLibs";
import { anchorDraggingRef, DraggingData } from "./NodeRender/LineRender";

const baseline = 0.3;

export function createAnchorDropProps(
  anchorDrop: (data: DraggingData, index: number, copy: boolean) => void
) {
  const onDragOver = (event: DragEvent) => {
    const draggingData = anchorDraggingRef.current;
    if (draggingData == null) return;
    const offset = offsetHalfHeight(event);

    if (offset <= -baseline) return;
    event.dataTransfer.dropEffect =
      event.ctrlKey || event.shiftKey ? "copy" : "link";
    event.preventDefault();
  };
  const onDragEnter = onDragOver;

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

  return { onDragEnter, onDragOver, onDrop };
}

function parseNodes(input: string): (Node | Tree)[] {
  if (!input) return [];
  if (input.startsWith("<?xml")) {
    const text = input.replace("\r", "");
    const begin = text.indexOf("\n");
    const end = text.indexOf("\n-->\n");
    return parseNodes(text.slice(begin + 1, end));
  }
  if (input.startsWith(clipboardSalt)) {
    const text = input.replace("\r", "");
    const index = text.indexOf("\n");
    return parseNodes(text.slice(index + 1));
  }
  const data = JSON.parse(input);
  return data instanceof Array ? data : [data];
}

async function parseDragNodes(event: DragEvent): Promise<(Node | Tree)[]> {
  const text = event.dataTransfer.getData("text/plain");
  if (text) return parseNodes(text);
  const files = Array.prototype.map.call(
    event.dataTransfer.files,
    (file: File) => file.text()
  ) as Promise<string>[];
  return (await Promise.all(files)).flatMap(parseNodes);
}

export function createNodeDropProps({
  appendComposite,
  prependDecorator,
  appendAction,
}: {
  appendComposite?: (node: Composite) => void;
  prependDecorator?: (node: Decorator) => void;
  appendAction?: (node: Action) => void;
}) {
  const onDragOver = (event: DragEvent) => {
    const draggingType = nodeDraggingRef.draggingType;
    if (draggingType == null) {
      const draggingData = anchorDraggingRef.current;
      if (draggingData != null) return; // 禁止拖拽锚点
      // else 允许从直接从文本之类的拖拽，这种情况下不再校验节点类型
    }
    const offset = offsetHalfHeight(event);

    switch (draggingType) {
      case "Composite": {
        if (appendComposite == null) return;
        if (offset <= -baseline) return;
        break;
      }
      case "Decorator": {
        if (prependDecorator == null) return;
        if (offset >= baseline) return;
        break;
      }
      case "Action": {
        if (appendAction == null) return;
        if (offset <= -baseline) return;
        break;
      }
    }

    event.dataTransfer.dropEffect = "copy";
    event.preventDefault();
  };
  const onDragEnter = onDragOver;

  const onDrop = async (event: DragEvent) => {
    event.preventDefault();
    const nodes = await parseDragNodes(event);
    for (const item of nodes) {
      const node = "root" in item ? item.root : item;
      "fold" in node && delete node.fold; // 禁止折叠
      console.log(node.type, getNodeType(node.type));
      switch (getNodeType(node.type)) {
        case "Composite":
          const composite = node as Composite;
          if (!composite.deck) composite.deck = [];
          if (!composite.nodes) composite.nodes = [];
          appendComposite?.(composite);
          break;
        case "Decorator":
          prependDecorator?.(node as Decorator);
          break;
        case "Action":
        default:
          const action = node as Action;
          if (!action.deck) action.deck = [];
          appendAction?.(action);
          break;
      }
    }
  };

  return { onDragEnter, onDragOver, onDrop };
}

function offsetHalfHeight(event: DragEvent) {
  const rect = event.currentTarget.getBoundingClientRect();
  return (2 * (event.clientY - rect.top) - rect.height) / rect.height;
}

export function createTypeDropProps(
  nodeType: string,
  submit: (type: string) => void
) {
  const onDragOver = (event: DragEvent) => {
    event.dataTransfer.dropEffect = "link";
    event.preventDefault();
  };
  const onDragEnter = onDragOver;
  const onDrop = async (event: DragEvent) => {
    event.preventDefault();
    const nodes = await parseDragNodes(event);
    const node = nodes[0];
    if ("root" in node) return;
    const type = node.type;
    if (getNodeType(type) === nodeType) submit(type);
  };
  return { onDragEnter, onDragOver, onDrop };
}
