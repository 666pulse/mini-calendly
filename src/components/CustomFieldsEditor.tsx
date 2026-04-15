import type { CustomField } from "../services/entities";

export function CustomFieldsEditor({ fields }: { fields: CustomField[] }) {
  return (
    <fieldset class="border border-slate-200 rounded-md p-4">
      <legend class="text-sm font-medium text-slate-600 px-1">Custom Fields</legend>
      <p class="text-xs text-slate-500 mb-3">Add fields for invitees to fill in (e.g. mobile, wechat)</p>

      <input type="hidden" name="custom_fields_json" id="custom_fields_json" value={JSON.stringify(fields)} />

      <div id="custom-fields-list">
        {fields.map((f, i) => (
          <div class="flex items-center gap-2 mb-2" data-field-row>
            <input
              type="text"
              value={f.key}
              placeholder="key"
              class="border border-slate-300 rounded px-2 py-1 text-sm w-24"
              data-field-key
            />
            <input
              type="text"
              value={f.label}
              placeholder="Label"
              class="border border-slate-300 rounded px-2 py-1 text-sm flex-1"
              data-field-label
            />
            <label class="flex items-center gap-1 text-xs text-slate-500">
              <input type="checkbox" checked={f.required} data-field-required />
              Required
            </label>
            <button type="button" class="text-red-400 hover:text-red-600 text-sm" data-field-remove>
              Remove
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        id="add-custom-field"
        class="text-indigo-600 text-sm hover:underline mt-1"
      >
        + Add Field
      </button>

      <script dangerouslySetInnerHTML={{__html: `
        (function() {
          const list = document.getElementById('custom-fields-list');
          const hidden = document.getElementById('custom_fields_json');

          function syncFields() {
            const rows = list.querySelectorAll('[data-field-row]');
            const fields = [];
            rows.forEach(row => {
              const key = row.querySelector('[data-field-key]').value.trim();
              const label = row.querySelector('[data-field-label]').value.trim();
              const required = row.querySelector('[data-field-required]').checked;
              if (key) fields.push({ key, label: label || key, required });
            });
            hidden.value = JSON.stringify(fields);
          }

          function addRow(key, label, required) {
            const div = document.createElement('div');
            div.className = 'flex items-center gap-2 mb-2';
            div.setAttribute('data-field-row', '');
            div.innerHTML = '<input type="text" value="' + (key||'') + '" placeholder="key" class="border border-slate-300 rounded px-2 py-1 text-sm w-24" data-field-key />'
              + '<input type="text" value="' + (label||'') + '" placeholder="Label" class="border border-slate-300 rounded px-2 py-1 text-sm flex-1" data-field-label />'
              + '<label class="flex items-center gap-1 text-xs text-slate-500"><input type="checkbox" ' + (required ? 'checked' : '') + ' data-field-required /> Required</label>'
              + '<button type="button" class="text-red-400 hover:text-red-600 text-sm" data-field-remove>Remove</button>';
            list.appendChild(div);
            div.querySelector('[data-field-remove]').addEventListener('click', function() { div.remove(); syncFields(); });
            div.querySelectorAll('input').forEach(el => el.addEventListener('input', syncFields));
            div.querySelector('[data-field-required]').addEventListener('change', syncFields);
            syncFields();
          }

          document.getElementById('add-custom-field').addEventListener('click', function() { addRow('', '', false); });

          list.querySelectorAll('[data-field-remove]').forEach(btn => {
            btn.addEventListener('click', function() { btn.closest('[data-field-row]').remove(); syncFields(); });
          });
          list.querySelectorAll('input').forEach(el => el.addEventListener('input', syncFields));
          list.querySelectorAll('[data-field-required]').forEach(el => el.addEventListener('change', syncFields));
        })();
      `}} />
    </fieldset>
  );
}
