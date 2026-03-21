<script setup lang="ts">
import { computed, inject } from 'vue'
import { TalosConfig } from '../../types'
import { TalosVersion } from '../../versions'
import { ValidationError } from '../../utils/validation'
import AppSection from '../AppSection.vue'
import FormField from '../FormField.vue'
import KeyValueEditor from '../KeyValueEditor.vue'
import ListEditor from '../ListEditor.vue'
import InterfaceEditor from './InterfaceEditor.vue'
import UserVolumeEditor from './UserVolumeEditor.vue'

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

// Helpers to produce item-level errors from the map for list/interface fields
function nsErrors(): Record<number, string> {
  const out: Record<number, string> = {}
  props.config.machine.network.nameservers.forEach((_, i) => {
    const e = fieldError(`machine.network.nameservers.${i}`)
    if (e) out[i] = e.message
  })
  return out
}

const m = computed(() => props.config.machine)

function patchMachine(patch: Partial<TalosConfig['machine']>) {
  emit('update:config', { ...props.config, machine: { ...m.value, ...patch } })
}

const errorCount = computed(() => {
  const prefix = 'machine.'
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
      <FormField label="Machine Type" html-for="machine-type">
        <select
          id="machine-type"
          class="input-base"
          :value="m.type"
          @change="patchMachine({ type: ($event.target as HTMLSelectElement).value as 'controlplane' | 'worker' })"
        >
          <option value="controlplane">controlplane</option>
          <option value="worker">worker</option>
        </select>
      </FormField>

      <FormField
        label="Hostname"
        html-for="hostname"
        hint="Leave blank to auto-derive from node identity"
        :error="fieldError('machine.network.hostname')"
      >
        <input
          id="hostname"
          class="input-base font-mono"
          :class="{ 'input-error': fieldError('machine.network.hostname')?.severity === 'error', 'input-warning': fieldError('machine.network.hostname')?.severity === 'warning' }"
          placeholder="my-node"
          :value="m.network.hostname"
          @input="patchMachine({ network: { ...m.network, hostname: ($event.target as HTMLInputElement).value } })"
        />
      </FormField>
    </AppSection>

    <!-- Network -->
    <AppSection title="Network" :default-open="false">
      <InterfaceEditor
        :interfaces="m.network.interfaces"
        @update:interfaces="patchMachine({ network: { ...m.network, interfaces: $event } })"
      />
      <ListEditor
        label="Nameservers"
        :items="m.network.nameservers"
        placeholder="1.1.1.1"
        :item-errors="nsErrors()"
        @update:items="patchMachine({ network: { ...m.network, nameservers: $event } })"
      />
      <ListEditor
        label="Search Domains"
        :items="m.network.searchDomains"
        placeholder="example.com"
        @update:items="patchMachine({ network: { ...m.network, searchDomains: $event } })"
      />
    </AppSection>

    <!-- Install -->
    <AppSection title="Install" :default-open="false">
      <FormField
        label="Install Disk"
        html-for="install-disk"
        :error="fieldError('machine.install.disk')"
      >
        <input
          id="install-disk"
          class="input-base font-mono"
          :class="{ 'input-error': fieldError('machine.install.disk') }"
          placeholder="/dev/sda"
          :value="m.install.disk"
          @input="patchMachine({ install: { ...m.install, disk: ($event.target as HTMLInputElement).value } })"
        />
      </FormField>

      <FormField
        label="Installer Image"
        html-for="install-image"
        :error="fieldError('machine.install.image')"
      >
        <input
          id="install-image"
          class="input-base font-mono text-sm"
          :class="{ 'input-error': fieldError('machine.install.image') }"
          :value="m.install.image"
          @input="patchMachine({ install: { ...m.install, image: ($event.target as HTMLInputElement).value } })"
        />
      </FormField>

      <div class="flex flex-wrap gap-4">
        <FormField label="Bootloader" :inline="true">
          <input
            type="checkbox"
            class="h-4 w-4 rounded border-border accent-primary cursor-pointer"
            :checked="m.install.bootloader"
            @change="patchMachine({ install: { ...m.install, bootloader: ($event.target as HTMLInputElement).checked } })"
          />
        </FormField>
        <FormField label="Wipe Disk" hint="Wipe disk before install" :inline="true">
          <input
            type="checkbox"
            class="h-4 w-4 rounded border-border accent-primary cursor-pointer"
            :checked="m.install.wipe"
            @change="patchMachine({ install: { ...m.install, wipe: ($event.target as HTMLInputElement).checked } })"
          />
        </FormField>
      </div>

      <ListEditor
        label="Extra Kernel Args"
        :items="m.install.extraKernelArgs"
        placeholder="console=ttyS0"
        @update:items="patchMachine({ install: { ...m.install, extraKernelArgs: $event } })"
      />
    </AppSection>

    <!-- Kubelet -->
    <AppSection title="Kubelet" :default-open="false">
      <FormField
        label="Kubelet Image"
        html-for="kubelet-image"
        :error="fieldError('machine.kubelet.image')"
      >
        <input
          id="kubelet-image"
          class="input-base font-mono text-sm"
          :class="{ 'input-error': fieldError('machine.kubelet.image') }"
          :value="m.kubelet.image"
          @input="patchMachine({ kubelet: { ...m.kubelet, image: ($event.target as HTMLInputElement).value } })"
        />
      </FormField>
      <KeyValueEditor
        label="Extra Args"
        :items="m.kubelet.extraArgs"
        key-placeholder="rotate-server-certificates"
        value-placeholder="true"
        @update:items="patchMachine({ kubelet: { ...m.kubelet, extraArgs: $event } })"
      />
      <ListEditor
        label="Cluster DNS"
        :items="m.kubelet.clusterDNS"
        placeholder="10.96.0.10"
        hint="Override cluster DNS IP (leave empty to use default)"
        @update:items="patchMachine({ kubelet: { ...m.kubelet, clusterDNS: $event } })"
      />
    </AppSection>

    <!-- Features -->
    <AppSection title="Features" :default-open="false">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <FormField label="RBAC" hint="Enable role-based access control" :inline="true">
          <input
            type="checkbox"
            class="h-4 w-4 rounded border-border accent-primary cursor-pointer"
            :checked="m.features.rbac"
            @change="patchMachine({ features: { ...m.features, rbac: ($event.target as HTMLInputElement).checked } })"
          />
        </FormField>

        <FormField
          label="Stable Hostname"
          hint="Use a stable machine hostname"
          :inline="true"
        >
          <input
            type="checkbox"
            class="h-4 w-4 rounded border-border accent-primary cursor-pointer"
            :checked="m.features.stableHostname"
            @change="patchMachine({ features: { ...m.features, stableHostname: ($event.target as HTMLInputElement).checked } })"
          />
        </FormField>

        <FormField
          label="Check Ext Key Usage"
          hint="Check x509 certificate extended key usage"
          :inline="true"
        >
          <input
            type="checkbox"
            class="h-4 w-4 rounded border-border accent-primary cursor-pointer"
            :checked="m.features.apidCheckExtKeyUsage"
            @change="patchMachine({ features: { ...m.features, apidCheckExtKeyUsage: ($event.target as HTMLInputElement).checked } })"
          />
        </FormField>

        <!-- Version-gated: diskQuotaSupport -->
        <template v-if="version.supportedFeatures.diskQuotaSupport">
          <FormField
            label="Disk Quota Support"
            :inline="true"
            :error="fieldError('machine.features.diskQuotaSupport')"
          >
            <input
              type="checkbox"
              class="h-4 w-4 rounded border-border accent-primary cursor-pointer"
              :checked="m.features.diskQuotaSupport"
              @change="patchMachine({ features: { ...m.features, diskQuotaSupport: ($event.target as HTMLInputElement).checked } })"
            />
          </FormField>
        </template>
        <div v-else class="flex items-center gap-2 col-span-1">
          <span class="text-xs text-muted line-through">Disk Quota Support</span>
          <span class="badge badge-warning">Requires v1.6+</span>
        </div>
      </div>
    </AppSection>

    <!-- Environment Variables -->
    <AppSection
      title="Environment Variables"
      :default-open="false"
      :badge="m.env.length > 0 ? String(m.env.length) : undefined"
      badge-severity="info"
    >
      <KeyValueEditor
        label="Variables"
        :items="m.env"
        key-placeholder="VARIABLE_NAME"
        value-placeholder="value"
        @update:items="patchMachine({ env: $event })"
      />
    </AppSection>

    <!-- Sysctls -->
    <AppSection
      title="Sysctls"
      :default-open="false"
      :badge="m.sysctls.length > 0 ? String(m.sysctls.length) : undefined"
      badge-severity="info"
    >
      <KeyValueEditor
        label="Kernel Parameters"
        :items="m.sysctls"
        key-placeholder="net.ipv4.ip_forward"
        value-placeholder="1"
        @update:items="patchMachine({ sysctls: $event })"
      />
    </AppSection>

    <!-- User Volumes (version-gated) -->
    <template v-if="version.supportedFeatures.userVolumes">
      <AppSection
        title="User Volumes"
        :default-open="false"
        :badge="m.userVolumes.length > 0 ? String(m.userVolumes.length) : undefined"
        badge-severity="info"
      >
        <UserVolumeEditor
          :volumes="m.userVolumes"
          @update:volumes="patchMachine({ userVolumes: $event })"
        />
      </AppSection>
    </template>
    <div v-else class="rounded border border-border/50 bg-surface-2 px-4 py-3 flex items-center justify-between">
      <span class="text-sm font-medium text-muted">User Volumes</span>
      <span class="badge badge-warning">Requires Talos v1.8+</span>
    </div>
  </div>
</template>
