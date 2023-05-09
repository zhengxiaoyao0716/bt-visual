import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Box from "@mui/material/Box";
import Breadcrumbs from "@mui/material/Breadcrumbs";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import { ServiceManager, TreeGroup } from "../service/DebugService";
import { TransFunction, useTrans } from "../storage/Locale";

interface Props {
  treeGroups: TreeGroup[];
  select(groupId: string, treeId: string): void;
}

export default function TreeSelector({ treeGroups, select }: Props) {
  const trans = useTrans();
  const [parents, setParants] = useState<TreeGroup[]>([
    {
      id: "",
      label: trans("ALL"),
    },
  ]);
  const [group, setGroup] = useState(null as TreeGroup | null);
  const groups = group == null ? treeGroups : group.groups || [];

  const selectParent = (index: number) => {
    if (index <= 0) {
      setParants([parents[0]]);
      setGroup(null);
      return;
    }
    const group = parents[index];
    setParants(parents.slice(0, index + 1));
    setGroup(group);
  };
  const selectGroup = (groupId: string) => {
    const group = groups.find((g) => g.id === groupId);
    if (group == null) return;
    setGroup(group);
    setParants([...parents, group]);
  };
  const selectTree = group && ((treeId: string) => select(group.id, treeId));

  return (
    <>
      <Breadcrumbs aria-label="breadcrumb" sx={{ m: 2 }}>
        {parents.map((group, index) => (
          <Button
            variant="text"
            key={index}
            color={index < parents.length - 1 ? "primary" : "inherit"}
            onClick={() => selectParent(index)}
          >
            {group.label}
          </Button>
        ))}
      </Breadcrumbs>
      <Container>
        <GroupsRender trans={trans} select={selectGroup} groups={groups} />
        {group && selectTree && (
          <TreesRender trans={trans} select={selectTree} trees={group?.trees} />
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
}: BaseRenderProps & { groups: TreeGroup[] }) {
  return (
    <AccordionRender
      trans={trans}
      select={select}
      label={trans("Select Groups")}
      items={groups}
    >
      {({ label }) => <Typography>{label}</Typography>}
    </AccordionRender>
  );
}

function TreesRender({
  trans,
  select,
  trees = [],
}: BaseRenderProps & { trees: TreeGroup["trees"] }) {
  return (
    <AccordionRender
      trans={trans}
      select={select}
      label={trans("Select Trees")}
      items={trees}
    >
      {({ name }) => <Typography>{name}</Typography>}
    </AccordionRender>
  );
}
