App._onboardingStep = 0;

App.renderOnboarding = function() {
  this._onboardingStep = Onboarding.getCurrentStep();
  this._renderOnboardingStep();
};

App._renderOnboardingStep = function() {
  var progress = Onboarding.getProgress();
  var step = Onboarding.STEPS[this._onboardingStep];
  if (!step) { this._finishOnboarding(); return; }

  var html = '<div class="ob-wrap" style="max-width:560px;margin:40px auto;">' +
    '<div style="text-align:center;margin-bottom:20px;">' +
      '<div style="font-size:1.1rem;font-weight:500;margin-bottom:4px;">Configurar Body Art OS</div>' +
      '<div style="font-size:0.78rem;color:var(--text-muted);">Etapa ' + (this._onboardingStep + 1) + ' de ' + Onboarding.STEPS.length + '</div>' +
    '</div>' +
    '<div style="height:6px;background:var(--border);border-radius:3px;margin-bottom:20px;overflow:hidden;">' +
      '<div style="height:100%;width:' + progress.percent + '%;background:var(--gold);border-radius:3px;transition:width 0.3s;"></div>' +
    '</div>' +
    '<div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-md);padding:20px;">' +
      '<h3 style="font-size:0.95rem;font-weight:500;margin-bottom:16px;">' + step.label + '</h3>' +
      this._getOnboardingForm(step.id) +
    '</div>' +
    '<div class="flex gap-8" style="justify-content:space-between;margin-top:16px;">' +
      '<button class="btn" onclick="Onboarding.saveState({currentStep:\'' + step.id + '\'});App.navigate(App._getDefaultModule());App._toast(\'Configura\u00e7\u00e3o salva. Continue depois pelo menu Studio.\',\'info\')">Continuar depois</button>' +
      '<div class="flex gap-8">' +
        (this._onboardingStep > 0 ? '<button class="btn" onclick="App._prevOnboardingStep()">Voltar</button>' : '') +
        '<button class="btn btn-primary" onclick="App._nextOnboardingStep()">' + (this._onboardingStep >= Onboarding.STEPS.length - 1 ? 'Concluir' : 'Pr\u00f3ximo') + '</button>' +
      '</div>' +
    '</div>' +
  '</div>';

  document.getElementById('moduleContent').innerHTML = html;
};

