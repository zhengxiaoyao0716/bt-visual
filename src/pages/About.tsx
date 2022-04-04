import { useTrans } from '../storage/Locale'

export default function About() {
    const trans = useTrans()
    return (
        <span>TODO {trans('AboutPage')}</span>
    )
}
About.route = '/about'
