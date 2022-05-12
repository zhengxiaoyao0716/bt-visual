import globalShare, { SocketLike } from "./share";

/**
 * @class Socket - A socket is a connection between a client and a server.
 * 通信原理：
 * ```
 *   const session = request(action, params);   // -> send(`${secret}>${JSON.stringify({ action, params })}`);
 *   ...
 *   await session.send(message1);              // -> send(`${secret}-${message1}`);
 *   await session.read();                      // -> read(`${secret}-${message1}`);
 *   await session.send(message2);              // -> send(`${secret}-${message2}`);
 *   await session.read();                      // -> read(`${secret}-${message2}`);
 *   ...
 *   try {
 *     const result = await session.done();     // -> read(`${secret}<${JSON.stringify({ result, reason })}`);
 *   } catch (reason) {
 *     // ...
 *   }
 * ```
 */
export default class Socket {
  private readonly socket: SocketLike;
  private readonly eventTarget = new EventTarget();

  constructor(readonly address: string, readonly identity: string = "SOCKET") {
    const Socket = globalShare?.Socket ?? WSSocket;

    const onMessage = (message: string) => {
      if (!message.startsWith(this.identity)) return; // 非本模块消息，忽略
      const text = message.slice(this.identity.length);
      this.eventTarget.dispatchEvent(
        new MessageEvent("message", { data: text })
      );
    };
    this.socket = new Socket(address, onMessage);
  }

  send(text: string) {
    return this.socket.send(`${this.identity}${text}`);
  }

  read(prefix: string, handler: (text: string) => void): () => void {
    const onMessage = (event: Event) => {
      const message = (event as MessageEvent).data as string;
      if (!message.startsWith(prefix)) return;
      handler(message.slice(prefix.length));
    };
    this.eventTarget.addEventListener("message", onMessage);
    return () => this.eventTarget.removeEventListener("message", onMessage);
  }

  close(): void {
    this.socket.close();
    // 严格来说需要移除所有监听器，但 socket 只要回收了，eventTarget 以及其监听器应该也就一起回收了
    // this.eventTarget.removeEventListener("message");
  }

  private requestIdGenerator = 0;
  request<R, P = {}>(action: string, params: P): Session<R> {
    if (!action) throw new Error("action is required");
    const now = Date.now().toString(36);
    const id = ++this.requestIdGenerator;
    const session = new RequestSession<R>(this, `[${now}#${id}]`);
    session.sendText(JSON.stringify({ action, params }), ">");
    return session;
  }

  session<R, P = {}>(
    action: string,
    handle: Parameters<ResponseSession<R, P>["execute"]>[2]
  ): () => void {
    if (!action) throw new Error("action is required");
    const onMessage = (event: Event) => {
      const message = (event as MessageEvent).data as string;
      const [secret, text] = message.split(">", 2);
      if (!secret || !text) return;
      try {
        const resp = JSON.parse(text) ?? {};
        if (resp.action !== action) return;
        const session = new ResponseSession<R, P>(this, secret);
        session.execute(action, resp.params, handle);
      } catch (error) {
        return;
      }
    };
    this.eventTarget.addEventListener("message", onMessage);
    return () => this.eventTarget.removeEventListener("message", onMessage);
  }
}

abstract class AbsSession {
  private readonly textCache: string[] = [];
  private status: "idle" | "busy" | "closed" = "idle";
  private resolve: undefined | ((text: string) => void);
  readonly close: () => void;

  constructor(
    private readonly socket: Socket,
    private readonly secret: string
  ) {
    const stop = socket.read(secret, (text) => {
      if (this.resolve) this.resolve(text);
      else this.textCache.push(text);
    });
    this.close = () => {
      stop();
      this.status = "closed";
    };
  }

  async readText(timeout: number): Promise<string> {
    if (this.status !== "idle") throw new Error(`session ${this.status}`);

    const text = this.textCache.pop();
    if (text != null) return text;

    this.status = "busy";
    return new Promise<string>((resolve, reject) => {
      const tid = setTimeout(() => {
        this.resolve = undefined;
        this.status = "closed";
        reject("read session timeout");
        this.close(); // 长时间未收到回复，关闭会话
      }, timeout);
      this.resolve = (text: string) => {
        clearTimeout(tid);
        this.status === "busy" && (this.status = "idle");
        resolve(text);
      };
    });
  }

  async sendText(text: string, flag: ">" | "-" | "<"): Promise<void> {
    return this.socket.send(`${this.secret}${flag}${text}`);
  }

