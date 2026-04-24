import { z } from 'zod'
import { createServerFn } from '@tanstack/react-start'
import {
  deleteRepositoryVariable,
  listManageableRepositories,
  listRepositoryVariables,
  upsertRepositoryVariable,
} from './gh-repository-variables.server'

const repositoryInputSchema = z.object({
  repository: z.string().trim().min(1),
})

const upsertRepositoryVariableSchema = z.object({
  name: z.string().trim().min(1),
  repository: z.string().trim().min(1),
  value: z.string(),
})

const deleteRepositoryVariableSchema = z.object({
  name: z.string().trim().min(1),
  repository: z.string().trim().min(1),
})

export const getManageableRepositories = createServerFn({
  method: 'GET',
}).handler(() => listManageableRepositories())

export const getRepositoryVariables = createServerFn({
  method: 'POST',
})
  .inputValidator(repositoryInputSchema)
  .handler(({ data }) => listRepositoryVariables(data.repository))

export const saveRepositoryVariable = createServerFn({
  method: 'POST',
})
  .inputValidator(upsertRepositoryVariableSchema)
  .handler(async ({ data }) =>
    upsertRepositoryVariable(data.repository, data.name, data.value),
  )

export const removeRepositoryVariable = createServerFn({
  method: 'POST',
})
  .inputValidator(deleteRepositoryVariableSchema)
  .handler(async ({ data }) =>
    deleteRepositoryVariable(data.repository, data.name),
  )
