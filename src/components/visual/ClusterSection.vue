<script setup lang="ts">
import { computed, inject } from 'vue'
import { TalosConfig } from '../../types'
import { TalosVersion } from '../../versions'
import { ValidationError } from '../../utils/validation'
import AppSection from '../AppSection.vue'
import FormField from '../FormField.vue'
import KeyValueEditor from '../KeyValueEditor.vue'
import ListEditor from '../ListEditor.vue'

const props = defineProps<{
  config: TalosConfig
  version: TalosVersion
}>()

const emit = defineEmits<{
  (e: 'update:config', val: TalosConfig): void
}>()

const errorsMap = inject<{ value: Record<string, ValidationError> }>('errorsMap')
function fieldError(path: string): ValidationError | undefined {
  return errorsMap?.value?.[path]
}

function listItemErrors(prefix: string, count: number): Record<number, string> {
  const out: Record<number, string> = {}
  for (let i = 0; i < count; i++) {
    const e = fieldError(`${prefix}.${i}`)
    if (e) out[i] = e.message
  }
  return out
}

const c = computed(() => props.config.cluster)

function patchCluster(patch: Partial<TalosConfig['cluster']>) {
  emit('update:config', { ...props.config, cluster: { ...c.value, ...patch } })
}

const errorCount = computed(() => {
  const prefix = 'cluster.'
  return Object.keys(errorsMap?.value ?? {}).filter(
    (k) => k.startsWith(prefix) && errorsMap!.value[k].severity === 'error',
  ).length
})
</script>

