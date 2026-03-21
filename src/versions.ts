export interface SupportedFeatures {
  userVolumes: boolean       // machine.userVolumes — v1.8+
  diskQuotaSupport: boolean  // machine.features.diskQuotaSupport — v1.6+
  stableHostname: boolean    // machine.features.stableHostname — all versions
  proxyModeNftables: boolean // cluster.proxy.mode = 'nftables' — v1.7+
}

export interface TalosVersion {
  version: string
  label: string
  prerelease?: boolean
  k8sVersion: string
  installerImage: string
  kubeletImage: string
  apiServerImage: string
  controllerManagerImage: string
  schedulerImage: string
  proxyImage: string
  etcdImage: string
  coreDNSImage: string
  supportedFeatures: SupportedFeatures
}

export const TALOS_VERSIONS: TalosVersion[] = [
  {
    version: 'v1.13.0-beta.0',
    label: 'v1.13.0-beta.0 (beta)',
    prerelease: true,
    k8sVersion: 'v1.36.0-alpha.2',
    installerImage: 'ghcr.io/siderolabs/installer:v1.13.0-beta.0',
    kubeletImage: 'ghcr.io/siderolabs/kubelet:v1.36.0-alpha.2',
    apiServerImage: 'registry.k8s.io/kube-apiserver:v1.36.0-alpha.2',
    controllerManagerImage: 'registry.k8s.io/kube-controller-manager:v1.36.0-alpha.2',
    schedulerImage: 'registry.k8s.io/kube-scheduler:v1.36.0-alpha.2',
    proxyImage: 'registry.k8s.io/kube-proxy:v1.36.0-alpha.2',
    etcdImage: 'registry.k8s.io/etcd:v3.6.8',
    coreDNSImage: 'registry.k8s.io/coredns/coredns:v1.14.2',
    supportedFeatures: {
      userVolumes: true,
      diskQuotaSupport: true,
      stableHostname: true,
      proxyModeNftables: true,
    },
  },
  {
    version: 'v1.12.6',
    label: 'v1.12.6 (latest)',
    k8sVersion: 'v1.35.2',
    installerImage: 'ghcr.io/siderolabs/installer:v1.12.6',
    kubeletImage: 'ghcr.io/siderolabs/kubelet:v1.35.2',
    apiServerImage: 'registry.k8s.io/kube-apiserver:v1.35.2',
    controllerManagerImage: 'registry.k8s.io/kube-controller-manager:v1.35.2',
    schedulerImage: 'registry.k8s.io/kube-scheduler:v1.35.2',
    proxyImage: 'registry.k8s.io/kube-proxy:v1.35.2',
    etcdImage: 'registry.k8s.io/etcd:v3.6.8',
    coreDNSImage: 'registry.k8s.io/coredns/coredns:v1.13.2',
    supportedFeatures: {
      userVolumes: true,
      diskQuotaSupport: true,
      stableHostname: true,
      proxyModeNftables: true,
    },
  },
  {
    version: 'v1.11.5',
    label: 'v1.11.5',
    k8sVersion: 'v1.34.1',
    installerImage: 'ghcr.io/siderolabs/installer:v1.11.5',
    kubeletImage: 'ghcr.io/siderolabs/kubelet:v1.34.1',
    apiServerImage: 'registry.k8s.io/kube-apiserver:v1.34.1',
    controllerManagerImage: 'registry.k8s.io/kube-controller-manager:v1.34.1',
    schedulerImage: 'registry.k8s.io/kube-scheduler:v1.34.1',
    proxyImage: 'registry.k8s.io/kube-proxy:v1.34.1',
    etcdImage: 'gcr.io/etcd-development/etcd:v3.6.5',
    coreDNSImage: 'registry.k8s.io/coredns/coredns:v1.12.4',
    supportedFeatures: {
      userVolumes: true,
      diskQuotaSupport: true,
      stableHostname: true,
      proxyModeNftables: true,
    },
  },
  {
    version: 'v1.10.8',
    label: 'v1.10.8',
    k8sVersion: 'v1.33.6',
    installerImage: 'ghcr.io/siderolabs/installer:v1.10.8',
    kubeletImage: 'ghcr.io/siderolabs/kubelet:v1.33.6',
    apiServerImage: 'registry.k8s.io/kube-apiserver:v1.33.6',
    controllerManagerImage: 'registry.k8s.io/kube-controller-manager:v1.33.6',
    schedulerImage: 'registry.k8s.io/kube-scheduler:v1.33.6',
    proxyImage: 'registry.k8s.io/kube-proxy:v1.33.6',
    etcdImage: 'gcr.io/etcd-development/etcd:v3.5.21',
    coreDNSImage: 'registry.k8s.io/coredns/coredns:v1.12.1',
    supportedFeatures: {
      userVolumes: true,
      diskQuotaSupport: true,
      stableHostname: true,
      proxyModeNftables: true,
    },
  },
  {
    version: 'v1.9.2',
    label: 'v1.9.2',
    k8sVersion: 'v1.31.4',
    installerImage: 'ghcr.io/siderolabs/installer:v1.9.2',
    kubeletImage: 'ghcr.io/siderolabs/kubelet:v1.31.4',
    apiServerImage: 'registry.k8s.io/kube-apiserver:v1.31.4',
    controllerManagerImage: 'registry.k8s.io/kube-controller-manager:v1.31.4',
    schedulerImage: 'registry.k8s.io/kube-scheduler:v1.31.4',
    proxyImage: 'registry.k8s.io/kube-proxy:v1.31.4',
    etcdImage: 'gcr.io/etcd-development/etcd:v3.5.17-amd64',
    coreDNSImage: 'registry.k8s.io/coredns/coredns:v1.11.3',
    supportedFeatures: {
      userVolumes: true,
      diskQuotaSupport: true,
      stableHostname: true,
      proxyModeNftables: true,
    },
  },
  {
    version: 'v1.8.4',
    label: 'v1.8.4',
    k8sVersion: 'v1.31.3',
    installerImage: 'ghcr.io/siderolabs/installer:v1.8.4',
    kubeletImage: 'ghcr.io/siderolabs/kubelet:v1.31.3',
    apiServerImage: 'registry.k8s.io/kube-apiserver:v1.31.3',
    controllerManagerImage: 'registry.k8s.io/kube-controller-manager:v1.31.3',
    schedulerImage: 'registry.k8s.io/kube-scheduler:v1.31.3',
    proxyImage: 'registry.k8s.io/kube-proxy:v1.31.3',
    etcdImage: 'gcr.io/etcd-development/etcd:v3.5.16-amd64',
    coreDNSImage: 'registry.k8s.io/coredns/coredns:v1.11.3',
    supportedFeatures: {
      userVolumes: true,
      diskQuotaSupport: true,
      stableHostname: true,
      proxyModeNftables: true,
    },
  },
  {
    version: 'v1.7.7',
    label: 'v1.7.7',
    k8sVersion: 'v1.30.6',
    installerImage: 'ghcr.io/siderolabs/installer:v1.7.7',
    kubeletImage: 'ghcr.io/siderolabs/kubelet:v1.30.6',
    apiServerImage: 'registry.k8s.io/kube-apiserver:v1.30.6',
    controllerManagerImage: 'registry.k8s.io/kube-controller-manager:v1.30.6',
    schedulerImage: 'registry.k8s.io/kube-scheduler:v1.30.6',
    proxyImage: 'registry.k8s.io/kube-proxy:v1.30.6',
    etcdImage: 'gcr.io/etcd-development/etcd:v3.5.15-amd64',
    coreDNSImage: 'registry.k8s.io/coredns/coredns:v1.11.3',
    supportedFeatures: {
      userVolumes: false,
      diskQuotaSupport: true,
      stableHostname: true,
      proxyModeNftables: true,
    },
  },
  {
    version: 'v1.6.7',
    label: 'v1.6.7',
    k8sVersion: 'v1.29.7',
    installerImage: 'ghcr.io/siderolabs/installer:v1.6.7',
    kubeletImage: 'ghcr.io/siderolabs/kubelet:v1.29.7',
    apiServerImage: 'registry.k8s.io/kube-apiserver:v1.29.7',
    controllerManagerImage: 'registry.k8s.io/kube-controller-manager:v1.29.7',
    schedulerImage: 'registry.k8s.io/kube-scheduler:v1.29.7',
    proxyImage: 'registry.k8s.io/kube-proxy:v1.29.7',
    etcdImage: 'gcr.io/etcd-development/etcd:v3.5.12-amd64',
    coreDNSImage: 'registry.k8s.io/coredns/coredns:v1.11.1',
    supportedFeatures: {
      userVolumes: false,
      diskQuotaSupport: true,
      stableHostname: true,
      proxyModeNftables: false,
    },
  },
  {
    version: 'v1.5.6',
    label: 'v1.5.6',
    k8sVersion: 'v1.28.8',
    installerImage: 'ghcr.io/siderolabs/installer:v1.5.6',
    kubeletImage: 'ghcr.io/siderolabs/kubelet:v1.28.8',
    apiServerImage: 'registry.k8s.io/kube-apiserver:v1.28.8',
    controllerManagerImage: 'registry.k8s.io/kube-controller-manager:v1.28.8',
    schedulerImage: 'registry.k8s.io/kube-scheduler:v1.28.8',
    proxyImage: 'registry.k8s.io/kube-proxy:v1.28.8',
    etcdImage: 'gcr.io/etcd-development/etcd:v3.5.10-amd64',
    coreDNSImage: 'registry.k8s.io/coredns/coredns:v1.10.1',
    supportedFeatures: {
      userVolumes: false,
      diskQuotaSupport: false,
      stableHostname: true,
      proxyModeNftables: false,
    },
  },
]

export const DEFAULT_VERSION = TALOS_VERSIONS.find((v) => !v.prerelease) ?? TALOS_VERSIONS[0]