  readonly read = async (timeout: number = 3000): Promise<string> => {
    const text = await this.readText(timeout);
    if (text[0] !== "-") throw new Error(`invalid response: ${text}`);
    return text.slice(1);
  };

  readonly send = (text: string): Promise<void> => {
    return this.sendText(text, "-");
  };
}

class RequestSession<R> extends AbsSession {
  readonly done = async (timeout: number = 6000): Promise<R> => {
    const text = await this.readText(timeout);
    if (text[0] !== "<") throw new Error(`invalid response: ${text}`);
    this.close(); // 收到回复后关闭会话

    const resp = JSON.parse(text.slice(1)) ?? {};
    if (typeof resp !== "object") throw new Error(`invalid response: ${text}`);

    if (resp.reason != null) throw new Error(resp.reason);
    else return resp.result as R;
  };
}

class ResponseSession<R, P = {}> extends AbsSession {
  async execute(
    action: string,
    params: P,
    handle: (
      params: P,
      read: Session<R>["read"],
      send: Session<R>["send"]
    ) => Promise<R>
  ): Promise<void> {
    try {
      const result = await handle(params, this.read, this.send);
      this.sendText(`${JSON.stringify({ result })}`, "<");
    } catch (error) {
      if (error instanceof Error) {
        this.sendText(`${JSON.stringify({ reason: error.message })}`, "<");
        // throw 的异常要打印日志
        console.error(`execute ${action} session error`, error);
      } else {
        // 其他类型，比如通过 Promise.reject 给出的错误，直接发送给客户端
        const reason =
          typeof error === "object" ? JSON.stringify(error) : error;
        this.sendText(`${JSON.stringify({ reason })}`, "<");
      }
    } finally {
      this.close();
    }
  }
}

export type Session<R> = RequestSession<R> extends {
  read: infer R;
  send: infer S;
  done: infer D;
}
  ? {
      read: R;
      send: S;
      done: D;
    }
  : never;

// 默认 Websocket 版的实现
class WSSocket implements SocketLike {
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

  private ws: Promise<WebSocket | null> | undefined;
  private autoConnect(): Promise<WebSocket | null> {
    if (this.ws != null) return this.ws;
    this.ws = new Promise((resolve, _reject) => {
      try {
        const ws = new WebSocket(this.address);
        ws.addEventListener("message", this.messageListener);
        const onOpen = () => resolve(ws);
        ws.addEventListener("open", onOpen);
        ws.addEventListener("close", () => {
          ws.removeEventListener("open", onOpen);
          this.ws = undefined;
        });
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
  mockText(text: string): void;
}

export async function mockSocket<A extends any[]>(
  socket: Socket,
  handle: (ms: MockedSocket, ...args: A) => void,
  ...args: A
): Promise<void> {
  if (socket.address !== "/test") return; // 连接地址不是 /test，不 mock
  // @ts-ignore
  const eventTarget = socket.eventTarget;
  // @ts-ignore
  const wsSocket = socket.socket instanceof WSSocket ? socket.socket : null;
  // 内部结构不符合期望，无法 mock
  if (eventTarget == null || wsSocket == null) return;
  // @ts-ignore
  const ws = await wsSocket.autoConnect();
  if (ws != null) return; // 连接成功，不再 mock

  // @ts-ignore
  wsSocket.autoConnect = () => Promise.resolve(null);
  console.info(`connect ${socket.address} failed, mock the socket`);

  const mockText = (text: string) =>
    eventTarget.dispatchEvent(new MessageEvent("message", { data: text }));
  handle({ mockText }, ...args);
}

export interface MockedSession<R> {
  mockText(text: string): void;
  mockDone(data: R): void;
}
export async function mockSession<R, A extends any[]>(
  session: Session<R>,
  handle: (ms: MockedSession<R>, ...args: A) => void,
  ...args: A
): Promise<void> {
  // @ts-ignore
  const socket = (session as AbsSession).socket;
  if (socket == null) return;
  // @ts-ignore
  const secret = (session as AbsSession).secret;
  if (secret == null) return;

  mockSocket(socket, (mockedSocket) => {
    const mockText = (text: string) =>
      mockedSocket.mockText(`${secret}-${text}`);
    const mockDone = (data: R) =>
      mockedSocket.mockText(`${secret}<${JSON.stringify({ result: data })}`);
    handle({ mockText, mockDone }, ...args);
  });
}
