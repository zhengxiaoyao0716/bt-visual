import { useDialogPrompt, Props as DialogPromptProps } from './DialogPrompt'

export type Props = Omit<DialogPromptProps, 'values'>

export function useDialogConfirm() {
    const { dialog, prompt } = useDialogPrompt<boolean>(async _values => true)
    return { dialog, confirm: (props: Props) => prompt(props) }
}