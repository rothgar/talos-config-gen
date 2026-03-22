import yaml from 'js-yaml'
import { TalosConfig, NetworkInterface, KVPair, UserVolume, NetworkRoute } from '../types'
import { nextId } from '../defaults'

// ---------------------------------------------------------------------------
// Config → YAML document object (shape that Talos expects)
// ---------------------------------------------------------------------------
function kvPairsToRecord(pairs: KVPair[]): Record<string, string> | undefined {
  if (pairs.length === 0) return undefined
  const rec: Record<string, string> = {}
  for (const p of pairs) {
    if (p.key) rec[p.key] = p.value
  }
  return Object.keys(rec).length > 0 ? rec : undefined
}

function interfaceToDoc(iface: NetworkInterface) {
  const doc: Record<string, unknown> = { interface: iface.interface }
  if (iface.dhcp) {
    doc.dhcp = true
  } else if (iface.addresses.length > 0) {
    doc.addresses = iface.addresses.filter(Boolean)
  }
  if (iface.routes.length > 0) {
    doc.routes = iface.routes
      .filter((r) => r.network && r.gateway)
      .map((r) => {
        const route: Record<string, unknown> = { network: r.network, gateway: r.gateway }
        if (r.metric !== undefined) route.metric = r.metric
        return route
      })
  }
  if (iface.mtu) doc.mtu = iface.mtu
  if (iface.vip) doc.vip = { ip: iface.vip }
  return doc
}

function userVolumeToDoc(v: UserVolume, installDisk?: string) {
  const doc: Record<string, unknown> = { name: v.name }
  const prov: Record<string, unknown> = {}
  const sel: Record<string, string> = {}
  // 'system_disk' is a UI marker meaning "use the install disk"
  if (v.diskSelectorMatch === 'system_disk') {
    sel.name = installDisk || '/dev/sda'
  } else {
    if (v.diskSelectorMatch) sel.match = v.diskSelectorMatch
    if (v.diskSelectorSize) sel.size = v.diskSelectorSize
    if (v.diskSelectorName) sel.name = v.diskSelectorName
  }
  if (Object.keys(sel).length > 0) prov.diskSelector = sel
  if (v.minSize) prov.minSize = v.minSize
  if (v.maxSize) prov.maxSize = v.maxSize
  if (Object.keys(prov).length > 0) doc.provisioning = prov
  if (v.filesystemType) doc.filesystem = { type: v.filesystemType }
  if (v.mountPath) doc.mount = { path: v.mountPath }
  return doc
}

