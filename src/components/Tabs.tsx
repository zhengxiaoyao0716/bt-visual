import { Tab, Tabs } from '@mui/material'
import { useState } from 'react'

export function useTabs(labels: string[]) {
    const [tab, setTab] = useState(0)
    const tabs = (
        <Tabs
            value={tab}
            onChange={(_event, value) => setTab(value)}
            variant="scrollable"
            scrollButtons="auto"
            aria-label="tree-tabs"
        >
            {labels.map((label, index) => (<Tab key={index} label={label} value={index} />))}
        </Tabs>
    )
    return { tab, tabs, setTab }
}
