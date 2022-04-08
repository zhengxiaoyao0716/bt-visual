import { Tab, Tabs } from "@mui/material";
import { useState } from "react";
import { useRefresh } from "./Refresh";

function LabelTab({
  labels,
  index,
  setTab,
  refreshHooks,
}: {
  labels: string[];
  index: number;
  setTab(index: number): void;
  refreshHooks: { [index: number]: () => void };
}) {
  const refresh = useRefresh();
  refreshHooks[index] = refresh;
  return (
    <Tab
      label={labels[index]}
      value={index}
      onClick={setTab.bind(null, index)}
    />
  );
}

export function useTabs(labels: string[]) {
  const [tab, setTab] = useState(0);
  const refreshHooks = {} as { [index: number]: () => void };

  const tabs = (
    <Tabs
      value={tab}
      variant="scrollable"
      scrollButtons="auto"
      aria-label="tree-tabs"
    >
      {labels.map((_label, index) => (
        <LabelTab
          key={index}
          labels={labels}
          index={index}
          setTab={setTab}
          refreshHooks={refreshHooks}
        />
      ))}
    </Tabs>
  );
  return {
    tab,
    tabs,
    setTab,
    refresh(index: number) {
      refreshHooks[index]?.();
    },
  };
}
