import { z } from 'zod'
import { createServerFn } from '@tanstack/react-start'
import {
  createRepositoryEnvironment,
  deleteEnvironmentSecret,
  deleteEnvironmentVariable,
  deleteRepositoryEnvironment,
  deleteRepositorySecret,
  listEnvironmentSecrets,
  listEnvironmentVariables,
  listRepositoryEnvironments,
  listRepositorySecrets,
  upsertEnvironmentSecret,
  upsertEnvironmentVariable,
  upsertRepositorySecret,
} from './gh-actions-settings.server'

const repositoryInputSchema = z.object({
  repository: z.string().trim().min(1),
})

const repositoryEnvironmentInputSchema = z.object({
  environmentName: z.string().trim().min(1),
  repository: z.string().trim().min(1),
})

const upsertRepositorySecretSchema = z.object({
  name: z.string().trim().min(1),
  repository: z.string().trim().min(1),
  value: z.string(),
})

const upsertEnvironmentVariableSchema = z.object({
  environmentName: z.string().trim().min(1),
  name: z.string().trim().min(1),
  repository: z.string().trim().min(1),
  value: z.string(),
})

const upsertEnvironmentSecretSchema = z.object({
  environmentName: z.string().trim().min(1),
  name: z.string().trim().min(1),
  repository: z.string().trim().min(1),
  value: z.string(),
})

const deleteRepositorySecretSchema = z.object({
  name: z.string().trim().min(1),
  repository: z.string().trim().min(1),
})

const deleteEnvironmentVariableSchema = z.object({
  environmentName: z.string().trim().min(1),
  name: z.string().trim().min(1),
  repository: z.string().trim().min(1),
})

const deleteEnvironmentSecretSchema = z.object({
  environmentName: z.string().trim().min(1),
  name: z.string().trim().min(1),
  repository: z.string().trim().min(1),
})

export const getRepositorySecrets = createServerFn({
  method: 'POST',
})
  .inputValidator(repositoryInputSchema)
  .handler(async ({ data }) => listRepositorySecrets(data.repository))

export const saveRepositorySecret = createServerFn({
  method: 'POST',
})
  .inputValidator(upsertRepositorySecretSchema)
  .handler(async ({ data }) =>
    upsertRepositorySecret(data.repository, data.name, data.value),
  )

export const removeRepositorySecret = createServerFn({
  method: 'POST',
})
  .inputValidator(deleteRepositorySecretSchema)
  .handler(async ({ data }) =>
    deleteRepositorySecret(data.repository, data.name),
  )

export const getRepositoryEnvironments = createServerFn({
  method: 'POST',
})
  .inputValidator(repositoryInputSchema)
  .handler(async ({ data }) => listRepositoryEnvironments(data.repository))

export const addRepositoryEnvironment = createServerFn({
  method: 'POST',
})
  .inputValidator(repositoryEnvironmentInputSchema)
  .handler(async ({ data }) =>
    createRepositoryEnvironment(data.repository, data.environmentName),
  )

export const removeRepositoryEnvironment = createServerFn({
  method: 'POST',
})
  .inputValidator(repositoryEnvironmentInputSchema)
  .handler(async ({ data }) =>
    deleteRepositoryEnvironment(data.repository, data.environmentName),
  )

export const getEnvironmentVariables = createServerFn({
  method: 'POST',
})
  .inputValidator(repositoryEnvironmentInputSchema)
  .handler(async ({ data }) =>
    listEnvironmentVariables(data.repository, data.environmentName),
  )

export const saveEnvironmentVariable = createServerFn({
  method: 'POST',
})
  .inputValidator(upsertEnvironmentVariableSchema)
  .handler(async ({ data }) =>
    upsertEnvironmentVariable(
      data.repository,
      data.environmentName,
      data.name,
      data.value,
    ),
  )

export const removeEnvironmentVariable = createServerFn({
  method: 'POST',
})
  .inputValidator(deleteEnvironmentVariableSchema)
  .handler(async ({ data }) =>
    deleteEnvironmentVariable(data.repository, data.environmentName, data.name),
  )

export const getEnvironmentSecrets = createServerFn({
  method: 'POST',
})
  .inputValidator(repositoryEnvironmentInputSchema)
  .handler(async ({ data }) =>
    listEnvironmentSecrets(data.repository, data.environmentName),
  )

export const saveEnvironmentSecret = createServerFn({
  method: 'POST',
})
  .inputValidator(upsertEnvironmentSecretSchema)
  .handler(async ({ data }) =>
    upsertEnvironmentSecret(
      data.repository,
      data.environmentName,
      data.name,
      data.value,
    ),
  )

export const removeEnvironmentSecret = createServerFn({
  method: 'POST',
})
  .inputValidator(deleteEnvironmentSecretSchema)
  .handler(async ({ data }) =>
    deleteEnvironmentSecret(data.repository, data.environmentName, data.name),
  )