export function configToDoc(config: TalosConfig) {
  const m = config.machine
  const c = config.cluster

  // Machine network
  const networkDoc: Record<string, unknown> = {}
  if (m.network.hostname) networkDoc.hostname = m.network.hostname
  const validInterfaces = m.network.interfaces.filter((i) => i.interface)
  if (validInterfaces.length > 0) networkDoc.interfaces = validInterfaces.map(interfaceToDoc)
  const ns = m.network.nameservers.filter(Boolean)
  if (ns.length > 0) networkDoc.nameservers = ns
  const sd = m.network.searchDomains.filter(Boolean)
  if (sd.length > 0) networkDoc.searchDomains = sd
  if (m.network.kubespan?.enabled) networkDoc.kubespan = { enabled: true }

  // Machine install
  const installDoc: Record<string, unknown> = {
    disk: m.install.disk || '/dev/sda',
    image: m.install.image,
    bootloader: m.install.bootloader,
    wipe: m.install.wipe,
  }
  const kernelArgs = m.install.extraKernelArgs.filter(Boolean)
  if (kernelArgs.length > 0) installDoc.extraKernelArgs = kernelArgs

  // Machine kubelet
  const kubeletDoc: Record<string, unknown> = { image: m.kubelet.image }
  const kArgs = kvPairsToRecord(m.kubelet.extraArgs)
  if (kArgs) kubeletDoc.extraArgs = kArgs
  const dns = m.kubelet.clusterDNS.filter(Boolean)
  if (dns.length > 0) kubeletDoc.clusterDNS = dns

  // Machine features
  const featuresDoc: Record<string, unknown> = {
    rbac: m.features.rbac,
    stableHostname: m.features.stableHostname,
    apidCheckExtKeyUsage: m.features.apidCheckExtKeyUsage,
    diskQuotaSupport: m.features.diskQuotaSupport,
  }
  if (m.features.kubePrism?.enabled) {
    featuresDoc.kubePrism = { enabled: true, port: m.features.kubePrism.port || 7445 }
  }

  // Machine section
  const machineDoc: Record<string, unknown> = {
    type: m.type,
    network: Object.keys(networkDoc).length > 0 ? networkDoc : undefined,
    install: installDoc,
    kubelet: kubeletDoc,
    features: featuresDoc,
  }
  const envRecord = kvPairsToRecord(m.env)
  if (envRecord) machineDoc.env = envRecord
  const sysctlRecord = kvPairsToRecord(m.sysctls)
  if (sysctlRecord) machineDoc.sysctls = sysctlRecord
  const vols = m.userVolumes.filter((v) => v.name)
  if (vols.length > 0) machineDoc.userVolumes = vols.map((v) => userVolumeToDoc(v, m.install.disk))

  // Cluster network
  const cni: Record<string, unknown> = { name: c.network.cniName }
  if (c.network.cniName === 'custom' && c.network.cniUrls.length > 0) {
    cni.urls = c.network.cniUrls.filter(Boolean)
  }
  const clusterNetworkDoc: Record<string, unknown> = {
    dnsDomain: c.network.dnsDomain || 'cluster.local',
    podSubnets: c.network.podSubnets.filter(Boolean),
    serviceSubnets: c.network.serviceSubnets.filter(Boolean),
    cni,
  }

  // Cluster apiServer
  const apiServerDoc: Record<string, unknown> = { image: c.apiServer.image }
  const apiSANs = c.apiServer.certSANs.filter(Boolean)
  if (apiSANs.length > 0) apiServerDoc.certSANs = apiSANs
  const apiArgs = kvPairsToRecord(c.apiServer.extraArgs)
  if (apiArgs) apiServerDoc.extraArgs = apiArgs
  if (c.apiServer.disablePodSecurityPolicy)
    apiServerDoc.disablePodSecurityPolicy = c.apiServer.disablePodSecurityPolicy

  // Cluster controllerManager
  const cmDoc: Record<string, unknown> = { image: c.controllerManager.image }
  const cmArgs = kvPairsToRecord(c.controllerManager.extraArgs)
  if (cmArgs) cmDoc.extraArgs = cmArgs

  // Cluster scheduler
  const schedDoc: Record<string, unknown> = { image: c.scheduler.image }
  const schedArgs = kvPairsToRecord(c.scheduler.extraArgs)
  if (schedArgs) schedDoc.extraArgs = schedArgs

  // Cluster etcd
  const etcdDoc: Record<string, unknown> = { image: c.etcd.image }
  const etcdArgs = kvPairsToRecord(c.etcd.extraArgs)
  if (etcdArgs) etcdDoc.extraArgs = etcdArgs
  const advSubnets = c.etcd.advertisedSubnets.filter(Boolean)
  if (advSubnets.length > 0) etcdDoc.advertisedSubnets = advSubnets

  // Cluster discovery
  const discoveryDoc: Record<string, unknown> = {
    enabled: c.discovery.enabled,
    registries: {
      kubernetes: { disabled: false },
      service: {},
    },
  }

  // Cluster coreDNS
  const coreDNSDoc: Record<string, unknown> = {
    disabled: c.coreDNS.disabled,
    image: c.coreDNS.image,
  }

  // Cluster proxy
  const proxyDoc: Record<string, unknown> = {
    disabled: c.proxy.disabled,
    mode: c.proxy.mode,
  }

  // Cluster controlPlane
  const cpDoc: Record<string, unknown> = {}
  if (c.endpoint) cpDoc.endpoint = c.endpoint
  if (c.localAPIServerPort && c.localAPIServerPort !== 6443)
    cpDoc.localAPIServerPort = c.localAPIServerPort

  // Cluster section
  const clusterDoc: Record<string, unknown> = {
    clusterName: c.clusterName || 'talos-cluster',
    controlPlane: Object.keys(cpDoc).length > 0 ? cpDoc : undefined,
    network: clusterNetworkDoc,
    apiServer: apiServerDoc,
    controllerManager: cmDoc,
    scheduler: schedDoc,
    etcd: etcdDoc,
    discovery: discoveryDoc,
    coreDNS: coreDNSDoc,
    proxy: proxyDoc,
    allowSchedulingOnControlPlanes: c.allowSchedulingOnControlPlanes,
  }

  return {
    version: 'v1alpha1',
    debug: false,
    persist: true,
    machine: machineDoc,
    cluster: clusterDoc,
  }
}

