import { createFileRoute } from '@tanstack/react-router'
import { useAppPreferences } from '../components/app/app-settings-provider'
import { createConnectRouteScreenModel } from '#/features/connect/connect-route-screen-model'
import {
  ConnectRoutePendingScreen,
  ConnectRouteScreen,
} from '#/features/connect/connect-route-screen'
import { useConnectController } from '#/features/connect/use-connect-controller'
import { refreshLocalGhAuthStatus } from '../server/gh-auth.functions'

export const Route = createFileRoute('/connect')({
  loader: async () => ({ status: await refreshLocalGhAuthStatus() }),
  pendingComponent: ConnectRoutePending,
  wrapInSuspense: true,
  component: ConnectPage,
})

function ConnectPage() {
  const { messages } = useAppPreferences()
  const { status: initialStatus } = Route.useLoaderData()
  const connectController = useConnectController({
    initialStatus,
    messages: messages.connect,
  })
  const screenModel = createConnectRouteScreenModel({
    connectMessages: messages.connect,
    controller: connectController,
  })

  return <ConnectRouteScreen model={screenModel} />
}

function ConnectRoutePending() {
  return <ConnectRoutePendingScreen />
}
