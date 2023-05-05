import { Store } from "../behavior-tree/type";

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
export interface DatasourceView {
  readonly id: string | number;
  /**
   * 存在数据
   * @param name 属性名
   * @param bind 存储 key
   * @param type 期望类型
   */
  exist(name: string, bind: string, type: Store.ValueType): boolean;
  /**
   * 读取数据
   * @param name 属性名
   * @param bind 存储 key
   * @param type 期望类型
   */
  read(
    name: string,
    bind: string,
    type: Store.ValueType
  ): Store.Value | undefined;
  /**
   * 保存数据
   * @param name 属性名
   * @param bind 存储 key
   * @param type 期望类型
   * @param data 保存值
   */
  save(
    name: string,
    bind: string,
    type: Store.ValueType,
    data: Store.Value | undefined
  ): void;
}
export interface DatasourceDriver {
  (data: { [col: string]: Store.Value }[]): DatasourceView[];
}

interface Share {
  // pywebview 不支持浏览器 fullscreen api，留个接口
  troggleFullscreen?: () => Promise</*isFullscreen*/ boolean>;
  // pywebview 不支持在 webview 内直接打开新标签，留个接口
  openNewTab?: (url: string) => void;
  // 统一存储接口
  storage?: PromiseLike<StorageLike>;
  // 调试时默认采用 websocket 通信，可以通过这个接口替换
  Socket?: SocketLike.Constructor;
  // pywebview 关闭窗口前回调该方法以判定是否需要警告
  closingConfirm?: () => string;
  datasourceDriver?: DatasourceDriver;
}

export default (window as any)["bt-visual-share"] as Share | undefined;