export function configToYaml(config: TalosConfig): string {
  const doc = configToDoc(config)
  return yaml.dump(doc, {
    lineWidth: 120,
    noRefs: true,
    indent: 2,
    quotingType: '"',
    forceQuotes: false,
  })
}

// ---------------------------------------------------------------------------
// YAML → Config (best-effort parse)
// ---------------------------------------------------------------------------
function toStr(v: unknown, fallback = ''): string {
  if (v === null || v === undefined) return fallback
  return String(v)
}

function toBool(v: unknown, fallback: boolean): boolean {
  if (v === null || v === undefined) return fallback
  return Boolean(v)
}

function toNum(v: unknown, fallback: number): number {
  if (v === null || v === undefined) return fallback
  const n = Number(v)
  return isNaN(n) ? fallback : n
}

function toStrArray(v: unknown): string[] {
  if (!Array.isArray(v)) return []
  return v.map((x) => toStr(x)).filter(Boolean)
}

function recordToKV(v: unknown): KVPair[] {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return []
  return Object.entries(v as Record<string, unknown>).map(([k, val]) => ({
    _id: nextId(),
    key: k,
    value: toStr(val),
  }))
}

function parseInterface(raw: unknown): NetworkInterface {
  const r = (raw ?? {}) as Record<string, unknown>
  const routes: NetworkRoute[] = Array.isArray(r.routes)
    ? r.routes.map((rt: unknown) => {
        const ro = (rt ?? {}) as Record<string, unknown>
        return {
          _id: nextId(),
          network: toStr(ro.network),
          gateway: toStr(ro.gateway),
          metric: ro.metric !== undefined ? toNum(ro.metric, 0) : undefined,
        }
      })
    : []
  const vip = r.vip ? toStr((r.vip as Record<string, unknown>).ip) : undefined
  return {
    _id: nextId(),
    interface: toStr(r.interface),
    dhcp: toBool(r.dhcp, false),
    addresses: toStrArray(r.addresses),
    routes,
    mtu: r.mtu !== undefined ? toNum(r.mtu, 0) : undefined,
    vip,
  }
}

function parseUserVolume(raw: unknown): UserVolume {
  const r = (raw ?? {}) as Record<string, unknown>
  const prov = (r.provisioning ?? {}) as Record<string, unknown>
  const sel = (prov.diskSelector ?? {}) as Record<string, unknown>
  const fs = (r.filesystem ?? {}) as Record<string, unknown>
  const mount = (r.mount ?? {}) as Record<string, unknown>
  return {
    _id: nextId(),
    name: toStr(r.name),
    minSize: toStr(prov.minSize),
    maxSize: toStr(prov.maxSize),
    diskSelectorSize: toStr(sel.size),
    diskSelectorName: toStr(sel.name),
    diskSelectorMatch: toStr(sel.match),
    mountPath: toStr(mount.path),
    filesystemType: toStr(fs.type),
  }
}

