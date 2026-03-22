import { TalosConfig } from './types'
import { TalosVersion } from './versions'

let _nextId = 1
export function nextId(): string {
  return String(_nextId++)
}

export function makeDefaultConfig(v: TalosVersion): TalosConfig {
  return {
    machine: {
      type: 'controlplane',
      network: {
        hostname: '',
        interfaces: [],
        nameservers: ['1.1.1.1', '8.8.8.8'],
        searchDomains: [],
        kubespan: { enabled: false },
      },
      install: {
        disk: '/dev/sda',
        image: v.installerImage,
        bootloader: true,
        wipe: false,
        extraKernelArgs: [],
      },
      kubelet: {
        image: v.kubeletImage,
        extraArgs: [],
        clusterDNS: [],
      },
      features: {
        rbac: true,
        stableHostname: true,
        apidCheckExtKeyUsage: true,
        diskQuotaSupport: true,
        kubePrism: { enabled: v.supportedFeatures.kubePrism, port: 7445 },
      },
      env: [],
      sysctls: [],
      userVolumes: [],
      hardware: {
        disks: [],
      },
    },
    cluster: {
      clusterName: 'talos-cluster',
      endpoint: '',
      localAPIServerPort: 6443,
      network: {
        dnsDomain: 'cluster.local',
        podSubnets: ['10.244.0.0/16'],
        serviceSubnets: ['10.96.0.0/12'],
        cniName: 'flannel',
        cniUrls: [],
      },
      allowSchedulingOnControlPlanes: false,
      apiServer: {
        image: v.apiServerImage,
        certSANs: [],
        extraArgs: [],
        disablePodSecurityPolicy: false,
      },
      controllerManager: {
        image: v.controllerManagerImage,
        extraArgs: [],
      },
      scheduler: {
        image: v.schedulerImage,
        extraArgs: [],
      },
      etcd: {
        image: v.etcdImage,
        extraArgs: [],
        advertisedSubnets: [],
      },
      discovery: {
        enabled: true,
      },
      proxy: {
        disabled: false,
        mode: 'iptables',
      },
      coreDNS: {
        disabled: false,
        image: v.coreDNSImage,
      },
    },
  }
}

export function updateConfigForVersion(config: TalosConfig, v: TalosVersion): TalosConfig {
  const currentKubePrismEnabled = config.machine.features.kubePrism?.enabled ?? false
  // If the new version doesn't support KubePrism, force-disable it.
  // If the new version does support it and it was off only because the previous version
  // didn't support it (i.e. enabled===false and old version had kubePrism===false), enable it.
  const kubePrismEnabled = !v.supportedFeatures.kubePrism
    ? false
    : currentKubePrismEnabled

  return {
    ...config,
    machine: {
      ...config.machine,
      install: {
        ...config.machine.install,
        image: v.installerImage,
      },
      kubelet: {
        ...config.machine.kubelet,
        image: v.kubeletImage,
      },
      features: {
        ...config.machine.features,
        kubePrism: {
          enabled: kubePrismEnabled,
          port: config.machine.features.kubePrism?.port ?? 7445,
        },
      },
    },
    cluster: {
      ...config.cluster,
      apiServer: {
        ...config.cluster.apiServer,
        image: v.apiServerImage,
      },
      controllerManager: {
        ...config.cluster.controllerManager,
        image: v.controllerManagerImage,
      },
      scheduler: {
        ...config.cluster.scheduler,
        image: v.schedulerImage,
      },
      etcd: {
        ...config.cluster.etcd,
        image: v.etcdImage,
      },
      coreDNS: {
        ...config.cluster.coreDNS,
        image: v.coreDNSImage,
      },
    },
  }
}
