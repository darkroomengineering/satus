import tunnel from 'tunnel-rat'
import { create } from 'zustand'

type WebGLTunnelInstance = ReturnType<typeof tunnel>

let webGLTunnelSingleton: WebGLTunnelInstance | null = null
let domTunnelSingleton: WebGLTunnelInstance | null = null

function getWebGLTunnel(): WebGLTunnelInstance {
  if (!webGLTunnelSingleton) {
    webGLTunnelSingleton = tunnel()
  }
  return webGLTunnelSingleton
}

function getDOMTunnel(): WebGLTunnelInstance {
  if (!domTunnelSingleton) {
    domTunnelSingleton = tunnel()
  }
  return domTunnelSingleton
}

type WebGLStore = {
  getWebGLTunnel: () => WebGLTunnelInstance
  getDOMTunnel: () => WebGLTunnelInstance
}

export const useWebGLStore = create<WebGLStore>(() => ({
  getWebGLTunnel,
  getDOMTunnel,
}))