App._getOnboardingForm = function(stepId) {
  var s = Onboarding.getState() || {};
  var html = '';
  switch (stepId) {
    case 'studio':
      html = '<div class="form-group"><label>Nome do est\u00fadio *</label><input type="text" id="obStudioName" value="' + App._esc(s.studioName || '') + '" placeholder="Ex: Pirataria Body Art"></div>' +
        '<div class="form-row"><div class="form-group"><label>Nome fantasia</label><input type="text" id="obFantasia" value="' + App._esc(s.fantasia || '') + '"></div><div class="form-group"><label>CNPJ</label><input type="text" id="obCnpj" value="' + App._esc(s.cnpj || '') + '"></div></div>' +
        '<div class="form-group"><label>Endere\u00e7o</label><input type="text" id="obAddress" value="' + App._esc(s.address || '') + '"></div>' +
        '<div class="form-row"><div class="form-group"><label>Cidade / UF</label><input type="text" id="obCity" value="' + App._esc(s.city || '') + '"></div><div class="form-group"><label>Telefone</label><input type="text" id="obPhone" value="' + App._esc(s.phone || '') + '"></div></div>' +
        '<div class="form-row"><div class="form-group"><label>WhatsApp</label><input type="text" id="obWhatsapp" value="' + App._esc(s.whatsapp || '') + '"></div><div class="form-group"><label>Instagram</label><input type="text" id="obInsta" value="' + App._esc(s.instagram || '') + '"></div></div>' +
        '<div class="form-row"><div class="form-group"><label>E-mail</label><input type="text" id="obEmail" value="' + App._esc(s.email || '') + '"></div><div class="form-group"><label>Hor\u00e1rio funciona.</label><input type="text" id="obHours" value="' + App._esc(s.businessHours || '') + '" placeholder="Ex: Seg-Sex 10h-19h"></div></div>';
      break;
    case 'profissionais':
      html = '<p style="font-size:0.78rem;color:var(--text-muted);margin-bottom:12px;">Adicione os profissionais do est\u00fadio.</p><div id="obProfList">';
      var profs = s.profissionais || [''];
      profs.forEach(function(p, i) {
        html += '<div class="form-row" style="margin-bottom:6px;"><div class="form-group"><input type="text" id="obProf_' + i + '" value="' + App._esc(p) + '" placeholder="Nome do profissional"></div>' +
          (i > 0 ? '<button class="btn btn-sm" onclick="App._removeObProf(' + i + ')" style="margin-top:20px;">X</button>' : '') +
        '</div>';
      });
      html += '</div><button class="btn btn-sm" onclick="App._addObProf()">+ Adicionar profissional</button>';
      break;
    case 'servicos':
      html = '<p style="font-size:0.78rem;color:var(--text-muted);margin-bottom:12px;">Quais servi\u00e7os o est\u00fadio oferece?</p><div id="obServList">';
      var servicos = s.servicos || ['Piercing', 'Tatuagem'];
      servicos.forEach(function(sv, i) {
        html += '<div class="form-row" style="margin-bottom:6px;"><div class="form-group"><input type="text" id="obServ_' + i + '" value="' + App._esc(sv) + '" placeholder="Ex: Piercing"></div>' +
          (i > 0 ? '<button class="btn btn-sm" onclick="App._removeObServ(' + i + ')" style="margin-top:20px;">X</button>' : '') +
        '</div>';
      });
      html += '</div><button class="btn btn-sm" onclick="App._addObServ()">+ Adicionar servi\u00e7o</button>';
      break;
    case 'pagamentos':
      html = '<p style="font-size:0.78rem;color:var(--text-muted);margin-bottom:12px;">Formas de pagamento aceitas.</p><div id="obPagList">';
      var pags = s.pagamentos || ['Dinheiro', 'PIX', 'D\u00e9bito', 'Cr\u00e9dito'];
      pags.forEach(function(pg, i) {
        html += '<div class="form-row" style="margin-bottom:6px;"><div class="form-group"><input type="text" id="obPag_' + i + '" value="' + App._esc(pg) + '" placeholder="Ex: PIX"></div>' +
          (i > 0 ? '<button class="btn btn-sm" onclick="App._removeObPag(' + i + ')" style="margin-top:20px;">X</button>' : '') +
        '</div>';
      });
      html += '</div><button class="btn btn-sm" onclick="App._addObPag()">+ Adicionar forma de pagamento</button>';
      break;
    case 'joias':
      html = '<p style="font-size:0.78rem;color:var(--text-muted);margin-bottom:12px;">Categorias de joias para controle de estoque.</p><div id="obJoiasList">';
      var joias = s.joias || ['Opalito', 'A\u00e7o Cir\u00fargico', 'Tit\u00e2nio', 'Acr\u00edlico'];
      joias.forEach(function(j, i) {
        html += '<div class="form-row" style="margin-bottom:6px;"><div class="form-group"><input type="text" id="obJoia_' + i + '" value="' + App._esc(j) + '" placeholder="Ex: Opalito"></div>' +
          (i > 0 ? '<button class="btn btn-sm" onclick="App._removeObJoia(' + i + ')" style="margin-top:20px;">X</button>' : '') +
        '</div>';
      });
      html += '</div><button class="btn btn-sm" onclick="App._addObJoia()">+ Adicionar categoria</button>';
      break;
    case 'agenda_config':
      html = '<p style="font-size:0.78rem;color:var(--text-muted);margin-bottom:12px;">Configure o funcionamento da agenda.</p>' +
        '<div class="form-row"><div class="form-group"><label>Abertura</label><input type="time" id="obAgOpen" value="' + (s.agOpen || '10:00') + '"></div>' +
        '<div class="form-group"><label>Fechamento</label><input type="time" id="obAgClose" value="' + (s.agClose || '19:00') + '"></div></div>' +
        '<div class="form-group"><label>Dias de funcionamento</label><div style="display:flex;flex-wrap:wrap;gap:6px;">' +
          ([{v:'mon',l:'Seg'},{v:'tue',l:'Ter'},{v:'wed',l:'Qua'},{v:'thu',l:'Qui'},{v:'fri',l:'Sex'},{v:'sat',l:'S\u00e1b'},{v:'sun',l:'Dom'}]).map(function(d) {
            var checked = (s.agDias || ['mon','tue','wed','thu','fri','sat']).indexOf(d.v) >= 0;
            return '<label style="font-size:0.78rem;display:flex;align-items:center;gap:4px;cursor:pointer;"><input type="checkbox" id="obAgDia_' + d.v + '"' + (checked ? ' checked' : '') + '>' + d.l + '</label>';
          }).join('') +
        '</div></div>';
      break;
    case 'notificacoes':
      html = '<p style="font-size:0.78rem;color:var(--text-muted);margin-bottom:12px;">Prefer\u00eancias de notifica\u00e7\u00e3o.</p>' +
        '<label style="display:flex;align-items:center;gap:8px;font-size:0.84rem;margin-bottom:10px;cursor:pointer;"><input type="checkbox" id="obNotifLembrete"' + (s.notifLembrete !== false ? ' checked' : '') + '> Lembretes de agendamento</label>' +
        '<label style="display:flex;align-items:center;gap:8px;font-size:0.84rem;margin-bottom:10px;cursor:pointer;"><input type="checkbox" id="obNotifOrc"' + (s.notifOrc !== false ? ' checked' : '') + '> Or\u00e7amentos pendentes</label>' +
        '<label style="display:flex;align-items:center;gap:8px;font-size:0.84rem;margin-bottom:10px;cursor:pointer;"><input type="checkbox" id="obNotifRetorno"' + (s.notifRetorno !== false ? ' checked' : '') + '> Retornos de acompanhamento</label>' +
        '<label style="display:flex;align-items:center;gap:8px;font-size:0.84rem;cursor:pointer;"><input type="checkbox" id="obNotifMarketing"' + (s.notifMarketing === true ? ' checked' : '') + '> Sugest\u00f5es de marketing</label>';
      break;
    case 'revisao':
      var checklist = Onboarding.getConfigChecklist();
      html = '<p style="font-size:0.82rem;color:var(--text-muted);margin-bottom:14px;">Revise as configura\u00e7\u00f5es antes de finalizar.</p><div style="display:flex;flex-direction:column;gap:6px;">';
      checklist.forEach(function(item) {
        html += '<div style="display:flex;align-items:center;gap:8px;padding:6px 10px;background:var(--surface-2);border-radius:var(--radius-sm);font-size:0.82rem;">' +
          '<span style="color:' + (item.ok ? 'var(--green)' : 'var(--red)') + ';">' + (item.ok ? '\u2713' : '\u2717') + '</span>' +
          '<span>' + item.label + '</span></div>';
      });
      html += '</div>';
      break;
  }
  return html;
};

