import React, { useState } from 'react'
import { useSwipeable } from 'react-swipeable'
import { Tabs, TabsList, TabsTrigger, TabsContent } from './components/ui/tabs'
import SystemScreen from './screens/SystemScreen'
import SettingsScreen from './screens/SettingsScreen'
import AssistantScreen from './screens/AssistantScreen'
import WeatherScreen from './screens/WeatherScreen'

type Tab = 'system' | 'settings' | 'assistant' | 'weather'

const tabs: Tab[] = ['system', 'settings', 'assistant', 'weather']

export default function App(): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<Tab>('system')

  const getTabIndex = (tab: Tab): number => {
    return tabs.indexOf(tab)
  }

  const getNextTab = (): Tab | null => {
    const currentIndex = getTabIndex(activeTab)
    if (currentIndex < tabs.length - 1) {
      return tabs[currentIndex + 1]
    }
    return null
  }

  const getPreviousTab = (): Tab | null => {
    const currentIndex = getTabIndex(activeTab)
    if (currentIndex > 0) {
      return tabs[currentIndex - 1]
    }
    return null
  }

  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => {
      const nextTab = getNextTab()
      if (nextTab) {
        setActiveTab(nextTab)
      }
    },
    onSwipedRight: () => {
      const prevTab = getPreviousTab()
      if (prevTab) {
        setActiveTab(prevTab)
      }
    },
    trackMouse: true,
    preventScrollOnSwipe: true
  })

  return (
    <div className="flex flex-col h-screen">
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as Tab)}>
        <TabsList className="w-full justify-start rounded-none border-b">
          <TabsTrigger value="system">System</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="assistant">Assistant</TabsTrigger>
          <TabsTrigger value="weather">Weather</TabsTrigger>
        </TabsList>
        <div {...swipeHandlers} className="flex-1 overflow-auto">
          <TabsContent value="system" className="m-0 h-full">
            <SystemScreen />
          </TabsContent>
          <TabsContent value="settings" className="m-0 h-full">
            <SettingsScreen />
          </TabsContent>
          <TabsContent value="assistant" className="m-0 h-full">
            <AssistantScreen />
          </TabsContent>
          <TabsContent value="weather" className="m-0 h-full">
            <WeatherScreen />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
