import styled from '@emotion/styled'
import { ReactNode, useEffect, useRef } from 'react'

import { createDragListeners, DragState } from '../components/DragMoving'

const draggingClass = 'dragging'
const grabShadowId = 'grabShadow'

const Container = styled.div`
    &:not(.${draggingClass}) {
        pointer-events: none;
    }
    &>#${grabShadowId} {
        display: none;
    }
    
    &.${draggingClass} {
        pointer-events: auto;
        cursor: grabbing;
    }
    &.${draggingClass} * {
        pointer-events: none
    }
    &.${draggingClass}>#${grabShadowId} {
        display: block;
        opacity: 0.6;
        transform: scale(2) translate(-25%, -25%);
    }
`

export const grabableClass = 'grabable'

interface Props {
    children: ReactNode
}
export default function GrabPaper({ children }: Props) {
    const ref = useRef<HTMLDivElement>(null)
    useEffect(() => {
        const container = ref.current
        if (container == null) return

        const state: DragState = { left: 0, top: 0, dragging: false }
        let lastTarget: HTMLElement | null = null;

        const handleStateChange = ({ left, top, dragging }: DragState) => {
            state.left = left
            state.top = top
            state.dragging = dragging
            if (container.classList.contains(draggingClass)) {
                dragging || container.classList.remove(draggingClass)
            } else {
                dragging && container.classList.add(draggingClass)
            }

            const target = lastTarget as HTMLElement
            const targetRect = target.getBoundingClientRect()
            const containerRect = container.getBoundingClientRect()
            const clientLeft = targetRect.left - containerRect.left + targetRect.width / 2
            const clientTop = targetRect.top - containerRect.top + targetRect.height / 2

            const inverseScale = container.clientWidth / container.getBoundingClientRect().width

            const grabShadow = document.querySelector(`#${grabShadowId}`) as HTMLElement
            grabShadow.style.left = `${(clientLeft + left) * inverseScale}px`
            grabShadow.style.top = `${(clientTop + top) * inverseScale}px`

            if (dragging) return
            if (left === 0 && top === 0) return
            target.dispatchEvent(new GrabEvent(left, top))
            handleStateChange({ left: 0, top: 0, dragging: false })
        }

        const beforeHanlder = (event: MouseEvent) => {
            const target = event.target
            if (!(target instanceof HTMLElement)) return true
            if (!target.classList.contains(grabableClass)) return true
            event.preventDefault()
            event.stopPropagation()
            if (target != container) {
                const exist = document.querySelector(`#${grabShadowId}`)
                if (exist != null) {
                    if (target == lastTarget) return false
                    else exist.parentNode?.removeChild(exist)
                }
                const grabShadow = target.cloneNode() as HTMLElement
                grabShadow.id = grabShadowId
                grabShadow.innerHTML = target.innerHTML
                grabShadow.style.position = 'absolute'
                container.appendChild(grabShadow)
                lastTarget = target
            }
            return false
        }
        const listeners = createDragListeners(state, handleStateChange, beforeHanlder)
        container.addEventListener('mousedown', listeners.onMouseDown)
        container.addEventListener('mousemove', listeners.onMouseMove)
        container.addEventListener('mouseup', listeners.onMouseUp)
        container.addEventListener('mouseleave', listeners.onMouseLeave)
        return () => {
            container.removeEventListener('mousedown', listeners.onMouseDown)
            container.removeEventListener('mousemove', listeners.onMouseMove)
            container.removeEventListener('mouseup', listeners.onMouseUp)
            container.removeEventListener('mouseleave', listeners.onMouseLeave)
        }
    }, [ref.current])
    return (
        <Container ref={ref} className={grabableClass}>
            {children}
        </Container>
    )
}

export class GrabEvent extends Event {
    static KEY = `GrabPaper.name/grab`
    readonly left: number
    readonly top: number
    constructor(left: number, top: number) {
        super(GrabEvent.KEY)
        this.left = left
        this.top = top
    }
}
