import AddIcon from "@mui/icons-material/Add";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import ArrowDropUpIcon from "@mui/icons-material/ArrowDropUp";
import DeleteIcon from "@mui/icons-material/Delete";
import VerticalAlignBottomIcon from "@mui/icons-material/VerticalAlignBottom";
import VerticalAlignTopIcon from "@mui/icons-material/VerticalAlignTop";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import { MouseEvent, useState } from "react";

import { useTrans } from "../storage/Locale";
import { useDialogConfirm } from "./DialogConfirm";

export function useMoveableList<T, R>(
  items: T[],
  appendItem: (index: number) => PromiseLike<T | null>,
  refreshList: () => void,
  renderItem: (
    item: T,
    index: number,
    showMenu: (event: MouseEvent<HTMLElement>) => void,
    anchor: (index: number) => JSX.Element
  ) => R
) {
  const trans = useTrans();
  const [anchorEl, setAnchorEl] = useState<null | [number, HTMLElement]>(null);
  const showMenu = (index: number, event: MouseEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setAnchorEl([index, event.currentTarget]);
  };
  const hideMenu = () => setAnchorEl(null);
  const dialogConfirm = useDialogConfirm();
  const confirmRemoveProps = {
    cancel: trans("CANCEL"),
    submit: trans("REMOVE"),
    title: trans("Confirm to remove the item?"),
  };

  const moveUp = (index: number) => {
    if (index <= 0) return;
    const item = items[index];
    items[index] = items[index - 1];
    items[index - 1] = item;
    refreshList();
  };
  const moveDown = (index: number) => {
    if (index >= items.length - 1) return;
    const item = items[index];
    items[index] = items[index + 1];
    items[index + 1] = item;
    refreshList();
  };

  const append = () => {
    const index = anchorEl?.[0];
    if (index == null) return;
    hideMenu();
    appendItem(1 + index).then((item) => {
      if (item == null) return;
      items.splice(1 + index, 0, item);
      refreshList();
    });
  };
  const remove = () => {
    const index = anchorEl?.[0];
    if (index == null) return;
    hideMenu();
    dialogConfirm.confirm(confirmRemoveProps).then(async (confirmed) => {
      confirmed && items.splice(index, 1)[0];
      refreshList();
    });
  };
  const moveTop = () => {
    const index = anchorEl?.[0];
    if (index == null || index <= 0) return;
    hideMenu();
    const item = items.splice(index, 1)[0];
    items.unshift(item);
    refreshList();
  };
  const moveBottom = () => {
    const index = anchorEl?.[0];
    if (index == null || index >= items.length - 1) return;
    hideMenu();
    const item = items.splice(index, 1)[0];
    items.push(item);
    refreshList();
  };

  const renderAnchor = (index: number) => (
    <Stack>
      <ArrowDropUpIcon
        onClick={() => moveUp(index)}
        color={index <= 0 ? "disabled" : "inherit"}
      />
      <ArrowDropDownIcon
        onClick={() => moveDown(index)}
        color={index >= items.length - 1 ? "disabled" : "inherit"}
      />
    </Stack>
  );
  const listItems = items.map((item, index) =>
    renderItem(item, index, showMenu.bind(null, index), renderAnchor)
  );

  const itemsMenu = (
    <>
      <Menu
        open={anchorEl != null}
        anchorEl={anchorEl && anchorEl[1]}
        anchorOrigin={{ vertical: "center", horizontal: "right" }}
        onClose={hideMenu}
      >
        <MenuItem onClick={append}>
          <ListItemIcon>
            <AddIcon />
          </ListItemIcon>
          <ListItemText>{trans("Append Item")}</ListItemText>
        </MenuItem>
        <MenuItem onClick={remove}>
          <ListItemIcon>
            <DeleteIcon />
          </ListItemIcon>
          <ListItemText>{trans("Remove Item")}</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={moveTop}
          disabled={anchorEl && anchorEl[0] <= 0 ? true : false}
        >
          <ListItemIcon>
            <VerticalAlignTopIcon />
          </ListItemIcon>
          <ListItemText>{trans("Move Top")}</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={moveBottom}
          disabled={anchorEl && anchorEl[0] >= items.length - 1 ? true : false}
        >
          <ListItemIcon>
            <VerticalAlignBottomIcon />
          </ListItemIcon>
          <ListItemText>{trans("Move Bottom")}</ListItemText>
        </MenuItem>
      </Menu>
      {dialogConfirm.dialog}
    </>
  );

  const appender = (
    <MenuItem
      onClick={() =>
        appendItem(items.length).then((item) => {
          if (item == null) return;
          items.push(item);
          refreshList();
        })
      }
    >
      <ListItemIcon>
        <AddIcon />
      </ListItemIcon>
      <ListItemText>{trans("Append Item")}</ListItemText>
    </MenuItem>
  );

  return {
    listItems,
    itemMenu: itemsMenu,
    showMenu,
    hideMenu,
    appender,
  };
}
