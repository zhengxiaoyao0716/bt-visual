import CloseIcon from "@mui/icons-material/Close";
import AppBar from "@mui/material/AppBar";
import Dialog from "@mui/material/Dialog";
import IconButton from "@mui/material/IconButton";
import Slide from "@mui/material/Slide";
import Toolbar from "@mui/material/Toolbar";
import { TransitionProps } from "@mui/material/transitions";
import {
  ComponentType,
  forwardRef,
  ReactElement,
  ReactNode,
  Ref,
  useState,
} from "react";

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
  if (!open) return { dialog: null, show, hide };

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
    <Dialog
      fullScreen
      open={open}
      onClose={hide}
      TransitionComponent={Transition}
    >
      <Content hide={hide} appBar={appBar} />
    </Dialog>
  );
  return { dialog, show, hide };
}
