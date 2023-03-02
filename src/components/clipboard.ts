export const clipboardSalt = "// bt-visual-clipboard: ";

export default {
  async write<T>(
    key: string,
    data: T,
    unavailable?: (dumps: string) => Promise<void>
  ): Promise<string> {
    const dumps = `${clipboardSalt}${key}\r\n${JSON.stringify(
      data,
      undefined,
      2
    )}`;
    if (navigator.clipboard == null) {
      unavailable && (await unavailable(dumps));
      return "";
    } else {
      await navigator.clipboard.writeText(dumps);
      return dumps;
    }
  },
  async read<T>(
    key: string,
    unavailable?: () => Promise<void>
  ): Promise<T | null> {
    if (navigator.clipboard == null) {
      unavailable && (await unavailable());
      return null;
    }
    const loads = (await navigator.clipboard.readText()).replace("\r", "");
    if (!loads) return null;
    if (!loads.startsWith(clipboardSalt)) return null;
    const index = loads.indexOf("\n");
    if (index < 0 || index >= loads.length) return null;
    const comments = loads.slice(0, index);
    if (key !== comments.slice(clipboardSalt.length)) return null;
    const content = loads.slice(index + 1);
    try {
      return JSON.parse(content);
    } catch (e) {
      console.error(
        `failed to parse clipboard content, content: ${content}, reason: ${e}`,
        e
      );
      return null;
    }
  },
};

interface SelectedNodeCapture {
  $svg: SVGSVGElement;
  $img: HTMLImageElement;
}

export async function drawSelectedCapture(): Promise<SelectedNodeCapture | null> {
  const $selectedNodes = document.querySelectorAll("svg.selected.node");
  if ($selectedNodes.length <= 0) return null;

  const pad = 6;
  let maxWidth = 0,
    totalHeight = 0;
  let inner = "";
  for (const $node of $selectedNodes) {
    const width = pad * 4 + $node.clientWidth;
    const height = pad * 2 + $node.clientHeight;

    const $svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    $svg.setAttribute("width", String(width));
    $svg.setAttribute("height", String(height));
    $svg.setAttribute("y", String(totalHeight));
    $svg.setAttribute("viewBox", `${-pad * 2} ${-pad} ${width} ${height}`);
    const children = Array.prototype.slice
      .call($node.children, 0, -1)
      .map(($ele: Element) => $ele.outerHTML)
      .join("\n    ");
    $svg.innerHTML = `\n    ${children}\n  `;
    inner += `\n  ${$svg.outerHTML}`;

    if (width > maxWidth) maxWidth = width;
    totalHeight += height;
  }

  const $svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  $svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  $svg.setAttribute("version", "1.1");
  $svg.setAttribute("width", String(maxWidth));
  $svg.setAttribute("height", String(totalHeight));
  const style = window.getComputedStyle(document.querySelector("#app #main")!);
  $svg.style.fontFamily = style.fontFamily;
  $svg.style.fontWeight = "bold";
  $svg.style.backgroundColor = style.backgroundColor;
  $svg.innerHTML = inner + "\n";

  // render images
  const $img = new Image(maxWidth, totalHeight);
  $img.src = `data:image/svg+xml,${encodeURIComponent($svg.outerHTML)}`;
  return new Promise((resolve) =>
    $img.addEventListener("load", () => resolve({ $svg, $img }))
  );
}

export async function copySelectedNodes(
  dumps: string,
  { $img }: SelectedNodeCapture
) {
  // create canvas
  const canvas = document.createElement("canvas");
  canvas.width = $img.width;
  canvas.height = $img.height;
  // draw images
  const context = canvas.getContext("2d")!;
  context.drawImage($img, 0, 0);
  // write to clipboard
  canvas.toBlob((image) => {
    if (image == null) return;
    const text = new Blob([dumps], { type: "text/plain" });
    navigator.clipboard.write([
      new ClipboardItem({
        [image.type]: image,
        [text.type]: text,
      }),
    ]);
  });
}

export function exportSelectedCapture(
  name: string,
  dumps: string,
  { $svg }: SelectedNodeCapture
) {
  const outer = `<?xml version="1.0" standalone="yes"?><!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd"><!--\n${dumps}\n-->\n${$svg.outerHTML}\n`;
  const blob = new Blob([outer], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  const $a = document.createElement("a");
  $a.href = url;
  $a.download = `${name}.svg`;
  $a.click();
}
