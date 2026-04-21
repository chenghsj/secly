export const APP_NAME = 'GH VarDeck'
export const APP_SLUG = 'gh-vardeck'
export const CLI_NAME = 'ghdeck'
export const APP_DESCRIPTION =
  'A standalone TanStack Start + Vite workspace for managing GitHub repository variables with a paired local CLI, local gh auth, and a clean install lifecycle.'

export const APP_DATA_ROOT_DISPLAY = '~/Library/Application Support/gh-vardeck'
export const CLI_LINK_DISPLAY = '~/.local/bin/ghdeck'

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
    command: 'ghdeck ui',
    availability: 'available',
  },
  {
    id: 'install',
    command: 'ghdeck install',
    availability: 'available',
  },
  {
    id: 'uninstall',
    command: 'ghdeck uninstall',
    availability: 'available',
  },
  {
    id: 'status',
    command: 'ghdeck status',
    availability: 'available',
  },
  {
    id: 'paths',
    command: 'ghdeck paths',
    availability: 'available',
  },
  {
    id: 'login',
    command: 'ghdeck login',
    availability: 'available',
  },
  {
    id: 'reposList',
    command: 'ghdeck repos list',
    availability: 'available',
  },
  {
    id: 'vars',
    command: 'ghdeck vars set owner/repo NAME VALUE',
    availability: 'available',
  },
  {
    id: 'envs',
    command: 'ghdeck envs create owner/repo ENV_NAME',
    availability: 'planned',
  },
  {
    id: 'envVars',
    command: 'ghdeck env-vars set owner/repo ENV_NAME NAME VALUE',
    availability: 'planned',
  },
]
