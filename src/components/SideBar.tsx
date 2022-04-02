import { Drawer, IconButton, ListItem, ListItemButton, ListItemIcon, ListItemText, ListSubheader } from '@mui/material'
import { useState } from 'react'
import MenuIcon from '@mui/icons-material/Menu'

export function renderMenuIcon(open: boolean) { return (<MenuIcon sx={{ transform: open ? 'rotate(90deg)' : 'none' }} />) }

export function renderListItem(content: string | [JSX.Element, string, string?]) {
    if (typeof content === 'string') {
        return (<ListSubheader component="div" inset>{content}</ListSubheader>)
    }
    const [icon, text, href] = content
    return (
        <ListItemButton component="a" href={href ? href : 'javascript:void(0);'}>
            {icon && <ListItemIcon>{icon}</ListItemIcon>}
            <ListItemText primary={text} />
        </ListItemButton>
    )
}

export function useSideBar(icon: (open: boolean) => JSX.Element, context: JSX.Element) {
    const [open, setOpen] = useState(false)
    const toggle = () => setOpen(!open)
    const handler = <IconButton color="inherit" onClick={toggle} >{icon(open)}</IconButton>
    const drawer = <Drawer variant='temporary' open={open}>{context}</Drawer>
    return { handler, drawer }
}
