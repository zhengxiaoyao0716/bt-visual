import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import TextField from "@mui/material/TextField";
import { ReactNode, useMemo, useState } from "react";

export type Props = {
  cancel?: string;
  submit?: string;
  title?: string;
  message?: ReactNode;
  values?: string[];
};

export function useDialogPrompt() {
  const [state, setState] = useState(
    null as {
      props: Props;
      cancel: () => void;
      submit: (values: string[]) => void;
    } | null
  );
  const props = state?.props;
  const values = useMemo(
    () => props?.values?.slice() ?? [],
    [
      props?.title,
      props?.message,
      props?.cancel,
      props?.submit,
      props?.values?.length ?? 0,
    ]
  );

  const showing = !!state;
  const dialog = (
    <Dialog open={showing} onClose={state?.cancel}>
      {props?.title && (
        <DialogTitle sx={{ minWidth: "16em" }}>{props.title}</DialogTitle>
      )}
      {(props?.message || props?.values) && (
        <DialogContent>
          {props?.message &&
            (typeof props.message === "string" ? (
              <DialogContentText>{props.message}</DialogContentText>
            ) : (
              props.message
            ))}
          {values.map((value, index) => (
            <TextField
              key={index}
              autoFocus
              margin="dense"
              fullWidth
              variant="standard"
              defaultValue={value}
              onChange={(e) => {
                values[index] = e.target.value;
              }}
            />
          ))}
        </DialogContent>
      )}
      {(state?.cancel || state?.submit) && (
        <DialogActions>
          {state?.cancel && (
            <Button onClick={state.cancel}>{props?.cancel}</Button>
          )}
          {state?.submit && (
            <Button onClick={() => state.submit(values)}>
              {props?.submit}
            </Button>
          )}
        </DialogActions>
      )}
    </Dialog>
  );

  function prompt<T>(
    props: Props & { onSubmit(values: string[]): Promise<T | null> }
  ): Promise<T | null> {
    return new Promise((resolve) =>
      setState({
        props,
        cancel() {
          resolve(null);
          setState(null);
        },
        submit(values: string[]) {
          resolve(props.onSubmit(values.map((text) => text.trim())));
          setState(null);
          values.forEach(
            (_value, index) => (values[index] = props?.values?.[index] ?? "")
          );
        },
      })
    );
  }
  const hide = () => state && state.cancel();
  return { showing, dialog, prompt, hide };
}
