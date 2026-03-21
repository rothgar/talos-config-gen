import { TalosConfig } from '../types'
import { TalosVersion } from '../versions'

export type ValidationSeverity = 'error' | 'warning'

export interface ValidationError {
  field: string
  message: string
  severity: ValidationSeverity
}

// ---------------------------------------------------------------------------
// Format validators
// ---------------------------------------------------------------------------
const RE_IPV4 = /^(\d{1,3}\.){3}\d{1,3}$/
const RE_HOSTNAME =
  /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/
const RE_IMAGE =
  /^([a-zA-Z0-9][a-zA-Z0-9._-]*(\.[a-zA-Z0-9._-]+)*(:\d+)?\/)?[a-z0-9][a-z0-9._/-]*(:[a-zA-Z0-9._-]+|@sha256:[a-f0-9]{64})?$/

function isValidIPv4(s: string): boolean {
  if (!RE_IPV4.test(s)) return false
  return s.split('.').every((octet) => {
    const n = Number(octet)
    return n >= 0 && n <= 255
  })
}

function isValidIPv6(s: string): boolean {
  try {
    new URL(`http://[${s}]/`)
    return true
  } catch {
    return false
  }
}

export function isValidIP(s: string): boolean {
  return isValidIPv4(s) || isValidIPv6(s)
}

export function isValidCIDR(s: string): boolean {
  const slash = s.lastIndexOf('/')
  if (slash === -1) return false
  const prefix = Number(s.slice(slash + 1))
  if (isNaN(prefix) || prefix < 0 || prefix > 128) return false
  const ip = s.slice(0, slash)
  return isValidIPv4(ip) ? prefix <= 32 : isValidIPv6(ip)
}

export function isValidHostname(s: string): boolean {
  return RE_HOSTNAME.test(s) && s.length <= 253
}

export function isValidImage(s: string): boolean {
  return RE_IMAGE.test(s)
}

export function isValidEndpoint(s: string): boolean {
  try {
    const u = new URL(s)
    return u.protocol === 'https:' && u.hostname.length > 0
  } catch {
    return false
  }
}

export function isValidPort(n: number): boolean {
  return Number.isInteger(n) && n >= 1 && n <= 65535
}

