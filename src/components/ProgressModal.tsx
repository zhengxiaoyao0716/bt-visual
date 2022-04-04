import { useState } from 'react'
import CircularProgress from '@mui/material/CircularProgress'
import Modal from '@mui/material/Modal'

export function useProgressModal() {
    const [open, setOpen] = useState(false)
    const show = () => setOpen(true)
    const hide = () => setOpen(false)
    const modal = (
        <Modal
            open={open}
            onClose={hide}
        >
            <CircularProgress />
        </Modal>
    )
    return { show, hide, modal }
}