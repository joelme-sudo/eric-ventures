// backend.js
// Single localStorage "backend" used by all pages.
// Methods: createUser, login, logout, getCurrentUser, updateProfile, addTransaction, getHistory

(function () {
  const USERS_KEY = 'ev_users_v2';
  const SESSION_KEY = 'ev_session_v2';
  const TX_KEY = 'ev_txs_v2';

  function _readUsers() { return JSON.parse(localStorage.getItem(USERS_KEY) || '[]'); }
  function _writeUsers(u){ localStorage.setItem(USERS_KEY, JSON.stringify(u)); }
  function _readTx(){ return JSON.parse(localStorage.getItem(TX_KEY) || '[]'); }
  function _writeTx(t){ localStorage.setItem(TX_KEY, JSON.stringify(t)); }

  // create demo user if empty
  (function init(){
    if(!_readUsers().length){
      const demo = { id:'u_demo', name:'Demo User', email:'demo@ericventures.test', phone:'08000000000', password:'demo123', balance:5000 };
      _writeUsers([demo]);
      _writeTx([]);
    }
  })();

  function createUser(name,email,password,phone){
    const users = _readUsers();
    if(users.find(u=>u.email.toLowerCase()===email.toLowerCase())) return { ok:false, error:'Email exists' };
    const user = { id: 'u_' + Date.now(), name, email, password, phone: phone||'', balance:1000 };
    users.push(user); _writeUsers(users);
    localStorage.setItem(SESSION_KEY, JSON.stringify({ userId: user.id, loggedAt: new Date().toISOString() }));
    return { ok:true, user };
  }

  function login(email, password){
    const users = _readUsers();
    const u = users.find(x => x.email.toLowerCase()===email.toLowerCase() && x.password === password);
    if(!u) return { ok:false, error:'Invalid credentials' };
    localStorage.setItem(SESSION_KEY, JSON.stringify({ userId: u.id, loggedAt: new Date().toISOString() }));
    return { ok:true, user: u };
  }

  function logout(){
    localStorage.removeItem(SESSION_KEY);
    return { ok:true };
  }

  function getCurrentUser(){
    const s = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
    if(!s) return null;
    const users = _readUsers();
    return users.find(u => u.id === s.userId) || null;
  }

  function updateProfile({ name, email, phone, password }){
    const s = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); if(!s) return { ok:false, error:'Not logged in' };
    const users = _readUsers();
    const user = users.find(u => u.id === s.userId);
    if(!user) return { ok:false, error:'User missed' };
    if(email && email.toLowerCase() !== user.email.toLowerCase()){
      if(users.find(u => u.email.toLowerCase()===email.toLowerCase())) return { ok:false, error:'Email taken' };
      user.email = email;
    }
    if(name) user.name = name;
    if(phone) user.phone = phone;
    if(password) user.password = password;
    _writeUsers(users);
    return { ok:true, user };
  }

  function addTransaction({ type, details = {}, amount = 0 }){
    const user = getCurrentUser();
    if(!user) return { ok:false, error:'Not logged in' };
    amount = Number(amount) || 0;
    // update balance (for payment types we deduct; for Fund we add)
    const users = _readUsers();
    const u = users.find(x => x.id === user.id);
    if(!u) return { ok:false, error:'User not found' };

    if(type === 'Fund') {
      u.balance = Number(u.balance || 0) + amount;
    } else {
      if(Number(u.balance || 0) < amount) return { ok:false, error:'Insufficient balance' };
      u.balance = Number(u.balance || 0) - amount;
    }

    _writeUsers(users);

    const txs = _readTx();
    const tx = {
      id: 'tx_' + Math.random().toString(36).slice(2,9),
      userId: user.id,
      type,
      details,
      amount,
      status: 'Success',
      date: new Date().toISOString()
    };
    txs.unshift(tx);
    _writeTx(txs);

    return { ok:true, tx };
  }

  function getHistory(limit=200){
    const user = getCurrentUser();
    if(!user) return { ok:false, error:'Not logged in' };
    const txs = _readTx().filter(t => t.userId === user.id).slice(0,limit);
    return { ok:true, txs };
  }

  // expose
  window.EV = {
    createUser, login, logout, getCurrentUser, updateProfile, addTransaction, getHistory
  };
})();
