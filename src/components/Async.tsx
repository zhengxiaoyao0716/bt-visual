import { Dispatch, useEffect, useState } from 'react'

type State<V> = | V | Error | null

export function usePromise<V>(promise: PromiseLike<V>): [State<V>, Dispatch<State<V>>] {
    const [state, setState] = useState(null as State<V>)
    useEffect(() => {
        if (state != null) return
        let canceled = false
        promise.then(
            value => canceled || setState(value),
            error => canceled || setState(error instanceof Error ? error : new Error(error)),
        )
        return () => { canceled = true }
    }, [promise, state])
    return [state, setState]
}
