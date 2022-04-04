import { MouseEventHandler, useEffect, useMemo, useRef, useState } from 'react'
import rough from 'roughjs'
import styled from '@emotion/styled'

import { Node, Composite, Decorator, Action } from '../behavior-tree/define'
import LineRender, { lineToParentClass, triggerRedrawLiens } from './LineRender'
import { getNodeType } from '../behavior-tree/utils'

interface Props<N extends Node> {
    node: N
    children?: JSX.Element
}

export default function NodeRender<N extends Node>(props: Props<N>) {
    return AutoRender(props)
}

const statusMapper = {
    success: { color: '#00FF00' },
    failure: { color: '#FF0000' },
    running: { color: '#0000FF' },
    '': { color: '#000000' },
}

const nodeTypeColor = {
    Composite: '#66EEEE',
    Decorator: '#AA66AA',
    Action: '#EE9966',
    Unknown: '#FFEE00',
}

interface BaseProps {
    type: string
    size: { width: number, height: number }
    status?: keyof typeof statusMapper
}

const NodeSvg = styled.svg`
    overflow: visible;
    cursor: auto;
    pointer-events: auto;
    user-select: none;
    & text {
        font-weight: bold;
        user-select: text;
    }

    transition: transform 0.1s;
    &:hover {
        transform: scale(1.2);
        transition: transform 0.3s;
    }
`
const CompositeContainer = styled.div`
    border: 1px dashed #999;
    position: relative;
    pointer-events: none;
    & & {
        margin: 0 8px;
    }
`
const CompositeCard = styled.div`
    position: relative;
    padding: 16px;
    text-align: center;
`
const CompositeNodes = styled.div`
    display: flex;
    justify-content: center;
    margin: 32px 8px;
`
const DecoratorContainer = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    position: relative;
    padding: 16px;
`
const DecoratorCard = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: -16px;
    &.fold {
        flex-direction: row;
        flex-wrap: wrap;
        max-width: 300px;
    }
    &.fold svg>text {
        user-select: none;
    }
`

const ActionCard = styled.div`
    position: relative;
    padding: 16px;
`

function NodeSvgRender({ type, size, status: statusKey, children }: BaseProps & { children: JSX.Element }) {
    const nodeType = getNodeType(type)
    const status = statusMapper[statusKey || '']
    const color = statusKey ? status.color : nodeTypeColor[nodeType]
    const ref = useRef<SVGSVGElement>(null)
    useEffect(() => {
        const svg = ref.current
        if (svg == null) return
        const options = {
            stroke: color,
            strokeLineDash: nodeType === 'Decorator' ? [16, 8] : undefined,
            strokeWidth: 2,
            fillStyle: nodeType === 'Decorator' ? 'cross-hatch' : nodeType === 'Action' ? 'dots' : 'zigzag',
            fillWeight: 2,
            roughness: 1.5,
        }
        const shape = nodeType === 'Action'
            ? rough.svg(svg).ellipse(size.width / 2, size.height / 2, size.width, size.height, options)
            : rough.svg(svg).rectangle(0, 0, size.width, size.height, options)
        svg.prepend(shape)
        return () => { svg.removeChild(shape) }
    }, [ref.current, size.width, size.height, color])
    return (
        <NodeSvg ref={ref} xmlns="http://www.w3.org/2000/svg" version="1.1"
            width={size.width}
            height={size.height}
        >
            {/* TODO */}
            {children}
        </NodeSvg>
    )
}

type SubProps<N extends Node> = Omit<Props<N> & BaseProps, 'type' | 'size'>

interface CompositeProps extends SubProps<Composite> {
    redrawLine?: (sig: number) => void
}
const anchorOffsetAllow = 32
function findMoveToNodeIndex(left: number, min: number, max: number, anchors: { [index: number]: HTMLElement }): [number, boolean] {
    for (let index = min; index < max; index++) {
        const anchorLeft = anchors[index].getBoundingClientRect().left
        const offset = left - anchorLeft
        if (offset < -anchorOffsetAllow) {
            return [index, false]
        } else if (offset <= anchorOffsetAllow) {
            return [index, true]
        }
    }
    return [max, false]
}
function isMoveToTopNear(top: number, moveToIndex: number, anchors: { [index: number]: HTMLElement }): boolean {
    const moveToAnchor = anchors[moveToIndex]
    const moveToRect = moveToAnchor.getBoundingClientRect()
    const offsetTop = top - moveToRect.top
    return -anchorOffsetAllow <= offsetTop && offsetTop <= anchorOffsetAllow
}

