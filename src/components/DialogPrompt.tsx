import { ReactNode, useMemo, useState } from 'react'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import TextField from '@mui/material/TextField'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'

export type Props = {
    cancel?: string
    submit?: string
    title?: string
    message?: ReactNode
    values?: string[]
}

export function useDialogPrompt<T>(onSubmit: (values: string[]) => Promise<T | null>) {
    const [state, setState] = useState(null as { props: Props, cancel: () => void, submit: () => void } | null)
    const props = state?.props
    const values = useMemo(() => (props?.values?.slice() ?? []), [props?.title, props?.message, props?.cancel, props?.submit, ...props?.values ?? []])

    const dialog = (
        <Dialog open={!!state} onClose={state?.cancel}>
            {props?.title && <DialogTitle sx={{ minWidth: '16em' }}>{props.title}</DialogTitle>}
            {(props?.message || props?.values) && (
                <DialogContent>
                    {props?.message && (typeof props.message === 'string'
                        ? <DialogContentText>{props.message}</DialogContentText>
                        : props.message
                    )}
                    {values.map((value, index) => (
                        <TextField
                            key={index}
                            autoFocus
                            margin="dense"
                            fullWidth
                            variant="standard"
                            defaultValue={value}
                            onChange={e => { values[index] = e.target.value }}
                        />
                    ))}
                </DialogContent>
            )}
            {(state?.cancel || state?.submit) && (
                <DialogActions>
                    {state?.cancel && <Button onClick={state.cancel}>{props?.cancel}</Button>}
                    {state?.submit && <Button onClick={state.submit}>{props?.submit}</Button>}
                </DialogActions>
            )}
        </Dialog>
    )
    const prompt = (props: Props): Promise<T | null> => new Promise(resolve =>
        setState({
            props,
            cancel() {
                resolve(null)
                setState(null)
            },
            submit() {
                resolve(onSubmit(values.slice()))
                setState(null)
                values.forEach((_value, index) => values[index] = props?.values?.[index] ?? '')
            },
        })
    )
    const hide = () => state && state.cancel()
    return { dialog, prompt, hide }
}