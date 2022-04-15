interface SideBar {
  title: string;
  href: string;
}

interface Share {
  sideBars?: SideBar[];
  // pywebview 不支持浏览器 fullscreen api，留个接口
  troggleFullscreen?: () => Promise</*isFullscreen*/ boolean>;
  // pywebview 不支持在 webview 内直接打开新标签，留个接口
  openNewTab?: (url: string) => void;
}

const globalShare: Share | undefined = (window as any)["bt-visual-share"];
export default globalShare;

export function getShareSideBars(): SideBar[] {
  return globalShare?.sideBars ?? [];
}
