C.modalActions = function(buttons) {
  return '<div class="overlay-actions">' + buttons.map(b =>
    '<button class="btn ' + (b.cls || '') + '" onclick="' + b.onclick + '">' + App._esc(b.label) + '</button>'
  ).join('') + '</div>';
};

C.sectionTitle = function(text) {
  return '<div class="section-title">' + App._esc(text) + '</div>';
};

C.sectionHeader = function(title, rightHtml) {
  return '<div class="flex-between mb-12">' + C.sectionTitle(title) + (rightHtml || '') + '</div>';
};
