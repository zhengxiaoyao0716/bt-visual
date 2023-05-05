import {
  ComponentType,
  forwardRef,
  ReactElement,
  ReactNode,
  Ref,
  useState,
} from "react";
import { TransitionProps } from "@mui/material/transitions";
import Slide from "@mui/material/Slide";
import Dialog from "@mui/material/Dialog";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";

import Snack from "./Snack";

const Transition = forwardRef(function Transition(
  props: TransitionProps & {
    children: ReactElement;
  },
  ref: Ref<unknown>
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

export interface Props {
  hide(): void;
  appBar(children: ReactNode): JSX.Element;
}

export function useDialogPage(Content: ComponentType<Props>) {
  const [open, setOpen] = useState(false);
  const show = () => setOpen(true);
  const hide = () => setOpen(false);
  if (!open) return { dialog: <Snack />, show, hide };

  const appBar = (children: ReactNode) => (
    <AppBar sx={{ position: "relative" }}>
      <Toolbar variant="dense">
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
  const dialog = (
    <Snack>
      <Dialog
        fullScreen
        open={open}
        onClose={hide}
        TransitionComponent={Transition}
      >
        <Content hide={hide} appBar={appBar} />
      </Dialog>
    </Snack>
  );
  return { dialog, show, hide };
}