export function yamlToConfig(yamlStr: string): { config: TalosConfig; error: null } | { config: null; error: string } {
  let doc: unknown
  try {
    doc = yaml.load(yamlStr)
  } catch (e) {
    return { config: null, error: String(e) }
  }
  if (!doc || typeof doc !== 'object') {
    return { config: null, error: 'Invalid YAML: expected an object' }
  }

  const root = doc as Record<string, unknown>
  const m = (root.machine ?? {}) as Record<string, unknown>
  const c = (root.cluster ?? {}) as Record<string, unknown>

  const mNet = (m.network ?? {}) as Record<string, unknown>
  const mInstall = (m.install ?? {}) as Record<string, unknown>
  const mKubelet = (m.kubelet ?? {}) as Record<string, unknown>
  const mFeatures = (m.features ?? {}) as Record<string, unknown>
  const cNet = (c.network ?? {}) as Record<string, unknown>
  const cCNI = (cNet.cni ?? {}) as Record<string, unknown>
  const cCP = (c.controlPlane ?? {}) as Record<string, unknown>
  const cApi = (c.apiServer ?? {}) as Record<string, unknown>
  const cCM = (c.controllerManager ?? {}) as Record<string, unknown>
  const cSched = (c.scheduler ?? {}) as Record<string, unknown>
  const cEtcd = (c.etcd ?? {}) as Record<string, unknown>
  const cDisc = (c.discovery ?? {}) as Record<string, unknown>
  const cProxy = (c.proxy ?? {}) as Record<string, unknown>
  const cCoreDNS = (c.coreDNS ?? {}) as Record<string, unknown>

  const config: TalosConfig = {
    machine: {
      type: (m.type as 'controlplane' | 'worker') ?? 'controlplane',
      network: {
        hostname: toStr(mNet.hostname),
        interfaces: Array.isArray(mNet.interfaces)
          ? mNet.interfaces.map(parseInterface)
          : [],
        nameservers: toStrArray(mNet.nameservers),
        searchDomains: toStrArray(mNet.searchDomains),
        kubespan: { enabled: toBool((mNet.kubespan as Record<string, unknown>)?.enabled, false) },
      },
      install: {
        disk: toStr(mInstall.disk, '/dev/sda'),
        image: toStr(mInstall.image),
        bootloader: toBool(mInstall.bootloader, true),
        wipe: toBool(mInstall.wipe, false),
        extraKernelArgs: toStrArray(mInstall.extraKernelArgs),
      },
      kubelet: {
        image: toStr(mKubelet.image),
        extraArgs: recordToKV(mKubelet.extraArgs),
        clusterDNS: toStrArray(mKubelet.clusterDNS),
      },
      features: {
        rbac: toBool(mFeatures.rbac, true),
        stableHostname: toBool(mFeatures.stableHostname, true),
        apidCheckExtKeyUsage: toBool(mFeatures.apidCheckExtKeyUsage, true),
        diskQuotaSupport: toBool(mFeatures.diskQuotaSupport, true),
        kubePrism: {
          enabled: toBool((mFeatures.kubePrism as Record<string, unknown>)?.enabled, false),
          port: toNum((mFeatures.kubePrism as Record<string, unknown>)?.port, 7445),
        },
      },
      env: recordToKV(m.env),
      sysctls: recordToKV(m.sysctls),
      userVolumes: Array.isArray(m.userVolumes)
        ? m.userVolumes.map(parseUserVolume)
        : [],
      hardware: { disks: [] },
    },
    cluster: {
      clusterName: toStr(c.clusterName, 'talos-cluster'),
      endpoint: toStr(cCP.endpoint),
      localAPIServerPort: toNum(cCP.localAPIServerPort, 6443),
      network: {
        dnsDomain: toStr(cNet.dnsDomain, 'cluster.local'),
        podSubnets: toStrArray(cNet.podSubnets),
        serviceSubnets: toStrArray(cNet.serviceSubnets),
        cniName: (toStr(cCNI.name, 'flannel') as 'flannel' | 'custom' | 'none'),
        cniUrls: toStrArray(cCNI.urls),
      },
      allowSchedulingOnControlPlanes: toBool(c.allowSchedulingOnControlPlanes, false),
      apiServer: {
        image: toStr(cApi.image),
        certSANs: toStrArray(cApi.certSANs),
        extraArgs: recordToKV(cApi.extraArgs),
        disablePodSecurityPolicy: toBool(cApi.disablePodSecurityPolicy, false),
      },
      controllerManager: {
        image: toStr(cCM.image),
        extraArgs: recordToKV(cCM.extraArgs),
      },
      scheduler: {
        image: toStr(cSched.image),
        extraArgs: recordToKV(cSched.extraArgs),
      },
      etcd: {
        image: toStr(cEtcd.image),
        extraArgs: recordToKV(cEtcd.extraArgs),
        advertisedSubnets: toStrArray(cEtcd.advertisedSubnets),
      },
      discovery: {
        enabled: toBool(cDisc.enabled, true),
      },
      proxy: {
        disabled: toBool(cProxy.disabled, false),
        mode: (toStr(cProxy.mode, 'iptables') as 'iptables' | 'ipvs' | 'nftables'),
      },
      coreDNS: {
        disabled: toBool(cCoreDNS.disabled, false),
        image: toStr(cCoreDNS.image),
      },
    },
  }

  return { config, error: null }
}
