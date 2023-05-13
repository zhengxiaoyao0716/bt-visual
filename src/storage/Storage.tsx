import { createContext, ReactNode, useContext, useMemo } from "react";

import globalShare, { StorageLike } from "../common/share";
import { usePromise } from "../components/Async";

class LocalStorage implements StorageLike {
  async load<T>(path: string, init: T): Promise<T> {
    // await new Promise((resolve) => setTimeout(resolve, 1000));
    const value = window.localStorage.getItem(path);
    if (value == null) return init;
    return JSON.parse(value);
  }

  async save<T>(path: string, data: T): Promise<void> {
    // await new Promise((resolve) => setTimeout(resolve, 1000));
    window.localStorage.setItem(path, JSON.stringify(data));
  }
}

const localStorage = new LocalStorage();
interface Options {
  local?: true;
  readonly?: true;
}
async function getStorage(options: Options): Promise<StorageLike> {
  if (options.local) return localStorage;
  return globalShare?.storage ?? Promise.resolve(localStorage);
}

interface PathDataCache {
  value?: [{}, boolean];
  promise?: PromiseLike<[{}, boolean]>;
}
const pathDataCache: { [path: string]: PathDataCache } = {};

function computePathDataCache(path: string) {
  const cached = pathDataCache[path];
  if (cached != null) return cached;
  return (pathDataCache[path] = {});
}
function computePathPromise<T extends {}>(
  path: string,
  init: PromiseLike<T>,
  cached: PathDataCache,
  options: Options
): PromiseLike<[T, boolean]> {
  if (cached.value != null) {
    return Promise.resolve(cached.value as [T, boolean]);
  }
  if (cached.promise != null) return cached.promise as Promise<[T, boolean]>;
  const promise = init.then(async (init) =>
    (await getStorage(options)).load(path, init).then(
      (data) => {
        if (cached.value != null) return cached.value as [T, boolean];
        const value = [data, false /* saving */] as [T, boolean];
        if (!Object.keys(init).every((key) => key in data)) {
          value[0] = { ...init, ...data };
        }
        cached.value = value;
        return value;
      },
      (error) => {
        if (cached.value != null) return cached.value as [T, boolean];
        else throw error;
      }
    )
  );
  cached.promise = promise;
  return promise;
}

export type ContextValue<T> =
  | {
      // resolved
      value: T;
      update(data: T): Promise<void>;
      saving?: false;
      error?: never;
    }
  | {
      // updating
      value: T;
      update?: never;
      saving: true;
      error?: never;
    }
  | {
      // rejected
      value?: never;
      update?: never;
      saving?: never;
      error: Error;
    }
  | null; //  loading

export interface Props<T> {
  children: ReactNode | ((context: ContextValue<T>) => ReactNode);
}
export interface Storage<T> {
  (props: Props<T>): JSX.Element;
  use(): ContextValue<T>;
  displayName: string;
  load(): Promise<T>;
  save(data: T): Promise<void>;
}

const LocalStorages: { [path: string]: Storage<{}> } = {};

export function createStorage<T extends {}>(
  name: string,
  path: string,
  init: () => PromiseLike<T>,
  options: Options = {}
): Storage<T> {
  const exist = LocalStorages[path];
  if (exist != null) return exist as Storage<T>;

  const Context = createContext(null as ContextValue<T>);
  const initData = init();

  function Storage({ children }: Props<T>) {
    const promise = useMemo(() => {
      const cached = computePathDataCache(path);
      return computePathPromise(path, initData, cached, options);
    }, [path]);

    const [state, setState] = usePromise(promise);
    const context: ContextValue<T> =
      state == null
        ? null
        : state instanceof Error
        ? { error: state }
        : state[1]
        ? {
            value: state[0],
            saving: true,
          }
        : {
            value: state[0],
            async update(data) {
              if (options.readonly) return;
              setState((state) => [
                (state as [T, boolean])[0],
                true /* saving */,
              ]);
              const storage = await getStorage(options);
              await storage.save(path, data);
              setState([data, false /* saving */]);
            },
          };

    return (
      <Context.Provider value={context}>
        {children instanceof Function ? children(context) : children}
      </Context.Provider>
    );
  }
  Storage.use = () => useContext(Context);
  Storage.displayName = name;
  Storage.load = async () => {
    const storage = await getStorage(options);
    return await storage.load(path, initData);
  };
  Storage.save = async (data: T) => {
    const storage = await getStorage(options);
    return await storage.save(path, data);
  };

  LocalStorages[path] = Storage;
  return Storage;
}
