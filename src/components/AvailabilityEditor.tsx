import { WEEKDAY_LABELS_EN_MON_FIRST } from "../lib/datetime";

interface DaySlot {
  start_time: string;
  end_time: string;
}

interface AvailabilityData {
  [dayIndex: number]: DaySlot[];
}

export function AvailabilityEditor({ data }: { data: AvailabilityData }) {
  return (
    <fieldset class="border border-slate-200 rounded-md p-4">
      <legend class="text-sm font-medium text-slate-600 px-1">Availability</legend>
      <p class="text-xs text-slate-500 mb-3">Select days and set hours, add multiple time blocks per day</p>

      <input type="hidden" name="availability_json" id="availability_json" value={JSON.stringify(data)} />

      <div id="avail-editor">
        {WEEKDAY_LABELS_EN_MON_FIRST.map((day, i) => {
          const slots = data[i] || [];
          const enabled = slots.length > 0;
          return (
            <div class="mb-3 pb-3 border-b border-slate-100 last:border-0" data-day-row data-day={String(i)}>
              <div class="flex items-center gap-3 mb-1">
                <input type="checkbox" checked={enabled} data-day-toggle class="rounded" />
                <span class="w-24 text-sm font-medium">{day}</span>
                <button type="button" data-add-slot class="text-indigo-500 text-xs hover:underline" style={enabled ? "" : "display:none"}>
                  + Add
                </button>
              </div>
              <div data-slots class="ml-[7.5rem] space-y-1" style={enabled ? "" : "display:none"}>
                {enabled ? (
                  slots.map((s) => (
                    <div class="flex items-center gap-2" data-slot-row>
                      <input type="text" value={s.start_time} data-slot-start class="border border-slate-300 rounded px-2 py-1 text-sm w-20" />
                      <span class="text-slate-400">-</span>
                      <input type="text" value={s.end_time} data-slot-end class="border border-slate-300 rounded px-2 py-1 text-sm w-20" />
                      <button type="button" data-remove-slot class="text-red-400 hover:text-red-600 text-xs">Remove</button>
                    </div>
                  ))
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      <script dangerouslySetInnerHTML={{__html: `
        (function() {
          const hidden = document.getElementById('availability_json');

          function sync() {
            const result = {};
            document.querySelectorAll('[data-day-row]').forEach(row => {
              const day = Number(row.getAttribute('data-day'));
              const toggle = row.querySelector('[data-day-toggle]');
              if (!toggle.checked) return;
              const slots = [];
              row.querySelectorAll('[data-slot-row]').forEach(sr => {
                const start = sr.querySelector('[data-slot-start]').value.trim();
                const end = sr.querySelector('[data-slot-end]').value.trim();
                if (start && end) slots.push({ start_time: start, end_time: end });
              });
              if (slots.length > 0) result[day] = slots;
            });
            hidden.value = JSON.stringify(result);
          }

          function createSlotRow(start, end) {
            const div = document.createElement('div');
            div.className = 'flex items-center gap-2';
            div.setAttribute('data-slot-row', '');
            div.innerHTML = '<input type="text" value="' + start + '" data-slot-start class="border border-slate-300 rounded px-2 py-1 text-sm w-20" />'
              + '<span class="text-slate-400">-</span>'
              + '<input type="text" value="' + end + '" data-slot-end class="border border-slate-300 rounded px-2 py-1 text-sm w-20" />'
              + '<button type="button" data-remove-slot class="text-red-400 hover:text-red-600 text-xs">Remove</button>';
            div.querySelector('[data-remove-slot]').addEventListener('click', function() { div.remove(); sync(); });
            div.querySelectorAll('input').forEach(el => el.addEventListener('input', sync));
            return div;
          }

          document.querySelectorAll('[data-day-row]').forEach(row => {
            const toggle = row.querySelector('[data-day-toggle]');
            const slotsDiv = row.querySelector('[data-slots]');
            const addBtn = row.querySelector('[data-add-slot]');

            toggle.addEventListener('change', function() {
              slotsDiv.style.display = toggle.checked ? '' : 'none';
              addBtn.style.display = toggle.checked ? '' : 'none';
              if (toggle.checked && slotsDiv.querySelectorAll('[data-slot-row]').length === 0) {
                slotsDiv.appendChild(createSlotRow('09:00', '12:00'));
                slotsDiv.appendChild(createSlotRow('13:00', '17:00'));
              }
              sync();
            });

            addBtn.addEventListener('click', function() {
              slotsDiv.appendChild(createSlotRow('', ''));
              sync();
            });

            row.querySelectorAll('[data-remove-slot]').forEach(btn => {
              btn.addEventListener('click', function() { btn.closest('[data-slot-row]').remove(); sync(); });
            });
            row.querySelectorAll('input[type="text"]').forEach(el => el.addEventListener('input', sync));
          });
        })();
      `}} />
    </fieldset>
  );
}
