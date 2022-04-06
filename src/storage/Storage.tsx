import { createContext, ReactNode, useContext, useMemo } from "react";

import { usePromise } from "../components/Async";

class LocalStorage {
  async load<T>(path: string, init: T): Promise<T> {
    const value = window.localStorage.getItem(path);
    if (value == null) return init;
    return JSON.parse(value);
  }

  async save<T>(path: string, data: T): Promise<void> {
    window.localStorage.setItem(path, JSON.stringify(data));
  }
}

const localStorage = new LocalStorage();
const storage = localStorage; // TODO file system

interface Options {
  local?: boolean;
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
function computePathPromise<T>(
  path: string,
  init: PromiseLike<T>,
  cached: PathDataCache,
  { local = false }: Options
): PromiseLike<[T, boolean]> {
  if (cached.value != null)
    return Promise.resolve(cached.value as [T, boolean]);
  if (cached.promise != null) return cached.promise as Promise<[T, boolean]>;
  const promise = init.then((init) =>
    (local ? localStorage : storage).load(path, init).then(
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
  hoc<P>(Component: React.ComponentType<P>): React.ComponentType<P>;
  use(): ContextValue<T>;
  displayName: string;
}

export function createStorage<T>(
  name: string,
  path: string,
  init: PromiseLike<T>,
  options: Options = {}
): Storage<T> {
  const Context = createContext(null as ContextValue<T>);

  function Storage({ children }: Props<T>) {
    const promise = useMemo(() => {
      const cached = computePathDataCache(path);
      return computePathPromise(path, init, cached, options);
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
              setState([state[0], true /* saving */]);
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
  Storage.hoc = function <P>(Component: React.ComponentType<P>) {
    function WrappedComponent(props: P) {
      return (
        <Storage>
          <Component {...props} />
        </Storage>
      );
    }
    WrappedComponent.displayName = `Storage(${
      Component.displayName || Component.name || "Component"
    })`;
    return WrappedComponent;
  };
  Storage.use = () => useContext(Context);
  Storage.displayName = name;
  return Storage;
}
