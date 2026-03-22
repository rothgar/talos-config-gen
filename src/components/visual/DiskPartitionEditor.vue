<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { UserVolume, HardDisk } from '../../types'
import { nextId } from '../../defaults'

const props = defineProps<{
  installDisk: string
  disks: HardDisk[]
  userVolumes: UserVolume[]
  supported: boolean
}>()

const emit = defineEmits<{
  'update:userVolumes': [UserVolume[]]
}>()

// ---------------------------------------------------------------------------
// Size helpers
// ---------------------------------------------------------------------------
function parseSizeToMiB(size: string): number {
  if (!size) return 0
  const m = size.trim().match(/^(\d+(?:\.\d+)?)\s*(GiB|GB|MiB|MB|TiB|TB|KiB|KB)?$/i)
  if (!m) return 0
  const n = parseFloat(m[1])
  const u = (m[2] || 'GiB').toLowerCase()
  if (u === 'tib' || u === 'tb') return n * 1024 * 1024
  if (u === 'gib' || u === 'gb') return n * 1024
  if (u === 'mib' || u === 'mb') return n
  if (u === 'kib' || u === 'kb') return n / 1024
  return n * 1024
}

function formatMiB(mib: number): string {
  if (mib <= 0) return '0 MiB'
  if (mib >= 1024) {
    const gib = mib / 1024
    return `${Number.isInteger(gib) ? gib : gib.toFixed(1)} GiB`
  }
  return `${Math.round(mib)} MiB`
}

function sizeGiB(vol: UserVolume): number {
  const mib = parseSizeToMiB(vol.maxSize || vol.minSize)
  return mib ? Math.round(mib / 1024) : 10
}

function setSizeGiB(id: string, gib: number) {
  const s = `${Math.max(1, gib)}GiB`
  patchVolume(id, { minSize: s, maxSize: s })
}

// ---------------------------------------------------------------------------
// Fixed Talos partition sizes (MiB)
// EFI=100, BIOS=1, BOOT=1024, META=1 → combined as "SYSTEM"
// ---------------------------------------------------------------------------
const SYSTEM_MIB = 1126  // 100+1+1024+1
const STATE_MIB = 100

// ---------------------------------------------------------------------------
// Partition grouping: "system disk" volumes are those targeting the install disk
// ---------------------------------------------------------------------------
const systemVolumes = computed(() =>
  props.userVolumes.filter(
    (v) =>
      v.name &&
      (v.diskSelectorMatch === 'system_disk' ||
        (v.diskSelectorName && v.diskSelectorName === props.installDisk)),
  ),
)

const otherVolumes = computed(() =>
  props.userVolumes.filter(
    (v) =>
      !(
        v.diskSelectorMatch === 'system_disk' ||
        (v.diskSelectorName && v.diskSelectorName === props.installDisk)
      ),
  ),
)

// ---------------------------------------------------------------------------
// Disk size
// ---------------------------------------------------------------------------
const diskSizeGiB = computed(() => {
  const d = props.disks.find((d) => d.name === props.installDisk)
  return d?.size ?? 0
})
const diskSizeMiB = computed(() => diskSizeGiB.value * 1024)

const userUsedMiB = computed(() =>
  systemVolumes.value.reduce((sum, v) => sum + parseSizeToMiB(v.maxSize || v.minSize), 0),
)

const ephemeralMiB = computed(() => {
  if (!diskSizeMiB.value) return 0
  return Math.max(0, diskSizeMiB.value - SYSTEM_MIB - STATE_MIB - userUsedMiB.value)
})

// ---------------------------------------------------------------------------
// Partition bar segments
// ---------------------------------------------------------------------------
const USER_COLORS = [
  'bg-teal-600',
  'bg-orange-500',
  'bg-rose-600',
  'bg-cyan-600',
  'bg-amber-600',
  'bg-emerald-600',
  'bg-pink-600',
  'bg-indigo-500',
]

interface Segment {
  key: string
  label: string
  sublabel: string
  sizeMiB: number
  fixed: boolean
  colorClass: string
  volume?: UserVolume
}

