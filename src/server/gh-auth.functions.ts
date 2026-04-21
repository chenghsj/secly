import { z } from 'zod'
import { createServerFn } from '@tanstack/react-start'
import {
  cancelGhAuthLogin,
  getGhAuthStatus,
  logoutAllGhAuthAccounts,
  logoutGhAuthAccount,
  logoutCurrentGhAuthAccount,
  startGhAuthLogin,
  switchGhAuthAccount,
  waitForGhAuthLoginCompletion,
} from './gh-auth.server'

const startLoginSchema = z.object({
  addAccount: z.boolean().optional().default(false),
  presentation: z.enum(['handoff', 'manual-web']).optional().default('handoff'),
})

const switchAccountSchema = z.object({
  login: z.string().trim().min(1),
})

export const getLocalGhAuthStatus = createServerFn({ method: 'GET' }).handler(
  async () => getGhAuthStatus(),
)

export const refreshLocalGhAuthStatus = createServerFn({
  method: 'POST',
}).handler(async () => getGhAuthStatus())

export const startLocalGhAuthLogin = createServerFn({
  method: 'POST',
})
  .inputValidator(startLoginSchema)
  .handler(async ({ data }) =>
    startGhAuthLogin({
      addAccount: data.addAccount,
      presentation: data.presentation,
    }),
  )

export const cancelLocalGhAuthLogin = createServerFn({
  method: 'POST',
}).handler(async () => cancelGhAuthLogin())

export const waitForLocalGhAuthLoginCompletion = createServerFn({
  method: 'POST',
})
  .inputValidator(
    z
      .object({
        timeoutMs: z.number().int().min(500).max(55000).optional(),
      })
      .optional(),
  )
  .handler(async ({ data }) =>
    waitForGhAuthLoginCompletion({ timeoutMs: data?.timeoutMs }),
  )

export const switchLocalGhAuthAccount = createServerFn({
  method: 'POST',
})
  .inputValidator(switchAccountSchema)
  .handler(async ({ data }) => switchGhAuthAccount(data.login))

export const logoutLocalGhAccount = createServerFn({
  method: 'POST',
})
  .inputValidator(switchAccountSchema)
  .handler(async ({ data }) => logoutGhAuthAccount(data.login))

export const logoutLocalGhCurrentAccount = createServerFn({
  method: 'POST',
}).handler(async () => logoutCurrentGhAuthAccount())

export const logoutLocalGhAllAccounts = createServerFn({
  method: 'POST',
}).handler(async () => logoutAllGhAuthAccounts())
