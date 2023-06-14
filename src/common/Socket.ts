import globalShare, { SocketLike } from "./share";

export interface Close {
  (): void;
}

export interface Session {
  post(path: string, text: string): Promise<void>;
  once(path: string, handler: (text: string) => void): Close;

  read(timeout?: number): Promise<string>;
  send(text: string): Promise<void>;
}

export interface Done {
  done(timeout?: number): Promise<string>;
}

/**
 * @class Socket - A socket is a connection between a client and a server.
 * session 通信模型：
 * ``` javascript
 *     const session = request(path, text);   // -> `${secret}>${path}>${text}`
 *     ...
 *     session.post(path, text);              // -> `${secret}|${path}${text}`
 *     session.once(path, handler);           // <- `${secret}|${path}${text}`
 *     ...
 *     await session.send(message1);          // -> `${secret}-${message1}`
 *     await session.read();                  // <- `${secret}-${message1}`
 *     await session.send(message2);          // -> `${secret}-${message2}`
 *     await session.read();                  // <- `${secret}-${message2}`
 *     ...
 *     try {
 *       const result = await session.done(); // <- `${secret}<${result}<${reason}`;
 *     } catch (reason) {
 *       // ...
 *     }
 * ```
 */
export default class Socket {
  private readonly socket: SocketLike;
  private readonly eventTarget = new EventTarget();

  constructor(
    readonly address: string,
    readonly namespace: string = "ROOT:",
    readonly ping: string = ">PING!",
    readonly pong: string = "<PONG!"
  ) {
    const Socket = globalShare?.Socket ?? WebSocket;

    const onMessage = (message: string) => {
      if (!message.startsWith(this.namespace)) return; // 非本模块消息，忽略
      const data = message.slice(this.namespace.length);
      this.eventTarget.dispatchEvent(new MessageEvent("message", { data }));
    };
    const protocal =
      location.protocol === "http:"
        ? "ws:"
        : location.protocol === "https:"
        ? "wss:"
        : location.protocol;
    const url = new URL(
      address,
      `${protocal}${location.href.slice(location.protocol.length)}`
    );
    url.search = url.search
      ? `${url.search}&ns=${namespace}`
      : `?ns=${namespace}`;
    this.socket = new Socket(url.toString(), onMessage);

    this.once(this.ping, async (text) => this.post(this.pong, text));
  }

  /** 发布消息 */
  post(path: string, text: string): Promise<void> {
    return this.socket.send(`${this.namespace}${path}${text}`);
  }

  /** 监听消息 */
  once(path: string, handler: (text: string) => void): Close {
    const onMessage = (event: Event) => {
      const data = (event as MessageEvent).data as string;
      if (!data.startsWith(path)) return;
      handler(data.slice(path.length));
    };
    this.eventTarget.addEventListener("message", onMessage);
    return () => this.eventTarget.removeEventListener("message", onMessage);
  }

  /** 关闭连接 */
  close(): void {
    this.socket.close();
    // 严格来说需要移除所有监听器，但 socket 只要回收了，eventTarget 以及其监听器应该也就一起回收了
    // this.eventTarget.removeEventListener("message");
  }

  private requestIdGenerator = 0;
  /** 请求会话 */
  request(path: string, text: string): Session & Done {
    const now = Date.now().toString(36).slice(-6);
    const id = this.requestIdGenerator.toString(36).padStart(3, "0");
    this.requestIdGenerator = (1 + this.requestIdGenerator) % (36 * 36 * 36);
    const salt = ((Math.random() * 36) | 0).toString(36);
    const session = new RequestSession(this, `[${now}${id}${salt}]`);
    session.sendText(">", `${path}>${text}`);
    return session;
  }

  /** 监听会话 */
  session(
    path: string,
    handler: (session: Session, text: string) => Promise<string>
  ): Close {
    const onMessage = (event: Event) => {
      const data = (event as MessageEvent).data as string;
      const [secret, match, text] = data.split(">", 3);
      if (!secret || path !== match || text == null) return;
      const session = new ResponseSession(this, secret);
      session.execute(path, text, handler);
    };
    this.eventTarget.addEventListener("message", onMessage);
    return () => this.eventTarget.removeEventListener("message", onMessage);
  }
}

abstract class AbsSession implements Session {
  private readonly closeSet: Set<() => void> = new Set();
  private readonly textBuffer: string[] = [];
  private readonly resolvers: ((text: string) => void)[] = [];

  constructor(
    private readonly socket: Socket,
    private readonly secret: string
  ) {
    const close = socket.once(secret, (text) => {
      if (text.charAt(0) === "|") return;
      const resolve = this.resolvers.shift();
      if (resolve) resolve(text);
      else this.textBuffer.push(text);
    });
    this.closeSet.add(close);
  }

  readonly close = () => this.closeSet.forEach((close) => close());

  async readText(timeout: number): Promise<string> {
    const buffered = this.textBuffer.shift();
    if (buffered != null) return buffered;

    return new Promise<string>((resolve, reject) => {
      const tid =
        timeout <= 0
          ? null
          : setTimeout(() => {
              reject("read session timeout");
              this.close(); // 长时间未收到回复，关闭会话
            }, timeout);
      this.resolvers.push((text: string) => {
        tid && clearTimeout(tid);
        resolve(text);
      });
    });
  }

  async sendText(flag: ">" | "-" | "<" | "|", text: string): Promise<void> {
    return this.socket.post(`${this.secret}${flag}`, text);
  }

  readonly post = (path: string, text: string): Promise<void> => {
    return this.sendText("|", `${path}${text}`);
  };

