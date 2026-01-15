import React, { useState } from 'react'
import SystemScreen from './screens/SystemScreen'
import SettingsScreen from './screens/SettingsScreen'
import AssistantScreen from './screens/AssistantScreen'
import WeatherScreen from './screens/WeatherScreen'

type Tab = 'system' | 'settings' | 'assistant' | 'weather'

export default function App(): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<Tab>('system')

  const renderScreen = (): React.JSX.Element => {
    switch (activeTab) {
      case 'system':
        return <SystemScreen />
      case 'settings':
        return <SettingsScreen />
      case 'assistant':
        return <AssistantScreen />
      case 'weather':
        return <WeatherScreen />
      default:
        return <SystemScreen />
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid #ccc',
          backgroundColor: '#f5f5f5'
        }}
      >
        <button
          onClick={() => setActiveTab('system')}
          style={{
            padding: '10px 20px',
            border: 'none',
            backgroundColor: activeTab === 'system' ? '#e0e0e0' : 'transparent',
            cursor: 'pointer'
          }}
        >
          System
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          style={{
            padding: '10px 20px',
            border: 'none',
            backgroundColor: activeTab === 'settings' ? '#e0e0e0' : 'transparent',
            cursor: 'pointer'
          }}
        >
          Settings
        </button>
        <button
          onClick={() => setActiveTab('assistant')}
          style={{
            padding: '10px 20px',
            border: 'none',
            backgroundColor: activeTab === 'assistant' ? '#e0e0e0' : 'transparent',
            cursor: 'pointer'
          }}
        >
          Assistant
        </button>
        <button
          onClick={() => setActiveTab('weather')}
          style={{
            padding: '10px 20px',
            border: 'none',
            backgroundColor: activeTab === 'weather' ? '#e0e0e0' : 'transparent',
            cursor: 'pointer'
          }}
        >
          Weather
        </button>
      </div>
      <div style={{ flex: 1, overflow: 'auto' }}>{renderScreen()}</div>
    </div>
  )
}
