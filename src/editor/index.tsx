import Box from '@mui/material/Box'

import example from '../behavior-tree/example'
import { useTabs } from '../components/Tabs'
import DraftPaper from './DraftPaper'
import GrabPaper from './GrabPaper'
import NodeRender from './NodeRender'

export default function Editor() {
    const forest = example      // TODO: load from storage

    const { tab, tabs } = useTabs(forest.trees.map(({ name }) => name))
    const tree = forest.trees[tab]
    return (
        <Box
            sx={{
                flexGrow: 1,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
            }}
        >
            <Box sx={{
                flexGrow: 1,
                m: 2,
                overflow: 'hidden',
            }}>
                <DraftPaper key={tree.name}>
                    <GrabPaper>
                        <NodeRender node={tree.root} />
                    </GrabPaper>
                </DraftPaper>
            </Box>
            <Box sx={{ borderTop: 1, borderColor: 'divider' }}>
                {tabs}
            </Box>
        </Box>
    )
}
Editor.route = '/editor'
