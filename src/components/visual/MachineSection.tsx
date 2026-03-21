import { TalosConfig } from '../../types'
import Section from '../Section'
import FormField from '../FormField'
import KeyValueEditor from '../KeyValueEditor'
import ListEditor from '../ListEditor'
import InterfaceEditor from './InterfaceEditor'
import UserVolumeEditor from './UserVolumeEditor'

interface MachineSectionProps {
  config: TalosConfig
  onChange: (config: TalosConfig) => void
}

type M = TalosConfig['machine']

function patchMachine(config: TalosConfig, patch: Partial<M>): TalosConfig {
  return { ...config, machine: { ...config.machine, ...patch } }
}

export default function MachineSection({ config, onChange }: MachineSectionProps) {
  const m = config.machine

  return (
    <div className="space-y-3">
      {/* General */}
      <Section title="General" defaultOpen>
        <FormField label="Machine Type" htmlFor="machine-type">
          <select
            id="machine-type"
            className="input-base"
            value={m.type}
            onChange={(e) =>
              onChange(patchMachine(config, { type: e.target.value as 'controlplane' | 'worker' }))
            }
          >
            <option value="controlplane">controlplane</option>
            <option value="worker">worker</option>
          </select>
        </FormField>
        <FormField label="Hostname" htmlFor="hostname" hint="Leave blank to use the default">
          <input
            id="hostname"
            className="input-base font-mono"
            placeholder="my-node"
            value={m.network.hostname}
            onChange={(e) =>
              onChange(
                patchMachine(config, {
                  network: { ...m.network, hostname: e.target.value },
                })
              )
            }
          />
        </FormField>
      </Section>

      {/* Network */}
      <Section title="Network" defaultOpen={false}>
        <InterfaceEditor
          interfaces={m.network.interfaces}
          onChange={(interfaces) =>
            onChange(patchMachine(config, { network: { ...m.network, interfaces } }))
          }
        />
        <ListEditor
          label="Nameservers"
          items={m.network.nameservers}
          onChange={(nameservers) =>
            onChange(patchMachine(config, { network: { ...m.network, nameservers } }))
          }
          placeholder="1.1.1.1"
        />
        <ListEditor
          label="Search Domains"
          items={m.network.searchDomains}
          onChange={(searchDomains) =>
            onChange(patchMachine(config, { network: { ...m.network, searchDomains } }))
          }
          placeholder="example.com"
        />
      </Section>

      {/* Install */}
      <Section title="Install" defaultOpen={false}>
        <FormField label="Install Disk" htmlFor="install-disk">
          <input
            id="install-disk"
            className="input-base font-mono"
            placeholder="/dev/sda"
            value={m.install.disk}
            onChange={(e) =>
              onChange(patchMachine(config, { install: { ...m.install, disk: e.target.value } }))
            }
          />
        </FormField>
        <FormField label="Installer Image" htmlFor="install-image">
          <input
            id="install-image"
            className="input-base font-mono text-sm"
            value={m.install.image}
            onChange={(e) =>
              onChange(patchMachine(config, { install: { ...m.install, image: e.target.value } }))
            }
          />
        </FormField>
        <div className="flex flex-wrap gap-4">
          <FormField label="Bootloader" inline>
            <input
              type="checkbox"
              id="bootloader"
              checked={m.install.bootloader}
              onChange={(e) =>
                onChange(
                  patchMachine(config, { install: { ...m.install, bootloader: e.target.checked } })
                )
              }
              className="h-4 w-4 rounded border-slate-300 text-blue-600"
            />
          </FormField>
          <FormField label="Wipe Disk" hint="Wipe the disk before install" inline>
            <input
              type="checkbox"
              id="wipe"
              checked={m.install.wipe}
              onChange={(e) =>
                onChange(patchMachine(config, { install: { ...m.install, wipe: e.target.checked } }))
              }
              className="h-4 w-4 rounded border-slate-300 text-blue-600"
            />
          </FormField>
        </div>
        <ListEditor
          label="Extra Kernel Args"
          items={m.install.extraKernelArgs}
          onChange={(extraKernelArgs) =>
            onChange(patchMachine(config, { install: { ...m.install, extraKernelArgs } }))
          }
          placeholder="console=ttyS0"
        />
      </Section>

      {/* Kubelet */}
      <Section title="Kubelet" defaultOpen={false}>
        <FormField label="Kubelet Image" htmlFor="kubelet-image">
          <input
            id="kubelet-image"
            className="input-base font-mono text-sm"
            value={m.kubelet.image}
            onChange={(e) =>
              onChange(patchMachine(config, { kubelet: { ...m.kubelet, image: e.target.value } }))
            }
          />
        </FormField>
        <KeyValueEditor
          label="Extra Args"
          items={m.kubelet.extraArgs}
          onChange={(extraArgs) =>
            onChange(patchMachine(config, { kubelet: { ...m.kubelet, extraArgs } }))
          }
          keyPlaceholder="rotate-server-certificates"
          valuePlaceholder="true"
        />
        <ListEditor
          label="Cluster DNS"
          items={m.kubelet.clusterDNS}
          onChange={(clusterDNS) =>
            onChange(patchMachine(config, { kubelet: { ...m.kubelet, clusterDNS } }))
          }
          placeholder="10.96.0.10"
          hint="Override cluster DNS IP (leave empty to use default)"
        />
      </Section>

      {/* Features */}
      <Section title="Features" defaultOpen={false}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(
            [
              ['rbac', 'RBAC', 'Enable role-based access control'],
              ['stableHostname', 'Stable Hostname', 'Use a stable machine hostname'],
              ['apidCheckExtKeyUsage', 'Check Ext Key Usage', 'Check x509 certificate key usage'],
              ['diskQuotaSupport', 'Disk Quota Support', 'Enable disk quota support'],
            ] as const
          ).map(([key, label, hint]) => (
            <FormField key={key} label={label} hint={hint} inline>
              <input
                type="checkbox"
                checked={m.features[key]}
                onChange={(e) =>
                  onChange(
                    patchMachine(config, { features: { ...m.features, [key]: e.target.checked } })
                  )
                }
                className="h-4 w-4 rounded border-slate-300 text-blue-600"
              />
            </FormField>
          ))}
        </div>
      </Section>

      {/* Environment Variables */}
      <Section
        title="Environment Variables"
        defaultOpen={false}
        badge={m.env.length > 0 ? String(m.env.length) : undefined}
      >
        <KeyValueEditor
          label="Variables"
          items={m.env}
          onChange={(env) => onChange(patchMachine(config, { env }))}
          keyPlaceholder="VARIABLE_NAME"
          valuePlaceholder="value"
        />
      </Section>

      {/* Sysctls */}
      <Section
        title="Sysctls"
        defaultOpen={false}
        badge={m.sysctls.length > 0 ? String(m.sysctls.length) : undefined}
      >
        <KeyValueEditor
          label="Kernel Parameters"
          items={m.sysctls}
          onChange={(sysctls) => onChange(patchMachine(config, { sysctls }))}
          keyPlaceholder="net.ipv4.ip_forward"
          valuePlaceholder="1"
        />
      </Section>

      {/* User Volumes */}
      <Section
        title="User Volumes"
        defaultOpen={false}
        badge={m.userVolumes.length > 0 ? String(m.userVolumes.length) : undefined}
      >
        <UserVolumeEditor
          volumes={m.userVolumes}
          onChange={(userVolumes) => onChange(patchMachine(config, { userVolumes }))}
        />
      </Section>
    </div>
  )
}
