import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Box from "@mui/material/Box";
import Breadcrumbs from "@mui/material/Breadcrumbs";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import { useEffect, useState } from "react";
import { TreeGroup } from "../common/service/DebugService";
import { TransFunction, useTrans } from "../storage/Locale";

interface Props {
  treeGroups: TreeGroup[];
  loadGroup(parentId: string, groupId: string): void;
  loadTree(groupId: string, treeId: string): void;
}

export default function TreeSelector({
  treeGroups,
  loadGroup,
  loadTree,
}: Props) {
  const trans = useTrans();
  const [state, setState] = useState(
    null as { parents: TreeGroup[]; group?: TreeGroup } | null
  );
  useEffect(() => {
    if (state != null) setState(null);
  }, [treeGroups]);
  const parents = state?.parents ?? [
    {
      id: "",
      label: trans("ALL"),
    },
  ];
  const group = state?.group;
  const groups = group == null ? treeGroups : group.groups;
  const trees = group?.trees;

  const selectParent = (index: number) => {
    if (index <= 0) {
      loadGroup("", "");
    } else if (index === 1) {
      setState({ parents: [parents[0]] });
    } else {
      setState({ parents: parents.slice(0, index), group: parents[index - 1] });
    }
  };
  const selectGroup = (groupId: string) => {
    if (groups == null) return;
    const found = groups.find((g) => g.id === groupId);
    if (found == null) return;
    if (found.groups == null && found.trees == null) {
      // 没有子分组也没有子树，尝试加载分组
      loadGroup(group?.id ?? "", groupId);
    } else {
      setState({ parents: [...parents, found], group: found });
    }
  };
  const selectTree = trees && ((treeId: string) => loadTree(group.id, treeId));

  return (
    <>
      <Breadcrumbs aria-label="breadcrumb" sx={{ m: 2 }}>
        {parents.map((group, index) => (
          <Button
            variant="text"
            key={index}
            color="primary"
            onClick={() => selectParent(index)}
          >
            {trans(group.label)}
          </Button>
        ))}
      </Breadcrumbs>
      <Container>
        <GroupsRender trans={trans} select={selectGroup} groups={groups} />
        {selectTree && (
          <TreesRender trans={trans} select={selectTree} trees={trees} />
        )}
      </Container>
    </>
  );
}

interface BaseRenderProps {
  trans: TransFunction;
  select(id: string): void;
}
function AccordionRender<T extends { id: string }>({
  trans,
  select,
  label,
  items,
  children,
}: BaseRenderProps & {
  label: string;
  items: T[];
  children: (item: T) => JSX.Element;
}) {
  return (
    <Accordion defaultExpanded={true} sx={{ boxShadow: "none" }}>
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        sx={{
          boxShadow: "0 0 3px 1px #ccc",
        }}
      >
        <Typography sx={{ flexGrow: 1 }}>{label}</Typography>
        <Typography>{items.length}</Typography>
      </AccordionSummary>
      <AccordionDetails
        sx={{
          backgroundColor: ({ palette }) =>
            palette.grey[palette.mode === "light" ? 100 : 900],
          marginTop: 1,
          "& *": { textTransform: "none" },
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap" }}>
          <Typography>{trans("Please select:")}</Typography>
          {items.map((item, index) => (
            <Button
              variant="outlined"
              key={index}
              sx={{ mx: 1, my: 0.5 }}
              size="small"
              onClick={() => select(item.id)}
            >
              {children(item)}
            </Button>
          ))}
        </Box>
      </AccordionDetails>
    </Accordion>
  );
}

function GroupsRender({
  trans,
  select,
  groups,
}: BaseRenderProps & { groups: TreeGroup["groups"] }) {
  return (
    <AccordionRender
      trans={trans}
      select={select}
      label={trans("Select Groups")}
      items={groups ?? []}
    >
      {({ label }) => <Typography>{label}</Typography>}
    </AccordionRender>
  );
}

function TreesRender({
  trans,
  select,
  trees,
}: BaseRenderProps & { trees: TreeGroup["trees"] }) {
  return (
    <AccordionRender
      trans={trans}
      select={select}
      label={trans("Select Trees")}
      items={trees ?? []}
    >
      {({ name }) => <Typography>{name}</Typography>}
    </AccordionRender>
  );
}
