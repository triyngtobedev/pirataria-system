C.badge = function(text, type) {
  const map = {
    completed: 'badge-completed', done: 'badge-completed',
    confirmed: 'badge-confirmed',
    scheduled: 'badge-scheduled', pending: 'badge-scheduled', waiting: 'badge-waiting',
    cancelled: 'badge-cancelled',
    progress: 'badge-progress', in_progress: 'badge-progress',
    active: 'badge-completed', inactive: 'badge-cancelled',
  };
  const cls = map[type] || 'badge-scheduled';
  return '<span class="badge ' + cls + '">' + App._esc(text) + '</span>';
};