App._prevOnboardingStep = function() {
  this._saveOnboardingStep();
  if (this._onboardingStep > 0) this._onboardingStep--;
  this._renderOnboardingStep();
};

App._nextOnboardingStep = function() {
  this._saveOnboardingStep();
  if (this._onboardingStep >= Onboarding.STEPS.length - 1) {
    this._finishOnboarding();
    return;
  }
  this._onboardingStep++;
  this._renderOnboardingStep();
};

App._saveOnboardingStep = function() {
  var step = Onboarding.STEPS[this._onboardingStep];
  if (!step) return;
  var data = { currentStep: step.id };

  switch (step.id) {
    case 'studio':
      data.studioName = (document.getElementById('obStudioName') || {}).value || '';
      data.fantasia = (document.getElementById('obFantasia') || {}).value || '';
      data.cnpj = (document.getElementById('obCnpj') || {}).value || '';
      data.address = (document.getElementById('obAddress') || {}).value || '';
      data.city = (document.getElementById('obCity') || {}).value || '';
      data.phone = (document.getElementById('obPhone') || {}).value || '';
      data.whatsapp = (document.getElementById('obWhatsapp') || {}).value || '';
      data.instagram = (document.getElementById('obInsta') || {}).value || '';
      data.email = (document.getElementById('obEmail') || {}).value || '';
      data.businessHours = (document.getElementById('obHours') || {}).value || '';
      break;
    case 'profissionais':
      data.profissionais = [];
      var i = 0;
      while (document.getElementById('obProf_' + i)) {
        data.profissionais.push(document.getElementById('obProf_' + i).value.trim());
        i++;
      }
      break;
    case 'servicos':
      data.servicos = [];
      var i = 0;
      while (document.getElementById('obServ_' + i)) {
        data.servicos.push(document.getElementById('obServ_' + i).value.trim());
        i++;
      }
      break;
    case 'pagamentos':
      data.pagamentos = [];
      var i = 0;
      while (document.getElementById('obPag_' + i)) {
        data.pagamentos.push(document.getElementById('obPag_' + i).value.trim());
        i++;
      }
      break;
    case 'joias':
      data.joias = [];
      var i = 0;
      while (document.getElementById('obJoia_' + i)) {
        data.joias.push(document.getElementById('obJoia_' + i).value.trim());
        i++;
      }
      break;
    case 'agenda_config':
      data.agOpen = (document.getElementById('obAgOpen') || {}).value || '10:00';
      data.agClose = (document.getElementById('obAgClose') || {}).value || '19:00';
      data.agDias = [];
      ['mon','tue','wed','thu','fri','sat','sun'].forEach(function(d) {
        var el = document.getElementById('obAgDia_' + d);
        if (el && el.checked) data.agDias.push(d);
      });
      break;
    case 'notificacoes':
      data.notifLembrete = !!(document.getElementById('obNotifLembrete') || {}).checked;
      data.notifOrc = !!(document.getElementById('obNotifOrc') || {}).checked;
      data.notifRetorno = !!(document.getElementById('obNotifRetorno') || {}).checked;
      data.notifMarketing = !!(document.getElementById('obNotifMarketing') || {}).checked;
      break;
  }

  Onboarding.saveState(data);
};

