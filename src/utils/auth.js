const Auth = {
  SESSION_KEY: 'pirataria_session',

  _hash(pw) {
    return btoa(pw);
  },

  init() {
    // Users are created via setup wizard on first access, not auto-seeded
  },

  login(login, password) {
    const user = DB.getUserByLogin(login);
    if (!user || !user.active) return { ok: false, error: 'Usuário não encontrado ou inativo.' };
    if (user.password !== this._hash(password)) return { ok: false, error: 'Senha incorreta.' };
    DB.updateUser(user.id, { lastAccess: DB._now() });
    const session = { userId: user.id, userName: user.name, login: user.login, role: user.role };
    localStorage.setItem(this.SESSION_KEY, JSON.stringify(session));
    Audit.log(user.id, user.name, 'login', 'auth', '', 'Login realizado');
    return { ok: true, user: session };
  },

  logout() {
    const s = this.session();
    if (s) Audit.log(s.userId, s.userName, 'logout', 'auth', '', 'Logout realizado');
    localStorage.removeItem(this.SESSION_KEY);
  },

  session() {
    try { return JSON.parse(localStorage.getItem(this.SESSION_KEY)); } catch { return null; }
  },

  isAuthenticated() {
    return !!this.session();
  },
};