<template>
  <div class="space-y-3">
    <!-- General -->
    <AppSection
      title="General"
      :default-open="true"
      :badge="errorCount > 0 ? `${errorCount} error${errorCount > 1 ? 's' : ''}` : undefined"
      badge-severity="error"
    >
      <FormField label="Cluster Name" html-for="cluster-name" :error="fieldError('cluster.clusterName')">
        <input
          id="cluster-name"
          class="input-base font-mono"
          :class="{ 'input-error': fieldError('cluster.clusterName') }"
          placeholder="talos-cluster"
          :value="c.clusterName"
          @input="patchCluster({ clusterName: ($event.target as HTMLInputElement).value })"
        />
      </FormField>

      <FormField
        label="Control Plane Endpoint"
        html-for="cp-endpoint"
        hint="https URL of the API server (required for controlplane nodes)"
        :error="fieldError('cluster.endpoint')"
      >
        <input
          id="cp-endpoint"
          class="input-base font-mono"
          :class="{ 'input-error': fieldError('cluster.endpoint')?.severity === 'error', 'input-warning': fieldError('cluster.endpoint')?.severity === 'warning' }"
          placeholder="https://192.168.1.100:6443"
          :value="c.endpoint"
          @input="patchCluster({ endpoint: ($event.target as HTMLInputElement).value })"
        />
      </FormField>

      <FormField
        label="Local API Server Port"
        html-for="local-api-port"
        hint="Port for the local kube-apiserver (default 6443)"
        :error="fieldError('cluster.localAPIServerPort')"
      >
        <input
          id="local-api-port"
          class="input-base font-mono w-32"
          type="number"
          placeholder="6443"
          :value="c.localAPIServerPort"
          @input="patchCluster({ localAPIServerPort: Number(($event.target as HTMLInputElement).value) || 6443 })"
        />
      </FormField>

      <FormField label="Allow Scheduling on Control Planes" hint="Enable for single-node clusters" :inline="true">
        <input
          type="checkbox"
          class="h-4 w-4 rounded border-border accent-primary cursor-pointer"
          :checked="c.allowSchedulingOnControlPlanes"
          @change="patchCluster({ allowSchedulingOnControlPlanes: ($event.target as HTMLInputElement).checked })"
        />
      </FormField>
    </AppSection>

    <!-- Network -->
    <AppSection title="Network" :default-open="false">
      <FormField label="DNS Domain" html-for="dns-domain" :error="fieldError('cluster.network.dnsDomain')">
        <input
          id="dns-domain"
          class="input-base font-mono"
          :class="{ 'input-error': fieldError('cluster.network.dnsDomain') }"
          placeholder="cluster.local"
          :value="c.network.dnsDomain"
          @input="patchCluster({ network: { ...c.network, dnsDomain: ($event.target as HTMLInputElement).value } })"
        />
      </FormField>

      <ListEditor
        label="Pod Subnets"
        :items="c.network.podSubnets"
        placeholder="10.244.0.0/16"
        :item-errors="listItemErrors('cluster.network.podSubnets', c.network.podSubnets.length)"
        @update:items="patchCluster({ network: { ...c.network, podSubnets: $event } })"
      />
      <ListEditor
        label="Service Subnets"
        :items="c.network.serviceSubnets"
        placeholder="10.96.0.0/12"
        :item-errors="listItemErrors('cluster.network.serviceSubnets', c.network.serviceSubnets.length)"
        @update:items="patchCluster({ network: { ...c.network, serviceSubnets: $event } })"
      />

      <FormField label="CNI" html-for="cni-name">
        <select
          id="cni-name"
          class="input-base"
          :value="c.network.cniName"
          @change="patchCluster({ network: { ...c.network, cniName: ($event.target as HTMLSelectElement).value as 'flannel' | 'calico' | 'custom' | 'none' } })"
        >
          <option value="flannel">flannel</option>
          <option value="calico">calico</option>
          <option value="custom">custom</option>
          <option value="none">none</option>
        </select>
      </FormField>

      <ListEditor
        v-if="c.network.cniName === 'custom'"
        label="CNI URLs"
        :items="c.network.cniUrls"
        placeholder="https://example.com/cni.yaml"
        @update:items="patchCluster({ network: { ...c.network, cniUrls: $event } })"
      />
    </AppSection>

    <!-- API Server -->
    <AppSection title="API Server" :default-open="false">
      <FormField label="Image" html-for="api-server-image" :error="fieldError('cluster.apiServer.image')">
        <input
          id="api-server-image"
          class="input-base font-mono text-sm"
          :class="{ 'input-error': fieldError('cluster.apiServer.image') }"
          :value="c.apiServer.image"
          @input="patchCluster({ apiServer: { ...c.apiServer, image: ($event.target as HTMLInputElement).value } })"
        />
      </FormField>
      <ListEditor
        label="Certificate SANs"
        :items="c.apiServer.certSANs"
        placeholder="192.168.1.100"
        hint="Additional IPs/hostnames for the API server certificate"
        :item-errors="listItemErrors('cluster.apiServer.certSANs', c.apiServer.certSANs.length)"
        @update:items="patchCluster({ apiServer: { ...c.apiServer, certSANs: $event } })"
      />
      <KeyValueEditor
        label="Extra Args"
        :items="c.apiServer.extraArgs"
        @update:items="patchCluster({ apiServer: { ...c.apiServer, extraArgs: $event } })"
      />
      <FormField label="Disable Pod Security Policy" :inline="true">
        <input
          type="checkbox"
          class="h-4 w-4 rounded border-border accent-primary cursor-pointer"
          :checked="c.apiServer.disablePodSecurityPolicy"
          @change="patchCluster({ apiServer: { ...c.apiServer, disablePodSecurityPolicy: ($event.target as HTMLInputElement).checked } })"
        />
      </FormField>
    </AppSection>

    <!-- Controller Manager -->
    <AppSection title="Controller Manager" :default-open="false">
      <FormField label="Image" :error="fieldError('cluster.controllerManager.image')">
        <input
          class="input-base font-mono text-sm"
          :class="{ 'input-error': fieldError('cluster.controllerManager.image') }"
          :value="c.controllerManager.image"
          @input="patchCluster({ controllerManager: { ...c.controllerManager, image: ($event.target as HTMLInputElement).value } })"
        />
      </FormField>
      <KeyValueEditor
        label="Extra Args"
        :items="c.controllerManager.extraArgs"
        @update:items="patchCluster({ controllerManager: { ...c.controllerManager, extraArgs: $event } })"
      />
    </AppSection>

    <!-- Scheduler -->
    <AppSection title="Scheduler" :default-open="false">
      <FormField label="Image" :error="fieldError('cluster.scheduler.image')">
        <input
          class="input-base font-mono text-sm"
          :class="{ 'input-error': fieldError('cluster.scheduler.image') }"
          :value="c.scheduler.image"
          @input="patchCluster({ scheduler: { ...c.scheduler, image: ($event.target as HTMLInputElement).value } })"
        />
      </FormField>
      <KeyValueEditor
        label="Extra Args"
        :items="c.scheduler.extraArgs"
        @update:items="patchCluster({ scheduler: { ...c.scheduler, extraArgs: $event } })"
      />
    </AppSection>

    <!-- etcd -->
    <AppSection title="etcd" :default-open="false">
      <FormField label="Image" :error="fieldError('cluster.etcd.image')">
        <input
          class="input-base font-mono text-sm"
          :class="{ 'input-error': fieldError('cluster.etcd.image') }"
          :value="c.etcd.image"
          @input="patchCluster({ etcd: { ...c.etcd, image: ($event.target as HTMLInputElement).value } })"
        />
      </FormField>
      <KeyValueEditor
        label="Extra Args"
        :items="c.etcd.extraArgs"
        @update:items="patchCluster({ etcd: { ...c.etcd, extraArgs: $event } })"
      />
      <ListEditor
        label="Advertised Subnets"
        :items="c.etcd.advertisedSubnets"
        placeholder="192.168.1.0/24"
        hint="Subnets to advertise etcd on (leave empty for all)"
        :item-errors="listItemErrors('cluster.etcd.advertisedSubnets', c.etcd.advertisedSubnets.length)"
        @update:items="patchCluster({ etcd: { ...c.etcd, advertisedSubnets: $event } })"
      />
    </AppSection>

    <!-- Discovery -->
    <AppSection title="Discovery" :default-open="false">
      <FormField label="Enable Discovery" :inline="true">
        <input
          type="checkbox"
          class="h-4 w-4 rounded border-border accent-primary cursor-pointer"
          :checked="c.discovery.enabled"
          @change="patchCluster({ discovery: { enabled: ($event.target as HTMLInputElement).checked } })"
        />
      </FormField>
    </AppSection>

    <!-- kube-proxy -->
    <AppSection title="kube-proxy" :default-open="false">
      <FormField label="Disable kube-proxy" hint="Disable if your CNI handles proxy rules (e.g. Cilium)" :inline="true">
        <input
          type="checkbox"
          class="h-4 w-4 rounded border-border accent-primary cursor-pointer"
          :checked="c.proxy.disabled"
          @change="patchCluster({ proxy: { ...c.proxy, disabled: ($event.target as HTMLInputElement).checked } })"
        />
      </FormField>

      <FormField v-if="!c.proxy.disabled" label="Mode" html-for="proxy-mode" :error="fieldError('cluster.proxy.mode')">
        <select
          id="proxy-mode"
          class="input-base"
          :value="c.proxy.mode"
          @change="patchCluster({ proxy: { ...c.proxy, mode: ($event.target as HTMLSelectElement).value as 'iptables' | 'ipvs' | 'nftables' } })"
        >
          <option value="iptables">iptables</option>
          <option value="ipvs">ipvs</option>
          <option v-if="version.supportedFeatures.proxyModeNftables" value="nftables">nftables</option>
        </select>
        <p v-if="!version.supportedFeatures.proxyModeNftables" class="text-xs text-muted mt-1">
          nftables requires Talos v1.7+
        </p>
      </FormField>
    </AppSection>

    <!-- CoreDNS -->
    <AppSection title="CoreDNS" :default-open="false">
      <FormField label="Disable CoreDNS" :inline="true">
        <input
          type="checkbox"
          class="h-4 w-4 rounded border-border accent-primary cursor-pointer"
          :checked="c.coreDNS.disabled"
          @change="patchCluster({ coreDNS: { ...c.coreDNS, disabled: ($event.target as HTMLInputElement).checked } })"
        />
      </FormField>
      <FormField v-if="!c.coreDNS.disabled" label="Image">
        <input
          class="input-base font-mono text-sm"
          :value="c.coreDNS.image"
          @input="patchCluster({ coreDNS: { ...c.coreDNS, image: ($event.target as HTMLInputElement).value } })"
        />
      </FormField>
    </AppSection>
  </div>
</template>
