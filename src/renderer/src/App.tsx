import React, { useState } from 'react'
import { useSwipeable } from 'react-swipeable'
import { Tabs, TabsList, TabsTrigger } from './components/ui/tabs'
import SystemScreen from './screens/SystemScreen'
import SettingsScreen from './screens/SettingsScreen'
import AssistantScreen from './screens/AssistantScreen'
import WeatherScreen from './screens/WeatherScreen'

type Tab = 'system' | 'settings' | 'assistant' | 'weather'

const tabItems: Array<{ id: Tab; label: string }> = [
  { id: 'system', label: 'System' },
  { id: 'settings', label: 'Settings' },
  { id: 'assistant', label: 'Assistant' },
  { id: 'weather', label: 'Weather' }
]

export default function App(): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<Tab>('system')
  const activeIndex = tabItems.findIndex((tab) => tab.id === activeTab)
  const safeIndex = activeIndex < 0 ? 0 : activeIndex

  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => {
      const nextTab = tabItems[safeIndex + 1]?.id
      if (nextTab) {
        setActiveTab(nextTab)
      }
    },
    onSwipedRight: () => {
      const prevTab = tabItems[safeIndex - 1]?.id
      if (prevTab) {
        setActiveTab(prevTab)
      }
    },
    trackMouse: true,
    preventScrollOnSwipe: true
  })

  return (
    <div className="ha-shell">
      <div className="pointer-events-none absolute inset-0">
        <div className="ha-aurora ha-aurora-blue animate-float-slow" />
        <div className="ha-aurora ha-aurora-green animate-float-delay" />
        <div className="ha-aurora ha-aurora-sun animate-float" />
      </div>
      <div className="relative z-10 flex h-full flex-col">
        <div className="mx-auto flex h-full w-full max-w-6xl flex-col px-6 pb-6">
          <header className="pb-6 pt-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-2">
                <p className="ha-label">Home Assistant</p>
                <h1 className="text-3xl font-semibold text-slate-900">
                  Ambient Control Hub
                </h1>
                <p className="ha-subtitle">
                  Swipe between spaces or tap the tabs to move fast.
                </p>
              </div>
              <div className="ha-pill">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Ready to listen
              </div>
            </div>
          </header>
          <Tabs
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as Tab)}
            className="flex flex-1 flex-col overflow-hidden"
          >
            <TabsList className="relative grid h-12 w-full grid-cols-4 items-center rounded-full bg-white/60 p-1 shadow-[0_12px_32px_-20px_rgba(15,23,42,0.45)] backdrop-blur-lg">
              <span
                aria-hidden="true"
                className="absolute inset-y-1 left-1 rounded-full bg-white shadow-[0_10px_24px_-18px_rgba(15,23,42,0.45)] transition-transform duration-500"
                style={{
                  width: `calc((100% - 0.5rem) / ${tabItems.length})`,
                  transform: `translateX(${safeIndex * 100}%)`
                }}
              />
              {tabItems.map((tab) => (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="relative z-10 rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 transition-colors data-[state=active]:bg-transparent data-[state=active]:text-slate-900 data-[state=active]:shadow-none"
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
            <div {...swipeHandlers} className="relative mt-6 flex-1 overflow-hidden">
              <div
                className="flex h-full w-full transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
                style={{ transform: `translateX(-${safeIndex * 100}%)` }}
              >
                <div className="h-full w-full shrink-0">
                  <SystemScreen />
                </div>
                <div className="h-full w-full shrink-0">
                  <SettingsScreen />
                </div>
                <div className="h-full w-full shrink-0">
                  <AssistantScreen />
                </div>
                <div className="h-full w-full shrink-0">
                  <WeatherScreen />
                </div>
              </div>
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
