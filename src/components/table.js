C.table = function(headers, rows) {
  if (!rows || rows.length === 0) return '';
  return '<div class="table-wrap"><table><thead><tr>' + headers.map(h => '<th>' + App._esc(h) + '</th>').join('') + '</tr></thead><tbody>' + rows.join('') + '</tbody></table></div>';
};

C.td = function(content, cls) {
  return '<td' + (cls ? ' class="' + cls + '"' : '') + '>' + content + '</td>';
};

C.th = function(text) {
  return '<th>' + App._esc(text) + '</th>';
};
