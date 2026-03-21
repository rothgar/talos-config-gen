<script setup lang="ts">
import { NetworkInterface, NetworkRoute } from '../../types'
import { nextId } from '../../defaults'

const props = defineProps<{
  interfaces: NetworkInterface[]
}>()

const emit = defineEmits<{
  (e: 'update:interfaces', val: NetworkInterface[]): void
}>()

function updateInterfaces(val: NetworkInterface[]) {
  emit('update:interfaces', val)
}

function addInterface() {
  updateInterfaces([
    ...props.interfaces,
    { _id: nextId(), interface: '', dhcp: true, addresses: [], routes: [] },
  ])
}

function removeInterface(id: string) {
  updateInterfaces(props.interfaces.filter((i) => i._id !== id))
}

function patchInterface(id: string, patch: Partial<NetworkInterface>) {
  updateInterfaces(props.interfaces.map((i) => (i._id === id ? { ...i, ...patch } : i)))
}

function addAddress(ifaceId: string) {
  const iface = props.interfaces.find((i) => i._id === ifaceId)!
  patchInterface(ifaceId, { addresses: [...iface.addresses, ''] })
}

function removeAddress(ifaceId: string, idx: number) {
  const iface = props.interfaces.find((i) => i._id === ifaceId)!
  patchInterface(ifaceId, { addresses: iface.addresses.filter((_, i) => i !== idx) })
}

function updateAddress(ifaceId: string, idx: number, value: string) {
  const iface = props.interfaces.find((i) => i._id === ifaceId)!
  patchInterface(ifaceId, { addresses: iface.addresses.map((a, i) => (i === idx ? value : a)) })
}

function addRoute(ifaceId: string) {
  const iface = props.interfaces.find((i) => i._id === ifaceId)!
  patchInterface(ifaceId, {
    routes: [...iface.routes, { _id: nextId(), network: '', gateway: '' }],
  })
}

function removeRoute(ifaceId: string, routeId: string) {
  const iface = props.interfaces.find((i) => i._id === ifaceId)!
  patchInterface(ifaceId, { routes: iface.routes.filter((r) => r._id !== routeId) })
}

function patchRoute(ifaceId: string, routeId: string, patch: Partial<NetworkRoute>) {
  const iface = props.interfaces.find((i) => i._id === ifaceId)!
  patchInterface(ifaceId, {
    routes: iface.routes.map((r) => (r._id === routeId ? { ...r, ...patch } : r)),
  })
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-2">
      <span class="text-sm font-medium text-text">Network Interfaces</span>
      <button type="button" class="btn-ghost text-xs py-0.5 px-2" @click="addInterface">
        + Add Interface
      </button>
    </div>
    <p v-if="interfaces.length === 0" class="text-xs text-muted italic">
      No interfaces configured. DHCP will be used by default.
    </p>

    <div class="space-y-3">
      <div
        v-for="iface in interfaces"
        :key="iface._id"
        class="rounded border border-border bg-surface p-3 space-y-2.5"
      >
        <!-- Name + DHCP toggle -->
        <div class="flex items-center gap-2">
          <input
            class="input-base flex-1 font-mono text-xs"
            placeholder="eth0"
            :value="iface.interface"
            @input="patchInterface(iface._id, { interface: ($event.target as HTMLInputElement).value })"
          />
          <label class="flex items-center gap-1.5 text-xs text-muted select-none cursor-pointer flex-shrink-0">
            <input
              type="checkbox"
              :checked="iface.dhcp"
              class="h-3.5 w-3.5 rounded border-border accent-primary"
              @change="patchInterface(iface._id, { dhcp: ($event.target as HTMLInputElement).checked })"
            />
            DHCP
          </label>
          <button
            type="button"
            class="text-muted hover:text-red transition-colors flex-shrink-0"
            @click="removeInterface(iface._id)"
          >
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Static addresses -->
        <div v-if="!iface.dhcp" class="pl-3 border-l-2 border-border space-y-1.5">
          <div class="flex items-center justify-between">
            <span class="text-xs text-muted">Addresses (CIDR)</span>
            <button type="button" class="btn-ghost text-xs py-0 px-1.5" @click="addAddress(iface._id)">
              + Add
            </button>
          </div>
          <div v-for="(addr, idx) in iface.addresses" :key="idx" class="flex gap-2">
            <input
              class="input-base flex-1 font-mono text-xs"
              placeholder="192.168.1.100/24"
              :value="addr"
              @input="updateAddress(iface._id, idx, ($event.target as HTMLInputElement).value)"
            />
            <button
              type="button"
              class="text-muted hover:text-red transition-colors flex-shrink-0"
              @click="removeAddress(iface._id, idx)"
            >
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Routes -->
        <div class="pl-3 border-l-2 border-border space-y-1.5">
          <div class="flex items-center justify-between">
            <span class="text-xs text-muted">Routes</span>
            <button type="button" class="btn-ghost text-xs py-0 px-1.5" @click="addRoute(iface._id)">
              + Add
            </button>
          </div>
          <div
            v-for="route in iface.routes"
            :key="route._id"
            class="grid grid-cols-[1fr_1fr_5rem_auto] gap-1.5 items-center"
          >
            <input
              class="input-base font-mono text-xs"
              placeholder="0.0.0.0/0"
              :value="route.network"
              @input="patchRoute(iface._id, route._id, { network: ($event.target as HTMLInputElement).value })"
            />
            <input
              class="input-base font-mono text-xs"
              placeholder="gateway"
              :value="route.gateway"
              @input="patchRoute(iface._id, route._id, { gateway: ($event.target as HTMLInputElement).value })"
            />
            <input
              class="input-base font-mono text-xs"
              placeholder="metric"
              type="number"
              :value="route.metric ?? ''"
              @input="patchRoute(iface._id, route._id, { metric: ($event.target as HTMLInputElement).value ? Number(($event.target as HTMLInputElement).value) : undefined })"
            />
            <button
              type="button"
              class="text-muted hover:text-red transition-colors"
              @click="removeRoute(iface._id, route._id)"
            >
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <!-- MTU + VIP -->
        <div class="flex gap-2">
          <div class="flex-1">
            <label class="text-xs text-muted block mb-1">MTU</label>
            <input
              class="input-base font-mono text-xs"
              placeholder="1500"
              type="number"
              :value="iface.mtu ?? ''"
              @input="patchInterface(iface._id, { mtu: ($event.target as HTMLInputElement).value ? Number(($event.target as HTMLInputElement).value) : undefined })"
            />
          </div>
          <div class="flex-1">
            <label class="text-xs text-muted block mb-1">VIP</label>
            <input
              class="input-base font-mono text-xs"
              placeholder="192.168.1.50"
              :value="iface.vip ?? ''"
              @input="patchInterface(iface._id, { vip: ($event.target as HTMLInputElement).value || undefined })"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
