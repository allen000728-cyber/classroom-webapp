<script setup>
import { computed } from 'vue'
import { store, visibleStudents, addAssignment, removeAssignment, renameAssignment, toggleSub } from '../store'

const CHUNK_SIZE = 10

const seats = computed(() => visibleStudents())
const chunks = computed(() => {
  const result = []
  for (let i = 0; i < seats.value.length; i += CHUNK_SIZE) {
    result.push(seats.value.slice(i, i + CHUNK_SIZE))
  }
  return result
})
const rowCount = computed(() => Math.max(0, ...chunks.value.map((c) => c.length)))
const colCount = computed(() => store.assignments.length || 1)

function boundaryStyle(chunkIndex) {
  return chunkIndex > 0 ? 'border-left:3px solid #9fa8da;' : ''
}

function assignLabel(a, i) {
  return a.name || ('項目' + (i + 1))
}

function missing(seatNo, assignmentId) {
  return !!store.submissions[assignmentId]?.[seatNo]
}

let renameTimers = {}
function onNameInput(assignment, e) {
  assignment.name = e.target.value
  clearTimeout(renameTimers[assignment.id])
  renameTimers[assignment.id] = setTimeout(() => renameAssignment(assignment.id, assignment.name), 600)
}
</script>

<template>
  <div class="hw">
    <div class="panel-hd">作業繳交區</div>

    <div class="assign-bar">
      <span class="lbl">作業項目：</span>
      <div style="display:flex;gap:5px;flex-wrap:wrap;">
        <div class="assign-item" v-for="(a, i) in store.assignments" :key="a.id">
          <input
            type="text"
            class="assign-inp"
            :value="a.name"
            :placeholder="'項目' + (i + 1)"
            @input="onNameInput(a, $event)"
          >
          <button class="btn-del-assign" title="刪除此作業項目" @click="removeAssignment(a.id)">×</button>
        </div>
        <button class="btn-add-assign" title="新增作業項目" @click="addAssignment">+</button>
      </div>
    </div>

    <div class="hw-scroll">
      <table class="hw-tbl">
        <thead>
          <tr>
            <template v-for="(_, ci) in chunks" :key="'gh' + ci">
              <th class="th-num" rowspan="2" :style="boundaryStyle(ci)">#</th>
              <th class="th-sub-g" :colspan="colCount">缺交（未繳交）</th>
            </template>
          </tr>
          <tr>
            <template v-for="(_, ci) in chunks" :key="'sh' + ci">
              <th v-if="!store.assignments.length" class="th-sub" :style="boundaryStyle(ci)"></th>
              <th
                v-for="(a, ai) in store.assignments"
                :key="'shc' + ci + '-' + a.id"
                class="th-sub"
                :style="ai === 0 ? boundaryStyle(ci) : ''"
              >{{ assignLabel(a, ai) }}</th>
            </template>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in rowCount" :key="'row' + r">
            <template v-for="(chunk, ci) in chunks" :key="'grp' + ci + '-' + r">
              <td class="td-num" :style="boundaryStyle(ci)">{{ chunk[r - 1] ? chunk[r - 1].seat_no : '' }}</td>
              <template v-if="chunk[r - 1] && store.assignments.length">
                <td
                  v-for="(a, ai) in store.assignments"
                  :key="'cell' + ci + '-' + a.id"
                  :style="ai === 0 ? boundaryStyle(ci) : ''"
                >
                  <button
                    class="tog"
                    :class="{ 'tok-sub': missing(chunk[r - 1].seat_no, a.id) }"
                    title="點擊：標記缺交（未繳交）"
                    @click="toggleSub(chunk[r - 1].seat_no, a.id)"
                  >{{ missing(chunk[r - 1].seat_no, a.id) ? '交' : '' }}</button>
                </td>
              </template>
              <td v-else :colspan="colCount" :style="boundaryStyle(ci)"></td>
            </template>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="legend">
      <strong>說明：</strong>
      <div class="li"><span class="ld" style="background:#f44336;border:1.5px solid #b71c1c;"></span>缺交 = 未繳交（點擊標記）</div>
      <div class="li"><span class="ld" style="background:#43a047;border:1.5px solid #2e7d32;"></span>到 = 已到校</div>
      <div class="li"><span class="ld" style="background:#e53935;border:1.5px solid #b71c1c;"></span>缺 = 缺席</div>
      <div class="li"><span class="ld" style="background:#fb8c00;border:1.5px solid #e65100;"></span>假 = 請假</div>
    </div>
  </div>
</template>
