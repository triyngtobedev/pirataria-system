const Validation = {
  required(value, label) {
    return (value && value.trim()) ? null : (label || 'Campo') + ' é obrigatório.';
  },

  phone(value) {
    if (!value) return null;
    const digits = value.replace(/\D/g, '');
    return (digits.length >= 10 && digits.length <= 11) ? null : 'Telefone inválido. Use (71) 9XXXX-XXXX.';
  },

  instagram(value) {
    if (!value) return null;
    const cleaned = value.replace('@', '').trim();
    return /^[a-zA-Z0-9_.]+$/.test(cleaned) ? null : 'Instagram inválido. Use apenas letras, números, ponto e underscore.';
  },

  money(value) {
    if (!value) return null;
    const num = parseFloat(value.replace(',', '.').replace(/[^0-9.]/g, ''));
    return (!isNaN(num) && num >= 0) ? null : 'Valor inválido. Digite um número positivo.';
  },

  date(value) {
    if (!value) return null;
    const d = new Date(value + 'T12:00:00');
    return (!isNaN(d.getTime())) ? null : 'Data inválida.';
  },

  time(value) {
    if (!value) return null;
    return /^([01]\d|2[0-3]):([0-5]\d)$/.test(value) ? null : 'Horário inválido. Use HH:MM.';
  },

  duration(value) {
    if (!value) return null;
    const num = parseInt(value, 10);
    return (!isNaN(num) && num > 0) ? null : 'Duração deve ser maior que zero.';
  },

  maxLength(value, max, label) {
    if (!value) return null;
    return value.length <= max ? null : (label || 'Campo') + ' deve ter no máximo ' + max + ' caracteres.';
  },

  _getErrorEl(fieldId) {
    const field = document.getElementById(fieldId);
    if (!field) return null;
    let errEl = field.parentNode.querySelector('.field-error');
    if (!errEl) {
      errEl = document.createElement('span');
      errEl.className = 'field-error';
      field.parentNode.appendChild(errEl);
    }
    return errEl;
  },

  _showError(fieldId, message) {
    const field = document.getElementById(fieldId);
    if (!field) return;
    field.classList.add('has-error');
    const errEl = this._getErrorEl(fieldId);
    if (errEl) errEl.textContent = message;
  },

  _clearError(fieldId) {
    const field = document.getElementById(fieldId);
    if (!field) return;
    field.classList.remove('has-error');
    const errEl = field.parentNode.querySelector('.field-error');
    if (errEl) errEl.textContent = '';
  },

  clearAll() {
    document.querySelectorAll('.has-error').forEach(el => el.classList.remove('has-error'));
    document.querySelectorAll('.field-error').forEach(el => el.textContent = '');
  },

  field(fieldId, ruleSet) {
    this._clearError(fieldId);
    const field = document.getElementById(fieldId);
    if (!field) return null;
    const value = field.value;
    const label = field.dataset.label || '';

    for (const rule of ruleSet) {
      let msg = null;
      if (typeof rule === 'string') {
        if (this[rule]) msg = this[rule](value, label);
      } else if (rule.rule && this[rule.rule]) {
        msg = this[rule.rule](value, ...(rule.args || []), label);
      }
      if (msg) {
        this._showError(fieldId, msg);
        return msg;
      }
    }
    return null;
  },

  form(fields) {
    this.clearAll();
    let valid = true;
    for (const f of fields) {
      const msg = this.field(f.id, f.rules);
      if (msg) valid = false;
    }
    return valid;
  },
};