function useNodeFold() {
    const [fold, setFold] = useState(false)
    const handler: MouseEventHandler = event => {
        event.preventDefault()
        event.stopPropagation()
        setFold(!fold)
        triggerRedrawLiens(event.currentTarget)
    }
    return [fold, handler] as const
}

function CompositeRender({
    node: { type, nodes },
    children,
    ...baseProps
}: CompositeProps) {
    const svgSize = { width: 250, height: 100 }

    const [fold, foldHandler] = useNodeFold()

    const [refresh, setRefresh] = useState(0)
    const anchors: { [index: number]: HTMLElement } = useMemo(() => ({}), [])
    const onMoved = (index: number, left: number, top: number) => {
        if (left === 0) return
        const anchor = anchors[index]
        const anchorRect = anchor.getBoundingClientRect()
        const moveToLeft = anchorRect.left + left

        const [moveToIndex, leftNear] = left < 0
            ? findMoveToNodeIndex(moveToLeft, 0, index, anchors)
            : findMoveToNodeIndex(moveToLeft, index, nodes.length, anchors)
        if (index === moveToIndex) return

        if (leftNear) {
            if (isMoveToTopNear(anchorRect.top + top, moveToIndex, anchors)) {
                // swap
                const node = nodes[index]
                nodes[index] = nodes[moveToIndex]
                nodes[moveToIndex] = node
            } else {
                // 横坐标相近，纵坐标较远，危险操作，忽略
                console.warn('move to near, but not near enough, ignored')
                return
            }
        } else {
            // move
            const node = nodes.splice(index, 1)[0]
            const insertIndex = moveToIndex < index ? moveToIndex : moveToIndex - 1
            nodes.splice(insertIndex, 0, node)
        }
        setRefresh(1 + refresh)
        triggerRedrawLiens(anchor)
    }
    return (
        <CompositeContainer className={lineToParentClass}>
            <CompositeCard onDoubleClick={foldHandler} >
                <NodeSvgRender type={type} size={svgSize} {...baseProps} >
                    <text x={15} y={30}>{type}</text>
                </NodeSvgRender>
            </CompositeCard>
            {fold || <CompositeNodes>
                {nodes.map((node, index) => (
                    <AutoRender key={index} node={node}>
                        <LineRender
                            index={index} total={nodes.length}
                            anchors={anchors} onMoved={onMoved}
                            redrawSig={refresh}
                            {...svgSize}
                        />
                    </AutoRender>
                ))}
            </CompositeNodes>}
            {children}
        </CompositeContainer>
    )
}

function DecoratorRender({ node, children, ...baseProps }: SubProps<Decorator>) {
    const [fold, foldHandler] = useNodeFold()
    let decorators = []
    let iter = node
    while (iter) {
        decorators.push(iter)
        if (getNodeType(iter.node.type) !== 'Decorator') break
        iter = iter.node as Decorator
    }
    return (
        <DecoratorContainer>
            <DecoratorCard className={fold ? 'fold' : undefined} onDoubleClick={foldHandler}>
                {decorators.map((node, index) => (fold
                    ? <NodeSvgRender key={index} type={node.type} size={{ width: 100, height: 24 }} {...baseProps} >
                        <text x={3} y={16} fontSize={12}>{node.type}</text>
                    </NodeSvgRender>
                    : <NodeSvgRender key={index} type={node.type} size={{ width: 150, height: 60 }} {...baseProps} >
                        <text x={15} y={30}>{node.type}</text>
                    </NodeSvgRender>
                ))}
            </DecoratorCard>
            <AutoRender node={iter.node} {...baseProps} />
            {children}
        </DecoratorContainer>
    )
}

function ActionRender({ node, children, ...baseProps }: SubProps<Action>) {
    return (
        <ActionCard>
            <NodeSvgRender type={node.type} size={{ width: 120, height: 90 }} {...baseProps} >
                <text x={15} y={30}>{node.type}</text>
            </NodeSvgRender>
            {children}
        </ActionCard>
    )
}

function AutoRender<N extends Node>({ node, children }: Props<N>) {
    switch (getNodeType(node.type)) {
        case 'Composite':
            return (<CompositeRender node={node as unknown as Composite} >{children}</CompositeRender>)
        case 'Decorator':
            return (<DecoratorRender node={node as unknown as Decorator} >{children}</DecoratorRender>)
        case 'Action':
            return (<ActionRender node={node} >{children}</ActionRender>)
        default:
            return (
                <NodeSvgRender type="unknown" size={{ width: 100, height: 50 }} status="failure" >
                    <text x={15} y={30}>{node.type}</text>
                </NodeSvgRender>
            )
    }
}
