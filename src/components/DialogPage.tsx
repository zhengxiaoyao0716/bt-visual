import { ComponentType, forwardRef, ReactNode, useState } from "react";
import { TransitionProps } from "@mui/material/transitions";
import Slide from "@mui/material/Slide";
import Dialog from "@mui/material/Dialog";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import Snackbar from "@mui/material/Snackbar";

const Transition = forwardRef(function Transition(
  props: TransitionProps & {
    children: React.ReactElement;
  },
  ref: React.Ref<unknown>
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

export interface Props {
  hide(): void;
  snack(message: string, duraiont?: number): Promise<void>;
  appBar(children: ReactNode): JSX.Element;
}

export function useDialogPage(Content: ComponentType<Props>) {
  const [open, setOpen] = useState(false);
  const show = () => setOpen(true);
  const hide = () => setOpen(false);
  const appBar = (children: ReactNode) => (
    <AppBar sx={{ position: "relative" }}>
      <Toolbar>
        <IconButton
          edge="start"
          color="inherit"
          onClick={hide}
          aria-label="close"
        >
          <CloseIcon />
        </IconButton>
        {children}
      </Toolbar>
    </AppBar>
  );

  const [snack, setSnack] = useState({ message: "" } as {
    message: string;
    duration?: number;
    onClose?: () => void;
  });
  const showSnack = (message: string, duration: number = 3000): Promise<void> =>
    new Promise((resolve) => setSnack({ message, duration, onClose: resolve }));

  const dialog = (
    <Dialog
      fullScreen
      open={open}
      onClose={hide}
      TransitionComponent={Transition}
    >
      <Content hide={hide} snack={showSnack} appBar={appBar} />
      <Snackbar
        open={!!snack.message}
        message={snack.message}
        autoHideDuration={snack.duration}
        onClose={() => {
          setSnack({ message: "" });
          snack.onClose?.();
        }}
      />
    </Dialog>
  );
  return { dialog, show, hide, snack: showSnack };
}
