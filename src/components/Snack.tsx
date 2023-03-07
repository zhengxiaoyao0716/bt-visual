import { createContext, ReactNode, useContext, useRef, useState } from "react";
import Snackbar from "@mui/material/Snackbar";

interface SnackState {
  message?: string;
  resolve?: () => void;
}

interface SnackManager {
  show(message: string, duration?: number): Promise<void>;
  hide(): void;
}

const SnackContext = createContext(null as SnackManager | null);

export default function Snack({ children }: { children?: ReactNode }) {
  const ref = useRef(0);
  const [snack, setSnack] = useState<SnackState>({});
  const hide = () =>
    setSnack((snack) => {
      snack.resolve && snack.resolve();
      return { message: "" };
    });
  const show = (message: string, duration: number = 3000): Promise<void> =>
    new Promise((resolve) =>
      setSnack((snack) => {
        snack.resolve && snack.resolve();
        const id = ++ref.current;
        setTimeout(() => id === ref.current && hide(), duration);
        return { message, resolve };
      })
    );

  return (
    <SnackContext.Provider value={{ show, hide }}>
      {children ?? null}
      <Snackbar
        open={!!snack.message}
        message={snack.message}
        // autoHideDuration={snack.duration} // WTF?
      />
    </SnackContext.Provider>
  );
}

Snack.use = () => useContext(SnackContext) as SnackManager;
