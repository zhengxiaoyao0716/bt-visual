import { useTrans } from '../storage/Locale'

export default function Home() {
    const trans = useTrans()
    return (
        <span>TODO {trans('HomePage')}</span>
    )
}
Home.route = '/'