const segments = computed((): Segment[] => [
  {
    key: '__system',
    label: 'SYSTEM',
    sublabel: formatMiB(SYSTEM_MIB),
    sizeMiB: SYSTEM_MIB,
    fixed: true,
    colorClass: 'bg-slate-600',
  },
  {
    key: '__state',
    label: 'STATE',
    sublabel: formatMiB(STATE_MIB),
    sizeMiB: STATE_MIB,
    fixed: true,
    colorClass: 'bg-violet-700',
  },
  ...systemVolumes.value.map(
    (v, i): Segment => ({
      key: v._id,
      label: v.name || 'unnamed',
      sublabel: formatMiB(parseSizeToMiB(v.maxSize || v.minSize)),
      sizeMiB: parseSizeToMiB(v.maxSize || v.minSize),
      fixed: false,
      colorClass: USER_COLORS[i % USER_COLORS.length],
      volume: v,
    }),
  ),
  {
    key: '__ephemeral',
    label: 'EPHEMERAL',
    sublabel: diskSizeMiB.value ? formatMiB(ephemeralMiB.value) : 'remaining',
    sizeMiB: ephemeralMiB.value || 1,
    fixed: true,
    colorClass: 'bg-zinc-600',
  },
])

function widthPct(seg: Segment): string {
  if (!diskSizeMiB.value) {
    return `${100 / segments.value.length}%`
  }
  const pct = (seg.sizeMiB / diskSizeMiB.value) * 100
  return `${Math.max(5, pct)}%`
}

// ---------------------------------------------------------------------------
// Selection
// ---------------------------------------------------------------------------
const selectedId = ref<string | null>(null)
const selectedVolume = computed(() =>
  selectedId.value
    ? systemVolumes.value.find((v) => v._id === selectedId.value) ?? null
    : null,
)

// Clear selection if volume is removed
watch(
  () => props.userVolumes,
  (vols) => {
    if (selectedId.value && !vols.find((v) => v._id === selectedId.value)) {
      selectedId.value = null
    }
  },
)

