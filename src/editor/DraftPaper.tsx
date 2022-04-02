import { useRef, useState } from 'react'
import styled from '@emotion/styled'
import { useDragMoving } from '../components/DragMoving'

interface Props {
    children?: JSX.Element
}

const Container = styled.div`
    display: flex;
    justify-content: center;
`
const Paper = styled.div`
    pointer-events: auto;
    cursor: move;
    &>div:first-of-type {
        background-image:
            -webkit-linear-gradient(top, transparent 31px, #DDDDDD 32px),
            -webkit-linear-gradient(left, transparent 31px, #DDDDDD 32px)
            ;
        background-image:
            linear-gradient(top, transparent 31px, #DDDDDD 32px),
            linear-gradient(left, transparent 31px, #DDDDDD 32px)
            ;
        background-size: 32px 32px;
    }
`

const draftContainerClass = 'draft-draggable'

export default function DraftPaper({ children }: Props) {
    const ref = useRef<HTMLDivElement>(null)
    const isInvalidEventTarget = (event: React.MouseEvent) => event.target != ref.current   // 这里不能用 currentTarget，会捕获到子元素

    const [movingProps, { left, top }] = useDragMoving(isInvalidEventTarget)

    const [scale, setScale] = useState(1.0)
    const onWheel = (event: React.WheelEvent) => {
        if (isInvalidEventTarget(event)) return
        setScale(scale - event.deltaY / 1000)
    }
    return (
        <Container>
            <Paper
                ref={ref}
                style={{ transform: `translate(${left}px, ${top}px) scale(${scale})` }}
                {...movingProps}
                onWheel={onWheel}
            >
                {children}
            </Paper>
        </Container>
    )
}
