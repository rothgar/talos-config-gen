export type MachineType = 'controlplane' | 'worker'
export type CNIName = 'flannel' | 'custom' | 'none'
export type ProxyMode = 'iptables' | 'ipvs' | 'nftables'

// Array items carry a _id field for React reconciliation (stripped in YAML output)
export interface NetworkRoute {
  _id: string
  network: string
  gateway: string
  metric?: number
}

export interface NetworkInterface {
  _id: string
  interface: string
  dhcp: boolean
  addresses: string[]
  routes: NetworkRoute[]
  mtu?: number
  vip?: string
}

export interface KVPair {
  _id: string
  key: string
  value: string
}

export interface HardDisk {
  _id: string
  name: string  // e.g. '/dev/sda'
  size: number  // GiB
}

export interface UserVolume {
  _id: string
  name: string
  minSize: string
  maxSize: string
  diskSelectorSize: string
  diskSelectorName: string
  diskSelectorMatch: string  // e.g. 'system_disk' (UI marker) or CEL expression
  mountPath: string
  filesystemType: string     // 'xfs' | 'ext4' | 'vfat' | ''
}

export interface TalosConfig {
  machine: {
    type: MachineType
    hardware?: {
      disks: HardDisk[]
    }
    network: {
      hostname: string
      interfaces: NetworkInterface[]
      nameservers: string[]
      searchDomains: string[]
      kubespan: {
        enabled: boolean
      }
    }
    install: {
      disk: string
      image: string
      bootloader: boolean
      wipe: boolean
      extraKernelArgs: string[]
    }
    kubelet: {
      image: string
      extraArgs: KVPair[]
      clusterDNS: string[]
    }
    features: {
      rbac: boolean
      stableHostname: boolean
      apidCheckExtKeyUsage: boolean
      diskQuotaSupport: boolean
      kubePrism: {
        enabled: boolean
        port: number
      }
    }
    env: KVPair[]
    sysctls: KVPair[]
    userVolumes: UserVolume[]
  }
  cluster: {
    clusterName: string
    endpoint: string
    localAPIServerPort: number
    network: {
      dnsDomain: string
      podSubnets: string[]
      serviceSubnets: string[]
      cniName: CNIName
      cniUrls: string[]
    }
    allowSchedulingOnControlPlanes: boolean
    apiServer: {
      image: string
      certSANs: string[]
      extraArgs: KVPair[]
      disablePodSecurityPolicy: boolean
    }
    controllerManager: {
      image: string
      extraArgs: KVPair[]
    }
    scheduler: {
      image: string
      extraArgs: KVPair[]
    }
    etcd: {
      image: string
      extraArgs: KVPair[]
      advertisedSubnets: string[]
    }
    discovery: {
      enabled: boolean
    }
    proxy: {
      disabled: boolean
      mode: ProxyMode
    }
    coreDNS: {
      disabled: boolean
      image: string
    }
  }
}

export type View = 'visual' | 'yaml'