function selectPartition(seg: Segment) {
  if (seg.fixed) return
  selectedId.value = selectedId.value === seg.key ? null : seg.key
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------
function addPartition() {
  const id = nextId()
  const newVol: UserVolume = {
    _id: id,
    name: '',
    minSize: '10GiB',
    maxSize: '10GiB',
    diskSelectorSize: '',
    diskSelectorName: '',
    diskSelectorMatch: 'system_disk',
    mountPath: '',
    filesystemType: 'xfs',
  }
  emit('update:userVolumes', [...props.userVolumes, newVol])
  selectedId.value = id
}

function addOtherVolume() {
  const id = nextId()
  const newVol: UserVolume = {
    _id: id,
    name: '',
    minSize: '',
    maxSize: '',
    diskSelectorSize: '',
    diskSelectorName: '',
    diskSelectorMatch: '',
    mountPath: '',
    filesystemType: '',
  }
  emit('update:userVolumes', [...props.userVolumes, newVol])
}

function removeVolume(id: string) {
  if (selectedId.value === id) selectedId.value = null
  emit(
    'update:userVolumes',
    props.userVolumes.filter((v) => v._id !== id),
  )
}

function patchVolume(id: string, patch: Partial<UserVolume>) {
  emit(
    'update:userVolumes',
    props.userVolumes.map((v) => (v._id === id ? { ...v, ...patch } : v)),
  )
}
</script>

<template>
  <div class="space-y-4">
    <!-- Version gate notice -->
    <div
      v-if="!supported"
      class="rounded border border-yellow/30 bg-yellow/5 px-3 py-2 text-xs text-yellow"
    >
      Partition management requires Talos v1.8+. Upgrade your version selection to enable this
      feature.
    </div>

    <!-- System disk partition bar -->
    <div>
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center gap-2 min-w-0">
          <span class="text-sm font-medium text-text">Partition Layout</span>
          <span class="font-mono text-xs text-muted truncate">{{ installDisk || '/dev/sda' }}</span>
          <span v-if="diskSizeGiB" class="text-xs text-muted flex-shrink-0"
            >({{ diskSizeGiB }} GiB)</span
          >
          <span v-else class="text-xs text-muted flex-shrink-0 italic"
            >— define disk size in Hardware for scaled view</span
          >
        </div>
        <button
          v-if="supported"
          type="button"
          class="btn-ghost text-xs py-0.5 px-2 flex-shrink-0"
          @click="addPartition"
        >
          + Partition
        </button>
      </div>

      <!-- Bar -->
      <div
        class="flex rounded-md overflow-hidden border border-border/60 select-none"
        style="height: 56px"
      >
        <div
          v-for="seg in segments"
          :key="seg.key"
          :class="[
            seg.colorClass,
            'flex flex-col items-center justify-center px-1 overflow-hidden transition-all',
            'border-r border-black/25 last:border-r-0',
            !seg.fixed && supported && 'cursor-pointer hover:brightness-110 active:brightness-125',
            !seg.fixed && supported && selectedId === seg.key && 'ring-2 ring-inset ring-white/50',
          ]"
          :style="{ width: widthPct(seg), minWidth: '28px', flexShrink: '0' }"
          :title="seg.fixed ? `${seg.label}: ${seg.sublabel} (fixed)` : `${seg.label}: ${seg.sublabel} — click to edit`"
          @click="selectPartition(seg)"
        >
          <span class="text-xs font-bold text-white truncate w-full text-center leading-tight">{{
            seg.label
          }}</span>
          <span class="text-xs text-white/70 truncate w-full text-center leading-tight">{{
            seg.sublabel
          }}</span>
        </div>
      </div>

      <!-- Legend row -->
      <div class="flex gap-3 mt-1.5 flex-wrap">
        <div class="flex items-center gap-1">
          <div class="w-2.5 h-2.5 rounded-sm bg-slate-600 flex-shrink-0"></div>
          <span class="text-xs text-muted">System (EFI + Boot)</span>
        </div>
        <div class="flex items-center gap-1">
          <div class="w-2.5 h-2.5 rounded-sm bg-violet-700 flex-shrink-0"></div>
          <span class="text-xs text-muted">STATE</span>
        </div>
        <div class="flex items-center gap-1">
          <div class="w-2.5 h-2.5 rounded-sm bg-zinc-600 flex-shrink-0"></div>
          <span class="text-xs text-muted">EPHEMERAL (auto)</span>
        </div>
        <div
          v-if="supported && systemVolumes.length === 0"
          class="text-xs text-muted italic"
        >
          Click <span class="font-medium text-text">+ Partition</span> to add a custom partition
        </div>
      </div>
    </div>

    <!-- Edit panel for selected partition -->
    <div
      v-if="selectedVolume"
      class="rounded-md border border-primary/30 bg-surface-2 p-3 space-y-3"
    >
      <div class="flex items-center justify-between">
        <span class="text-xs font-semibold text-text uppercase tracking-wide">Edit Partition</span>
        <button
          type="button"
          class="text-xs text-red hover:underline"
          @click="removeVolume(selectedVolume._id)"
        >
          Remove
        </button>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="text-xs text-muted block mb-1">Partition Name</label>
          <input
            class="input-base font-mono text-xs"
            placeholder="data"
            :value="selectedVolume.name"
            @input="patchVolume(selectedVolume._id, { name: ($event.target as HTMLInputElement).value })"
          />
        </div>

        <div>
          <label class="text-xs text-muted block mb-1">Size (GiB)</label>
          <input
            class="input-base font-mono text-xs"
            type="number"
            min="1"
            step="1"
            :value="sizeGiB(selectedVolume)"
            @input="setSizeGiB(selectedVolume._id, Number(($event.target as HTMLInputElement).value))"
          />
        </div>

        <div>
          <label class="text-xs text-muted block mb-1">Mount Path</label>
          <input
            class="input-base font-mono text-xs"
            placeholder="/var/data"
            :value="selectedVolume.mountPath"
            @input="patchVolume(selectedVolume._id, { mountPath: ($event.target as HTMLInputElement).value })"
          />
        </div>

        <div>
          <label class="text-xs text-muted block mb-1">Filesystem</label>
          <select
            class="input-base text-xs"
            :value="selectedVolume.filesystemType"
            @change="patchVolume(selectedVolume._id, { filesystemType: ($event.target as HTMLSelectElement).value })"
          >
            <option value="xfs">xfs</option>
            <option value="ext4">ext4</option>
            <option value="vfat">vfat</option>
            <option value="">none</option>
          </select>
        </div>
      </div>

      <div class="text-xs text-muted pt-1 border-t border-border/50">
        Generates a
        <code class="font-mono text-text/80">userVolume</code> with
        <code class="font-mono text-text/80">diskSelector.name: {{ installDisk || '/dev/sda' }}</code>
      </div>
    </div>

    <!-- Other volumes (non-system-disk) -->
    <div v-if="supported">
      <div class="flex items-center justify-between mb-2">
        <span class="text-sm font-medium text-text">Other Disk Volumes</span>
        <button type="button" class="btn-ghost text-xs py-0.5 px-2" @click="addOtherVolume">
          + Volume
        </button>
      </div>

      <p v-if="otherVolumes.length === 0" class="text-xs text-muted italic">
        No other disk volumes. Use this for volumes on secondary disks.
      </p>

      <div class="space-y-2">
        <div
          v-for="vol in otherVolumes"
          :key="vol._id"
          class="rounded border border-border bg-surface p-3 space-y-2"
        >
          <div class="flex items-center gap-2">
            <input
              class="input-base flex-1 font-mono text-xs"
              placeholder="volume name"
              :value="vol.name"
              @input="patchVolume(vol._id, { name: ($event.target as HTMLInputElement).value })"
            />
            <button
              type="button"
              class="text-muted hover:text-red transition-colors flex-shrink-0"
              @click="removeVolume(vol._id)"
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
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="text-xs text-muted block mb-1">Min Size</label>
              <input
                class="input-base font-mono text-xs"
                placeholder="10GiB"
                :value="vol.minSize"
                @input="patchVolume(vol._id, { minSize: ($event.target as HTMLInputElement).value })"
              />
            </div>
            <div>
              <label class="text-xs text-muted block mb-1">Max Size</label>
              <input
                class="input-base font-mono text-xs"
                placeholder="100GiB"
                :value="vol.maxSize"
                @input="patchVolume(vol._id, { maxSize: ($event.target as HTMLInputElement).value })"
              />
            </div>
            <div>
              <label class="text-xs text-muted block mb-1">Disk Name</label>
              <input
                class="input-base font-mono text-xs"
                placeholder="/dev/sdb"
                :value="vol.diskSelectorName"
                @input="patchVolume(vol._id, { diskSelectorName: ($event.target as HTMLInputElement).value })"
              />
            </div>
            <div>
              <label class="text-xs text-muted block mb-1">Disk Size Filter</label>
              <input
                class="input-base font-mono text-xs"
                placeholder=">= 100GB"
                :value="vol.diskSelectorSize"
                @input="patchVolume(vol._id, { diskSelectorSize: ($event.target as HTMLInputElement).value })"
              />
            </div>
            <div>
              <label class="text-xs text-muted block mb-1">Mount Path</label>
              <input
                class="input-base font-mono text-xs"
                placeholder="/var/data"
                :value="vol.mountPath"
                @input="patchVolume(vol._id, { mountPath: ($event.target as HTMLInputElement).value })"
              />
            </div>
            <div>
              <label class="text-xs text-muted block mb-1">Filesystem</label>
              <select
                class="input-base text-xs"
                :value="vol.filesystemType"
                @change="patchVolume(vol._id, { filesystemType: ($event.target as HTMLSelectElement).value })"
              >
                <option value="xfs">xfs</option>
                <option value="ext4">ext4</option>
                <option value="vfat">vfat</option>
                <option value="">none</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