App._finishOnboarding = function() {
  this._saveOnboardingStep();
  Onboarding.applyDefaults();
  Onboarding.markComplete();
  App._toast('Body Art OS configurado com sucesso!', 'success');
  this.navigate('hoje');
};

App._addObProf = function() {
  var list = document.getElementById('obProfList');
  if (!list) return;
  var idx = list.querySelectorAll('.form-row').length;
  var div = document.createElement('div');
  div.className = 'form-row';
  div.style.marginBottom = '6px';
  div.innerHTML = '<div class="form-group"><input type="text" id="obProf_' + idx + '" placeholder="Nome do profissional"></div>' +
    '<button class="btn btn-sm" onclick="App._removeObProf(' + idx + ')" style="margin-top:20px;">X</button>';
  list.appendChild(div);
};

App._removeObProf = function(idx) {
  var el = document.getElementById('obProf_' + idx);
  if (el) el.closest('.form-row').remove();
};

App._addObServ = function() {
  var list = document.getElementById('obServList');
  if (!list) return;
  var idx = list.querySelectorAll('.form-row').length;
  var div = document.createElement('div');
  div.className = 'form-row';
  div.style.marginBottom = '6px';
  div.innerHTML = '<div class="form-group"><input type="text" id="obServ_' + idx + '" placeholder="Ex: Retoque"></div>' +
    '<button class="btn btn-sm" onclick="App._removeObServ(' + idx + ')" style="margin-top:20px;">X</button>';
  list.appendChild(div);
};

App._removeObServ = function(idx) {
  var el = document.getElementById('obServ_' + idx);
  if (el) el.closest('.form-row').remove();
};

App._addObPag = function() {
  var list = document.getElementById('obPagList');
  if (!list) return;
  var idx = list.querySelectorAll('.form-row').length;
  var div = document.createElement('div');
  div.className = 'form-row';
  div.style.marginBottom = '6px';
  div.innerHTML = '<div class="form-group"><input type="text" id="obPag_' + idx + '" placeholder="Ex: Transfer\u00eancia"></div>' +
    '<button class="btn btn-sm" onclick="App._removeObPag(' + idx + ')" style="margin-top:20px;">X</button>';
  list.appendChild(div);
};

App._removeObPag = function(idx) {
  var el = document.getElementById('obPag_' + idx);
  if (el) el.closest('.form-row').remove();
};

App._addObJoia = function() {
  var list = document.getElementById('obJoiasList');
  if (!list) return;
  var idx = list.querySelectorAll('.form-row').length;
  var div = document.createElement('div');
  div.className = 'form-row';
  div.style.marginBottom = '6px';
  div.innerHTML = '<div class="form-group"><input type="text" id="obJoia_' + idx + '" placeholder="Ex: Opalito"></div>' +
    '<button class="btn btn-sm" onclick="App._removeObJoia(' + idx + ')" style="margin-top:20px;">X</button>';
  list.appendChild(div);
};

App._removeObJoia = function(idx) {
  var el = document.getElementById('obJoia_' + idx);
  if (el) el.closest('.form-row').remove();
};
