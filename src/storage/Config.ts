import { LanguageName } from './Locale'
import { createStorage } from './Storage'

const defaultConfig = {
    language: '简体中文' as LanguageName,
    showTransWarning: false,
}

export default createStorage('Config', '/config.yaml', Promise.resolve(defaultConfig))
