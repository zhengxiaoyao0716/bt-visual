import {
  createContext,
  Dispatch,
  ReactNode,
  SetStateAction,
  useContext,
  useEffect,
  useState,
} from "react";
import Loading from "../../components/Loading";

export type Dispatcher<S> = Dispatch<
  SetStateAction<SetStateAction<Partial<S>>>
>;
export interface Service<P extends {}, S extends {}, M> {
  (props: P & { children?: ReactNode }): JSX.Element;
  use(): readonly [Partial<S>, M] | null;
  displayName: string;
}

export default function createService<P extends {}, S extends {}, M>(
  name: string,
  launch: (
    props: Omit<P, "children">,
    dispatch: Dispatcher<S>
  ) => {
    state?: S;
    manager: M;
    cleanup: () => void;
  } // [initial state, manager, cleanup]
): Service<P, S, M> {
  const ServiceContext = createContext(null as readonly [Partial<S>, M] | null);

  function Service({ children, ...props }: P & { children?: ReactNode }) {
    const [state, setState] = useState<Partial<S>>({});
    const [manager, setManager] = useState<M | undefined>(undefined);

    useEffect(() => {
      const dispatch: Dispatcher<S> = (merge) =>
        setState((state) => ({
          ...state,
          ...(merge instanceof Function ? merge(state || {}) : merge),
        }));
      const { state, manager, cleanup } = launch(props, dispatch);
      state && setState(state);
      setManager(manager);
      return () => cleanup();
    }, Object.values(props));

    return manager == null ? (
      <Loading />
    ) : (
      <ServiceContext.Provider value={[state, manager] as const}>
        {children}
      </ServiceContext.Provider>
    );
  }
  Service.use = () => useContext(ServiceContext);
  Service.displayName = name;
  return Service;
}
