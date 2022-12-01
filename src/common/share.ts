interface SideBar {
  title: string;
  href: string;
}

export interface StorageLike {
  load<T>(path: string, init: T): Promise<T>;
  save<T>(path: string, data: T): Promise<void>;
}

export interface SocketLike {
  send(message: string): Promise<void>;
  close(): Promise<void>;
}
export module SocketLike {
  export interface Constructor {
    prototype: SocketLike;
    new (address: string, read: (message: string) => void): SocketLike;
  }
}

interface Share {
  sideBars?: SideBar[];
  // pywebview 不支持浏览器 fullscreen api，留个接口
  troggleFullscreen?: () => Promise</*isFullscreen*/ boolean>;
  // pywebview 不支持在 webview 内直接打开新标签，留个接口
  openNewTab?: (url: string) => void;
  storage?: PromiseLike<StorageLike>;
  // 调试时默认采用 websocket 通信，可以通过这个接口替换
  Socket?: SocketLike.Constructor;
}

const globalShare: Share | undefined = (window as any)["bt-visual-share"];
export default globalShare;
