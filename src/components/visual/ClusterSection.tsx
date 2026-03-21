import { TalosConfig } from '../../types'
import Section from '../Section'
import FormField from '../FormField'
import KeyValueEditor from '../KeyValueEditor'
import ListEditor from '../ListEditor'

interface ClusterSectionProps {
  config: TalosConfig
  onChange: (config: TalosConfig) => void
}

type C = TalosConfig['cluster']

function patchCluster(config: TalosConfig, patch: Partial<C>): TalosConfig {
  return { ...config, cluster: { ...config.cluster, ...patch } }
}

export default function ClusterSection({ config, onChange }: ClusterSectionProps) {
  const c = config.cluster

  return (
    <div className="space-y-3">
      {/* General */}
      <Section title="General" defaultOpen>
        <FormField label="Cluster Name" htmlFor="cluster-name">
          <input
            id="cluster-name"
            className="input-base font-mono"
            placeholder="talos-cluster"
            value={c.clusterName}
            onChange={(e) => onChange(patchCluster(config, { clusterName: e.target.value }))}
          />
        </FormField>
        <FormField
          label="Control Plane Endpoint"
          htmlFor="cp-endpoint"
          hint="URL of the control plane API server"
        >
          <input
            id="cp-endpoint"
            className="input-base font-mono"
            placeholder="https://192.168.1.100:6443"
            value={c.endpoint}
            onChange={(e) => onChange(patchCluster(config, { endpoint: e.target.value }))}
          />
        </FormField>
        <FormField label="Local API Server Port" htmlFor="local-api-port" hint="Port for the local kube-apiserver (default 6443)">
          <input
            id="local-api-port"
            className="input-base font-mono w-32"
            type="number"
            placeholder="6443"
            value={c.localAPIServerPort}
            onChange={(e) =>
              onChange(patchCluster(config, { localAPIServerPort: Number(e.target.value) || 6443 }))
            }
          />
        </FormField>
        <FormField
          label="Allow Scheduling on Control Planes"
          hint="Enable for single-node clusters"
          inline
        >
          <input
            type="checkbox"
            checked={c.allowSchedulingOnControlPlanes}
            onChange={(e) =>
              onChange(patchCluster(config, { allowSchedulingOnControlPlanes: e.target.checked }))
            }
            className="h-4 w-4 rounded border-slate-300 text-blue-600"
          />
        </FormField>
      </Section>

      {/* Network */}
      <Section title="Network" defaultOpen={false}>
        <FormField label="DNS Domain" htmlFor="dns-domain">
          <input
            id="dns-domain"
            className="input-base font-mono"
            placeholder="cluster.local"
            value={c.network.dnsDomain}
            onChange={(e) =>
              onChange(patchCluster(config, { network: { ...c.network, dnsDomain: e.target.value } }))
            }
          />
        </FormField>
        <ListEditor
          label="Pod Subnets"
          items={c.network.podSubnets}
          onChange={(podSubnets) =>
            onChange(patchCluster(config, { network: { ...c.network, podSubnets } }))
          }
          placeholder="10.244.0.0/16"
        />
        <ListEditor
          label="Service Subnets"
          items={c.network.serviceSubnets}
          onChange={(serviceSubnets) =>
            onChange(patchCluster(config, { network: { ...c.network, serviceSubnets } }))
          }
          placeholder="10.96.0.0/12"
        />
        <FormField label="CNI" htmlFor="cni-name">
          <select
            id="cni-name"
            className="input-base"
            value={c.network.cniName}
            onChange={(e) =>
              onChange(
                patchCluster(config, {
                  network: { ...c.network, cniName: e.target.value as 'flannel' | 'calico' | 'custom' | 'none' },
                })
              )
            }
          >
            <option value="flannel">flannel</option>
            <option value="calico">calico</option>
            <option value="custom">custom</option>
            <option value="none">none</option>
          </select>
        </FormField>
        {c.network.cniName === 'custom' && (
          <ListEditor
            label="CNI URLs"
            items={c.network.cniUrls}
            onChange={(cniUrls) =>
              onChange(patchCluster(config, { network: { ...c.network, cniUrls } }))
            }
            placeholder="https://example.com/cni.yaml"
          />
        )}
      </Section>

      {/* API Server */}
      <Section title="API Server" defaultOpen={false}>
        <FormField label="Image" htmlFor="api-server-image">
          <input
            id="api-server-image"
            className="input-base font-mono text-sm"
            value={c.apiServer.image}
            onChange={(e) =>
              onChange(patchCluster(config, { apiServer: { ...c.apiServer, image: e.target.value } }))
            }
          />
        </FormField>
        <ListEditor
          label="Certificate SANs"
          items={c.apiServer.certSANs}
          onChange={(certSANs) =>
            onChange(patchCluster(config, { apiServer: { ...c.apiServer, certSANs } }))
          }
          placeholder="192.168.1.100"
          hint="Additional IPs/hostnames to include in the API server certificate"
        />
        <KeyValueEditor
          label="Extra Args"
          items={c.apiServer.extraArgs}
          onChange={(extraArgs) =>
            onChange(patchCluster(config, { apiServer: { ...c.apiServer, extraArgs } }))
          }
        />
        <FormField label="Disable Pod Security Policy" inline>
          <input
            type="checkbox"
            checked={c.apiServer.disablePodSecurityPolicy}
            onChange={(e) =>
              onChange(
                patchCluster(config, {
                  apiServer: { ...c.apiServer, disablePodSecurityPolicy: e.target.checked },
                })
              )
            }
            className="h-4 w-4 rounded border-slate-300 text-blue-600"
          />
        </FormField>
      </Section>

      {/* Controller Manager */}
      <Section title="Controller Manager" defaultOpen={false}>
        <FormField label="Image" htmlFor="cm-image">
          <input
            id="cm-image"
            className="input-base font-mono text-sm"
            value={c.controllerManager.image}
            onChange={(e) =>
              onChange(
                patchCluster(config, {
                  controllerManager: { ...c.controllerManager, image: e.target.value },
                })
              )
            }
          />
        </FormField>
        <KeyValueEditor
          label="Extra Args"
          items={c.controllerManager.extraArgs}
          onChange={(extraArgs) =>
            onChange(
              patchCluster(config, { controllerManager: { ...c.controllerManager, extraArgs } })
            )
          }
        />
      </Section>

      {/* Scheduler */}
      <Section title="Scheduler" defaultOpen={false}>
        <FormField label="Image" htmlFor="sched-image">
          <input
            id="sched-image"
            className="input-base font-mono text-sm"
            value={c.scheduler.image}
            onChange={(e) =>
              onChange(patchCluster(config, { scheduler: { ...c.scheduler, image: e.target.value } }))
            }
          />
        </FormField>
        <KeyValueEditor
          label="Extra Args"
          items={c.scheduler.extraArgs}
          onChange={(extraArgs) =>
            onChange(patchCluster(config, { scheduler: { ...c.scheduler, extraArgs } }))
          }
        />
      </Section>

      {/* etcd */}
      <Section title="etcd" defaultOpen={false}>
        <FormField label="Image" htmlFor="etcd-image">
          <input
            id="etcd-image"
            className="input-base font-mono text-sm"
            value={c.etcd.image}
            onChange={(e) =>
              onChange(patchCluster(config, { etcd: { ...c.etcd, image: e.target.value } }))
            }
          />
        </FormField>
        <KeyValueEditor
          label="Extra Args"
          items={c.etcd.extraArgs}
          onChange={(extraArgs) =>
            onChange(patchCluster(config, { etcd: { ...c.etcd, extraArgs } }))
          }
        />
        <ListEditor
          label="Advertised Subnets"
          items={c.etcd.advertisedSubnets}
          onChange={(advertisedSubnets) =>
            onChange(patchCluster(config, { etcd: { ...c.etcd, advertisedSubnets } }))
          }
          placeholder="192.168.1.0/24"
          hint="Subnets to advertise etcd on (leave empty for all)"
        />
      </Section>

      {/* Discovery */}
      <Section title="Discovery" defaultOpen={false}>
        <FormField label="Enable Discovery" inline>
          <input
            type="checkbox"
            checked={c.discovery.enabled}
            onChange={(e) =>
              onChange(patchCluster(config, { discovery: { enabled: e.target.checked } }))
            }
            className="h-4 w-4 rounded border-slate-300 text-blue-600"
          />
        </FormField>
      </Section>

      {/* Proxy */}
      <Section title="kube-proxy" defaultOpen={false}>
        <FormField label="Disable kube-proxy" hint="Disable if using a CNI that manages proxy (e.g. Cilium)" inline>
          <input
            type="checkbox"
            checked={c.proxy.disabled}
            onChange={(e) =>
              onChange(patchCluster(config, { proxy: { ...c.proxy, disabled: e.target.checked } }))
            }
            className="h-4 w-4 rounded border-slate-300 text-blue-600"
          />
        </FormField>
        {!c.proxy.disabled && (
          <FormField label="Mode" htmlFor="proxy-mode">
            <select
              id="proxy-mode"
              className="input-base"
              value={c.proxy.mode}
              onChange={(e) =>
                onChange(
                  patchCluster(config, {
                    proxy: { ...c.proxy, mode: e.target.value as 'iptables' | 'ipvs' | 'nftables' },
                  })
                )
              }
            >
              <option value="iptables">iptables</option>
              <option value="ipvs">ipvs</option>
              <option value="nftables">nftables</option>
            </select>
          </FormField>
        )}
      </Section>

      {/* CoreDNS */}
      <Section title="CoreDNS" defaultOpen={false}>
        <FormField label="Disable CoreDNS" inline>
          <input
            type="checkbox"
            checked={c.coreDNS.disabled}
            onChange={(e) =>
              onChange(
                patchCluster(config, { coreDNS: { ...c.coreDNS, disabled: e.target.checked } })
              )
            }
            className="h-4 w-4 rounded border-slate-300 text-blue-600"
          />
        </FormField>
        {!c.coreDNS.disabled && (
          <FormField label="Image" htmlFor="coredns-image">
            <input
              id="coredns-image"
              className="input-base font-mono text-sm"
              value={c.coreDNS.image}
              onChange={(e) =>
                onChange(
                  patchCluster(config, { coreDNS: { ...c.coreDNS, image: e.target.value } })
                )
              }
            />
          </FormField>
        )}
      </Section>
    </div>
  )
}