  readonly once = (path: string, handler: (text: string) => void): Close => {
    const close = this.socket.once(`${this.secret}|${path}`, handler);
    this.closeSet.add(close);
    return () => {
      close();
      this.closeSet.delete(close);
    };
  };

  readonly read = async (timeout: number = 0): Promise<string> => {
    const text = await this.readText(timeout);
    const flag = text[0];
    if (flag === "<") this.close();
    if (flag !== "-") throw new Error(`invalid response: ${text}`);
    return text.slice(1);
  };

  readonly send = (text: string): Promise<void> => {
    return this.sendText("-", text);
  };
}

class RequestSession extends AbsSession {
  readonly done = async (timeout: number = 6000): Promise<string> => {
    const text = await this.readText(timeout).finally(() => this.close()); // 收到回复后关闭会话
    if (text[0] !== "<") throw new Error(`invalid response: ${text}`);
    if (text.length === 1) return "";
    else if (text[1] === "<") throw new Error(text.slice(2));
    // else if (text[text.length - 1] === "<") return text.slice(1, -1);
    else return text.slice(1);
  };
}

class ResponseSession extends AbsSession {
  async execute(
    path: string,
    text: string,
    handle: (session: Session, text: string) => Promise<string>
  ): Promise<void> {
    try {
      const result = await handle(this, text);
      this.sendText("<", result);
    } catch (error) {
      if (error instanceof Error) {
        this.sendText("<", `<${error.message}`);
        // throw 的异常要打印日志
        console.error(`execute ${path} session error`, error);
      } else {
        // 其他类型，比如通过 Promise.reject 给出的错误，直接发送给客户端
        const reason =
          typeof error === "object" ? JSON.stringify(error) : error;
        this.sendText("<", `<${reason}`);
      }
    } finally {
      this.close();
    }
  }
}

// 默认 window.WebSocket 版的实现
class WebSocket implements SocketLike {
  private readonly messageListener: (event: MessageEvent) => void;

  constructor(private address: string, read: (message: string) => void) {
    this.messageListener = (event) =>
      read(typeof event.data === "string" ? event.data : "");
    this.autoConnect();
  }

  async send(message: string): Promise<void> {
    const ws = await this.autoConnect();
    if (ws) ws.send(message);
    else console.error("send message failed", message);
  }

  private ws: Promise<globalThis.WebSocket | null> | undefined;
  private autoConnect(): Promise<globalThis.WebSocket | null> {
    if (this.ws != null) return this.ws;
    this.ws = new Promise((resolve, _reject) => {
      try {
        const ws = new window.WebSocket(this.address);
        ws.addEventListener("message", this.messageListener);
        ws.addEventListener("open", () => resolve(ws));
        ws.addEventListener("close", () => {
          this.ws = undefined;
        });
        ws.addEventListener("error", (event) => console.error(event));
      } catch (error) {
        this.ws = undefined;
        console.error(`connect ${this.address} error`, error);
        resolve(null);
      }
    });
    return this.ws;
  }

  async close(): Promise<void> {
    if (this.ws == null) return;
    const ws = await this.ws;
    if (ws == null) return;
    ws.removeEventListener("message", this.messageListener);
    ws.close();
    this.ws = undefined;
  }
}

export interface MockedSocket {
  read(path: string, text: string): void;
}

const mockSymbol = Symbol("mock");

export async function mockSocket<A extends any[]>(
  socket: Socket,
  handle: (ms: MockedSocket, ...args: A) => void,
  ...args: A
): Promise<void> {
  // if (!import.meta.env.DEV) return;
  if (socket.address !== "/test") return; // 连接地址不是 /test，不 mock

  const mocked = (socket as any)[mockSymbol];
  if (mocked != null) {
    handle(mocked, ...args);
    return;
  }
  // @ts-ignore
  const eventTarget = socket.eventTarget;
  // @ts-ignore
  const wsSocket = socket.socket instanceof WebSocket ? socket.socket : null;
  // 内部结构不符合期望，无法 mock
  if (eventTarget == null || wsSocket == null) return;
  const ws = await Promise.any([
    // @ts-ignore
    wsSocket.autoConnect(),
    new Promise((r) => setTimeout(() => r(null), 1000)),
  ]);
  if (ws != null) return; // 连接成功，不再 mock

  // @ts-ignore
  wsSocket.send = () => {};
  console.info(`connect ${socket.address} failed, mock the socket`);

  const read = (path: string, text: string) =>
    eventTarget.dispatchEvent(
      new MessageEvent("message", { data: `${path}${text}` })
    );
  const mockedNew = { read };
  (socket as any)[mockSymbol] = mockedNew;
  handle(mockedNew, ...args);
}

export interface MockedSession {
  once(path: string, text: string): void;
  read(text: string): void;
  done(text: string): void;
}
export async function mockSession<R, A extends any[]>(
  session: Session & Done,
  handle: (ms: MockedSession, ...args: A) => void,
  ...args: A
): Promise<void> {
  // if (!import.meta.env.DEV) return;
  // @ts-ignore
  const socket = (session as AbsSession).socket;
  if (socket == null) return;
  // @ts-ignore
  const secret = (session as AbsSession).secret;
  if (secret == null) return;

  mockSocket(socket, (mockedSocket) => {
    const once = (path: string, text: string) =>
      mockedSocket.read(`${secret}|`, `${path}${text}`);
    const read = (text: string) => mockedSocket.read(`${secret}-`, text);
    const done = (text: string) => mockedSocket.read(`${secret}<`, text);
    handle({ once, read, done }, ...args);
  });
}
