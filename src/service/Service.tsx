import {
  createContext,
  Dispatch,
  ReactNode,
  SetStateAction,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import Loading from "../components/Loading";

export type Dispatcher<S> = Dispatch<
  SetStateAction<SetStateAction<Partial<S>>>
>;

export default function createService<P extends {}, S extends {}, M>(
  name: string,
  launch: (props: P, dispatch: Dispatcher<S>) => [S | null, M, () => void] // [initial state, manager, cleanup]
) {
  const ServiceContext = createContext(
    null as readonly [Partial<S>, M, Dispatcher<S>] | null
  );

  function Service(props: P & { children?: ReactNode }) {
    const [state, setState] = useState<Partial<S>>({});
    const [manager, setManager] = useState<M | null>(null);
    const dispatch: Dispatcher<S> = useCallback(
      (merge) =>
        setState((state) => ({
          ...state,
          ...(merge instanceof Function ? merge(state || {}) : merge),
        })),
      [setState]
    );

    useEffect(() => {
      const [state, manager, cleanup] = launch(props, dispatch);
      setManager(manager);
      state && setState(state);
      return () => {
        cleanup();
        setManager(null);
        setState({});
      };
    }, [props, setState, setManager]);

    return manager == null ? (
      <Loading />
    ) : (
      <ServiceContext.Provider value={[state, manager, dispatch] as const}>
        {props.children}
      </ServiceContext.Provider>
    );
  }
  Service.use = () => useContext(ServiceContext);
  Service.displayName = name;
  return Service;
}
