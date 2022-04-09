import { useDialogPrompt, Props as DialogPromptProps } from "./DialogPrompt";

export type Props = Omit<DialogPromptProps, "values" | "onSubmit">;

export function useDialogConfirm() {
  const { dialog, prompt } = useDialogPrompt();
  return {
    dialog,
    confirm: (props: Props) =>
      prompt({
        ...props,
        onSubmit: async (_values) => true,
      }),
  };
}