// ---------------------------------------------------------------------------
// Main validator
// ---------------------------------------------------------------------------
export function validateConfig(config: TalosConfig, version: TalosVersion): ValidationError[] {
  const errors: ValidationError[] = []

  function err(field: string, message: string, severity: ValidationSeverity = 'error') {
    errors.push({ field, message, severity })
  }

  const { machine: m, cluster: c } = config

  // --- Machine ---

  if (!m.install.disk.trim()) {
    err('machine.install.disk', 'Install disk is required (e.g. /dev/sda)')
  }

  if (!m.install.image.trim()) {
    err('machine.install.image', 'Installer image is required')
  } else if (!isValidImage(m.install.image)) {
    err('machine.install.image', 'Invalid container image reference')
  }

  if (!m.kubelet.image.trim()) {
    err('machine.kubelet.image', 'Kubelet image is required')
  } else if (!isValidImage(m.kubelet.image)) {
    err('machine.kubelet.image', 'Invalid container image reference')
  }

  if (m.network.hostname && !isValidHostname(m.network.hostname)) {
    err('machine.network.hostname', 'Invalid hostname — use lowercase letters, digits, and hyphens')
  }

  m.network.nameservers.forEach((ns, i) => {
    if (ns && !isValidIP(ns)) {
      err(`machine.network.nameservers.${i}`, `"${ns}" is not a valid IP address`)
    }
  })

  m.network.interfaces.forEach((iface, ii) => {
    if (!iface.interface.trim()) {
      err(`machine.network.interfaces.${ii}.interface`, 'Interface name is required')
    }
    iface.addresses.forEach((addr, ai) => {
      if (addr && !isValidCIDR(addr)) {
        err(
          `machine.network.interfaces.${ii}.addresses.${ai}`,
          `"${addr}" is not a valid CIDR (e.g. 192.168.1.100/24)`,
        )
      }
    })
    iface.routes.forEach((route, ri) => {
      if (route.network && !isValidCIDR(route.network)) {
        err(
          `machine.network.interfaces.${ii}.routes.${ri}.network`,
          `"${route.network}" is not a valid CIDR`,
        )
      }
      if (route.gateway && !isValidIP(route.gateway)) {
        err(
          `machine.network.interfaces.${ii}.routes.${ri}.gateway`,
          `"${route.gateway}" is not a valid IP address`,
        )
      }
    })
    if (iface.vip && !isValidIP(iface.vip)) {
      err(`machine.network.interfaces.${ii}.vip`, `"${iface.vip}" is not a valid IP address`)
    }
  })

  m.kubelet.clusterDNS.forEach((ip, i) => {
    if (ip && !isValidIP(ip)) {
      err(`machine.kubelet.clusterDNS.${i}`, `"${ip}" is not a valid IP address`)
    }
  })

  // Version-specific feature warnings
  if (!version.supportedFeatures.userVolumes && m.userVolumes.length > 0) {
    err(
      'machine.userVolumes',
      `User Volumes require Talos ${version.version.startsWith('v1.8') ? 'v1.8+' : 'v1.8+'} — not available in ${version.version}`,
      'warning',
    )
  }
  if (!version.supportedFeatures.diskQuotaSupport && m.features.diskQuotaSupport) {
    err(
      'machine.features.diskQuotaSupport',
      `Disk Quota Support requires Talos v1.6+ — not available in ${version.version}`,
      'warning',
    )
  }
  if (
    !version.supportedFeatures.proxyModeNftables &&
    c.proxy.mode === 'nftables' &&
    !c.proxy.disabled
  ) {
    err(
      'cluster.proxy.mode',
      `nftables proxy mode requires Talos v1.7+ — not available in ${version.version}`,
      'warning',
    )
  }

  // --- Cluster ---

  if (!c.clusterName.trim()) {
    err('cluster.clusterName', 'Cluster name is required')
  }

  if (m.type === 'controlplane') {
    if (!c.endpoint.trim()) {
      err('cluster.endpoint', 'Control plane endpoint is required for controlplane nodes')
    } else if (!isValidEndpoint(c.endpoint)) {
      err('cluster.endpoint', 'Endpoint must be a valid https:// URL (e.g. https://192.168.1.100:6443)')
    }
  } else if (c.endpoint && !isValidEndpoint(c.endpoint)) {
    err('cluster.endpoint', 'Endpoint must be a valid https:// URL')
  }

  if (!isValidPort(c.localAPIServerPort)) {
    err('cluster.localAPIServerPort', 'Port must be between 1 and 65535')
  }

  if (!c.network.dnsDomain.trim()) {
    err('cluster.network.dnsDomain', 'DNS domain is required (e.g. cluster.local)')
  }

  c.network.podSubnets.forEach((cidr, i) => {
    if (cidr && !isValidCIDR(cidr)) {
      err(`cluster.network.podSubnets.${i}`, `"${cidr}" is not a valid CIDR`)
    }
  })

  c.network.serviceSubnets.forEach((cidr, i) => {
    if (cidr && !isValidCIDR(cidr)) {
      err(`cluster.network.serviceSubnets.${i}`, `"${cidr}" is not a valid CIDR`)
    }
  })

  if (!c.apiServer.image.trim()) {
    err('cluster.apiServer.image', 'API server image is required')
  } else if (!isValidImage(c.apiServer.image)) {
    err('cluster.apiServer.image', 'Invalid container image reference')
  }

  c.apiServer.certSANs.forEach((san, i) => {
    if (san && !isValidIP(san) && !isValidHostname(san)) {
      err(
        `cluster.apiServer.certSANs.${i}`,
        `"${san}" is not a valid IP address or hostname`,
      )
    }
  })

  if (!c.controllerManager.image.trim()) {
    err('cluster.controllerManager.image', 'Controller manager image is required')
  } else if (!isValidImage(c.controllerManager.image)) {
    err('cluster.controllerManager.image', 'Invalid container image reference')
  }

  if (!c.scheduler.image.trim()) {
    err('cluster.scheduler.image', 'Scheduler image is required')
  } else if (!isValidImage(c.scheduler.image)) {
    err('cluster.scheduler.image', 'Invalid container image reference')
  }

  if (!c.etcd.image.trim()) {
    err('cluster.etcd.image', 'etcd image is required')
  } else if (!isValidImage(c.etcd.image)) {
    err('cluster.etcd.image', 'Invalid container image reference')
  }

  c.etcd.advertisedSubnets.forEach((cidr, i) => {
    if (cidr && !isValidCIDR(cidr)) {
      err(`cluster.etcd.advertisedSubnets.${i}`, `"${cidr}" is not a valid CIDR`)
    }
  })

  return errors
}
