import MenuIcon from "@mui/icons-material/Menu";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import ListSubheader from "@mui/material/ListSubheader";
import { ReactNode, useState } from "react";

export function renderMenuIcon(open: boolean) {
  return <MenuIcon sx={{ transform: open ? "rotate(90deg)" : "none" }} />;
}

export function renderListItem(
  content: string | [ReactNode, string, string?, string?],
  index?: number
) {
  if (typeof content === "string") {
    return (
      <ListSubheader component="div" inset>
        {content}
      </ListSubheader>
    );
  }
  const [icon, text, href, target] = content;
  return (
    <ListItemButton
      component="a"
      href={href ? href : "javascript:void(0);"}
      target={target}
      key={index}
    >
      {icon && <ListItemIcon>{icon}</ListItemIcon>}
      <ListItemText primary={text} />
    </ListItemButton>
  );
}

export function useSideBar(
  icon: (open: boolean) => JSX.Element,
  context: JSX.Element
) {
  const [open, setOpen] = useState(false);
  const toggle = () => setOpen(!open);
  const handler = (
    <IconButton color="inherit" onClick={toggle}>
      {icon(open)}
    </IconButton>
  );
  const drawer = (
    <Drawer variant="temporary" open={open}>
      {context}
    </Drawer>
  );
  return { handler, drawer };
}
