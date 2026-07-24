const Audit = {
  log(userId, userName, action, module, refId, description) {
    const session = Auth.session();
    DB.addLog({
      userId: userId || (session ? session.userId : ''),
      userName: userName || (session ? session.userName : 'sistema'),
      action, module, refId, description,
    });
  },

  action(action, module, refId, description) {
    this.log(null, null, action, module, refId, description);
  },
};
