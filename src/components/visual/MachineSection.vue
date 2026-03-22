<script setup lang="ts">
import { computed, inject } from 'vue'
import { TalosConfig, HardDisk } from '../../types'
import { TalosVersion } from '../../versions'
import { ValidationError } from '../../utils/validation'
import { nextId } from '../../defaults'
import AppSection from '../AppSection.vue'
import FormField from '../FormField.vue'
import KeyValueEditor from '../KeyValueEditor.vue'
import ListEditor from '../ListEditor.vue'
import InterfaceEditor from './InterfaceEditor.vue'
import DiskPartitionEditor from './DiskPartitionEditor.vue'

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

function nsErrors(): Record<number, string> {
  const out: Record<number, string> = {}
  props.config.machine.network.nameservers.forEach((_, i) => {
    const e = fieldError(`machine.network.nameservers.${i}`)
    if (e) out[i] = e.message
  })
  return out
}

const m = computed(() => props.config.machine)
const hardware = computed(() => m.value.hardware ?? { disks: [] })

function patchMachine(patch: Partial<TalosConfig['machine']>) {
  emit('update:config', { ...props.config, machine: { ...m.value, ...patch } })
}

function patchHardware(patch: Partial<NonNullable<TalosConfig['machine']['hardware']>>) {
  patchMachine({ hardware: { ...hardware.value, ...patch } })
}

// Hardware disk CRUD
function addDisk() {
  patchHardware({ disks: [...hardware.value.disks, { _id: nextId(), name: '', size: 0 }] })
}

function removeDisk(id: string) {
  patchHardware({ disks: hardware.value.disks.filter((d) => d._id !== id) })
}

function patchDisk(id: string, patch: Partial<HardDisk>) {
  patchHardware({
    disks: hardware.value.disks.map((d) => (d._id === id ? { ...d, ...patch } : d)),
  })
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

    <!-- Hardware -->
    <AppSection
      title="Hardware"
      :default-open="false"
      :badge="hardware.disks.length > 0 ? `${hardware.disks.length} disk${hardware.disks.length > 1 ? 's' : ''}` : undefined"
      badge-severity="info"
    >
      <!-- Disks -->
      <div>
        <div class="flex items-center justify-between mb-2">
          <span class="text-sm font-medium text-text">Disks</span>
          <button type="button" class="btn-ghost text-xs py-0.5 px-2" @click="addDisk">
            + Add Disk
          </button>
        </div>
        <p v-if="hardware.disks.length === 0" class="text-xs text-muted italic mb-0">
          Define your disks to enable scaled partition visualization in the Install section.
        </p>
        <div class="space-y-2">
          <div
            v-for="disk in hardware.disks"
            :key="disk._id"
            class="flex gap-2 items-center"
          >
            <input
              class="input-base font-mono text-xs flex-1"
              placeholder="/dev/sda"
              :value="disk.name"
              @input="patchDisk(disk._id, { name: ($event.target as HTMLInputElement).value })"
            />
            <div class="flex items-center gap-1 flex-shrink-0">
              <input
                class="input-base font-mono text-xs"
                style="width: 80px"
                type="number"
                min="1"
                placeholder="size"
                :value="disk.size || ''"
                @input="patchDisk(disk._id, { size: Number(($event.target as HTMLInputElement).value) })"
              />
              <span class="text-xs text-muted">GiB</span>
            </div>
            <button
              type="button"
              class="text-muted hover:text-red transition-colors flex-shrink-0"
              @click="removeDisk(disk._id)"
            >
              <svg
                class="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- Network interfaces summary -->
      <div class="pt-3 mt-1 border-t border-border/50 flex items-center justify-between">
        <span class="text-xs text-muted">Network Interfaces</span>
        <span class="text-xs text-muted">
          {{ m.network.interfaces.length > 0 ? `${m.network.interfaces.length} configured` : 'none — configure in Network section' }}
        </span>
      </div>
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
        hint="Device path for Talos OS installation"
        :error="fieldError('machine.install.disk')"
      >
        <input
          id="install-disk"
          list="hardware-disk-list"
          class="input-base font-mono"
          :class="{ 'input-error': fieldError('machine.install.disk') }"
          placeholder="/dev/sda"
          :value="m.install.disk"
          @input="patchMachine({ install: { ...m.install, disk: ($event.target as HTMLInputElement).value } })"
        />
        <datalist id="hardware-disk-list">
          <option v-for="disk in hardware.disks" :key="disk._id" :value="disk.name">
            {{ disk.name }} ({{ disk.size }} GiB)
          </option>
        </datalist>
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

      <!-- Partition layout editor (version-gated) -->
      <div class="pt-3 mt-1 border-t border-border/50">
        <DiskPartitionEditor
          :install-disk="m.install.disk"
          :disks="hardware.disks"
          :user-volumes="m.userVolumes"
          :supported="version.supportedFeatures.userVolumes"
          @update:user-volumes="patchMachine({ userVolumes: $event })"
        />
      </div>
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
  </div>
</template>
