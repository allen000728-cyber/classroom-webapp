<script setup>
import { computed } from 'vue'
import { store, visibleStudents, addAssignment, removeAssignment, renameAssignment, toggleSub } from '../store'

const seats = computed(() => visibleStudents())
const half = computed(() => Math.ceil(seats.value.length / 2))
const left = computed(() => seats.value.slice(0, half.value))
const right = computed(() => seats.value.slice(half.value))
const colCount = computed(() => store.assignments.length || 1)

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
            <th class="th-num" rowspan="2">#</th>
            <th class="th-sub-g" :colspan="colCount">缺交（未繳交）</th>
            <th class="th-num" rowspan="2" style="border-left:3px solid #9fa8da;">#</th>
            <th class="th-sub-g" :colspan="colCount">缺交（未繳交）</th>
          </tr>
          <tr>
            <th v-if="!store.assignments.length" class="th-sub"></th>
            <th v-for="(a, i) in store.assignments" :key="'l' + a.id" class="th-sub">{{ assignLabel(a, i) }}</th>
            <th v-if="!store.assignments.length" class="th-sub" style="border-left:3px solid #9fa8da;"></th>
            <th
              v-for="(a, i) in store.assignments"
              :key="'r' + a.id"
              class="th-sub"
              :style="i === 0 ? 'border-left:3px solid #9fa8da;' : ''"
            >{{ assignLabel(a, i) }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(s, r) in left" :key="s.id">
            <td class="td-num">{{ s.seat_no }}</td>
            <td v-if="!store.assignments.length"></td>
            <td v-for="a in store.assignments" :key="'la' + a.id">
              <button
                class="tog"
                :class="{ 'tok-sub': missing(s.seat_no, a.id) }"
                title="點擊：標記缺交（未繳交）"
                @click="toggleSub(s.seat_no, a.id)"
              >{{ missing(s.seat_no, a.id) ? '交' : '' }}</button>
            </td>
            <template v-if="right[r] !== undefined">
              <td class="td-num-r">{{ right[r].seat_no }}</td>
              <td v-if="!store.assignments.length" style="border-left:3px solid #9fa8da;"></td>
              <td
                v-for="(a, i) in store.assignments"
                :key="'ra' + a.id"
                :style="i === 0 ? 'border-left:3px solid #9fa8da;' : ''"
              >
                <button
                  class="tog"
                  :class="{ 'tok-sub': missing(right[r].seat_no, a.id) }"
                  title="點擊：標記缺交（未繳交）"
                  @click="toggleSub(right[r].seat_no, a.id)"
                >{{ missing(right[r].seat_no, a.id) ? '交' : '' }}</button>
              </td>
            </template>
            <td v-else :colspan="colCount + 1" style="border-left:3px solid #9fa8da;"></td>
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
