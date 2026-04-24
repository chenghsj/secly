export const APP_NAME = 'Secly'
export const APP_MONOGRAM = 'S'
export const APP_SLUG = 'secly'
export const CLI_NAME = 'secly'
export const APP_DESCRIPTION =
  'A standalone TanStack Start + Vite workspace for managing GitHub repository variables with a paired local CLI, local gh auth, and a clean install lifecycle.'

export const THEME_STORAGE_KEY = `${APP_SLUG}:theme`
export const LOCALE_STORAGE_KEY = `${APP_SLUG}:locale`

export const APP_DATA_ROOT_DISPLAY = `~/Library/Application Support/${APP_SLUG}`
export const CLI_LINK_DISPLAY = `~/.local/bin/${CLI_NAME}`
export const CLI_LOGIN_COMMAND = `${CLI_NAME} login`

export type CommandSurfaceId =
  | 'ui'
  | 'install'
  | 'uninstall'
  | 'status'
  | 'paths'
  | 'login'
  | 'reposList'
  | 'vars'
  | 'envs'
  | 'envVars'

export type CommandAvailability = 'available' | 'planned'

export const commandSurface: Array<{
  id: CommandSurfaceId
  command: string
  availability: CommandAvailability
}> = [
  {
    id: 'ui',
    command: `${CLI_NAME} ui`,
    availability: 'available',
  },
  {
    id: 'install',
    command: `${CLI_NAME} install`,
    availability: 'available',
  },
  {
    id: 'uninstall',
    command: `${CLI_NAME} uninstall`,
    availability: 'available',
  },
  {
    id: 'status',
    command: `${CLI_NAME} status`,
    availability: 'available',
  },
  {
    id: 'paths',
    command: `${CLI_NAME} paths`,
    availability: 'available',
  },
  {
    id: 'login',
    command: CLI_LOGIN_COMMAND,
    availability: 'available',
  },
  {
    id: 'reposList',
    command: `${CLI_NAME} repos list`,
    availability: 'available',
  },
  {
    id: 'vars',
    command: `${CLI_NAME} vars set owner/repo NAME VALUE`,
    availability: 'available',
  },
  {
    id: 'envs',
    command: `${CLI_NAME} envs create owner/repo ENV_NAME`,
    availability: 'planned',
  },
  {
    id: 'envVars',
    command: `${CLI_NAME} env-vars set owner/repo ENV_NAME NAME VALUE`,
    availability: 'planned',
  },
]
