```
  _    _                      _    _           _         _   
 | |  | |                    | |  | |         | |       | |  
 | |__| | ___  _ __ ___   ___| |__| | ___  ___| |_ ___  | |_ 
 |  __  |/ _ \| '_ ` _ \ / _ \  __  |/ _ \/ __| __/ _ \ | __|
 | |  | | (_) | | | | | |  __/ |  | |  __/\__ \ ||  __/ | |_ 
 |_|  |_|\___/|_| |_| |_|\___|_|  |_|\___||___/\__\___|  \__|
                                                              
         Asistente de Hogar con Inteligencia Artificial
```

# MyHome - Asistente de Hogar con IA

MyHome es una aplicación de escritorio multiplataforma que funciona como asistente de hogar inteligente, utilizando inteligencia artificial para interacciones de voz en tiempo real. Construida con Electron, React y TypeScript, ofrece una experiencia de usuario fluida y moderna para controlar y gestionar tu hogar mediante comandos de voz.

## 🎯 Descripción del Proyecto

MyHome es un asistente de hogar con IA que permite interactuar mediante voz usando la API Realtime de OpenAI. La aplicación utiliza WebRTC para streaming de audio bidireccional, permitiendo conversaciones naturales y fluidas con el asistente.

### Características Principales

- **Asistente de Voz en Tiempo Real**: Integración completa con OpenAI Realtime API usando WebRTC para interacciones de voz fluidas
- **Interfaz Multi-pantalla**: 
  - **System Screen**: Información y estado del sistema
  - **Settings Screen**: Configuración de la aplicación y preferencias
  - **Assistant Screen**: Interfaz principal del asistente de voz con controles de conexión y transcripción
- **Gestión Segura de Secretos**: Manejo seguro de API keys y credenciales mediante IPC
- **Arquitectura IPC Estructurada**: Comunicación organizada entre procesos (main/renderer) con canales dedicados
- **WebRTC Integration**: Streaming de audio bidireccional de baja latencia
- **Transcripción en Tiempo Real**: Captura y transcripción simultánea de voz del usuario y respuestas del asistente
- **Sincronización de Mensajes**: Gestión inteligente del ciclo de conversación con sincronización entre modelos de speech y transcripción

## 🛠️ Stack Tecnológico

- **Electron**: Framework para aplicaciones de escritorio multiplataforma
- **React**: Biblioteca para interfaces de usuario
- **TypeScript**: Tipado estático para mayor robustez
- **OpenAI Realtime API**: API para interacciones de voz en tiempo real
- **WebRTC**: Protocolo para streaming de audio bidireccional
- **Vite**: Build tool y bundler rápido

## 📋 Requisitos Previos

- Node.js (versión 18 o superior)
- npm o yarn
- Clave API de OpenAI (para funcionalidad de asistente de voz)

## 🚀 Instalación

### 1. Clonar el repositorio

```bash
git clone <repository-url>
cd myhome
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar API Key de OpenAI

La aplicación requiere una clave API de OpenAI para funcionar. Puedes configurarla desde la pantalla de Settings una vez que la aplicación esté en ejecución, o mediante el sistema de gestión de secretos.

## 💻 Desarrollo

### Ejecutar en modo desarrollo

```bash
npm run dev
```

### Verificar tipos

```bash
npm run typecheck
```

### Linting y formato

```bash
npm run lint
npm run format
```

## 📦 Construcción

### Windows

```bash
npm run build:win
```

### macOS

```bash
npm run build:mac
```

### Linux

```bash
npm run build:linux
```

## 🏗️ Estructura del Proyecto

```
myhome/
├── src/
│   ├── main/              # Proceso principal de Electron
│   │   ├── index.ts       # Punto de entrada
│   │   └── ipc/           # Handlers IPC
│   │       ├── realtime.ts
│   │       ├── secrets.ts
│   │       ├── settings.ts
│   │       └── system.ts
│   ├── preload/           # Scripts preload (bridge IPC)
│   │   └── index.ts
│   ├── renderer/          # Aplicación React
│   │   └── src/
│   │       ├── screens/   # Pantallas principales
│   │       │   ├── AssistantScreen.tsx
│   │       │   ├── SettingsScreen.tsx
│   │       │   └── SystemScreen.tsx
│   │       ├── hooks/     # React hooks
│   │       │   └── useRealtimeAgent.ts
│   │       ├── realtime/  # Lógica WebRTC y Realtime
│   │       │   ├── events.ts
│   │       │   ├── session.ts
│   │       │   └── webrtc.ts
│   │       └── lib/       # Utilidades y configuración
│   │           └── realtimeConfig.ts
│   └── shared/            # Código compartido
│       ├── ipc/           # Tipos y canales IPC
│       └── types/         # Tipos TypeScript compartidos
├── package.json
├── electron.vite.config.ts
└── tsconfig.json
```

## 🔌 Arquitectura IPC

La aplicación utiliza canales IPC organizados por dominio:

- **system**: Operaciones del sistema (ping, información)
- **settings**: Configuración de la aplicación
- **secrets**: Gestión segura de API keys y credenciales
- **realtime**: Gestión de sesiones de Realtime API

## 🗺️ Roadmap

### Próximas Funcionalidades

#### Text-to-Speech (TTS)
- Implementación de síntesis de voz para respuestas del asistente
- Integración con servicios TTS para audio de salida
- Personalización de voces y parámetros de audio

#### Mejoras en Arquitectura Realtime
- Limpieza y optimización de la arquitectura de tiempo real
- Mejor sincronización entre modelos de speech y transcripción
- Gestión mejorada del ciclo de mensajes
- Refactorización del dominio IPC de TTS

#### Integración con Dispositivos del Hogar
- Control de dispositivos IoT (luces, termostatos, etc.)
- Integración con protocolos estándar (Zigbee, Z-Wave, MQTT)
- Gestión de escenas y automatizaciones

#### Comandos de Sistema
- Ejecución de comandos del sistema operativo
- Control de aplicaciones y procesos
- Gestión de archivos y directorios

#### Historial de Conversaciones
- Persistencia de conversaciones en base de datos local
- Búsqueda y filtrado de conversaciones anteriores
- Exportación de historial

#### Personalización Avanzada
- Selección de voces y ajustes de velocidad
- Personalización de instrucciones del asistente
- Configuración de comportamiento y personalidad

#### Extensibilidad
- Sistema modular de plugins y extensiones
- API para desarrolladores de terceros
- Marketplace de funcionalidades

#### Internacionalización
- Soporte para múltiples idiomas
- Detección automática de idioma
- Traducción de interfaz y respuestas

#### Mejoras de UI/UX
- Interfaz más moderna y responsive
- Temas personalizables (claro/oscuro)
- Animaciones y transiciones suaves
- Mejora de accesibilidad

## 🛠️ Configuración Recomendada del IDE

- [VSCode](https://code.visualstudio.com/)
- [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)
- [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)

## 📝 Notas de Desarrollo

### Modelos Utilizados

- **Speech Model**: `gpt-4o-mini-realtime-preview` - Modelo principal para interacciones de voz
- **Transcription Model**: `gpt-4o-mini-transcribe` - Modelo para transcripción de audio de entrada

### Sincronización de Mensajes

La aplicación implementa un sistema de sincronización para manejar las respuestas de los modelos de speech y transcripción, que operan como servicios separados sin identificadores de sesión compartidos. Esto asegura el orden correcto de los mensajes y evita condiciones de carrera.

## 📄 Licencia

[Especificar licencia]

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Por favor, abre un issue o pull request para discutir cambios mayores.

---

**Desarrollado con ❤️ usando Electron, React y TypeScript**
