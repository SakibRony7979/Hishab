import { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, createGoogleProvider, db, firebaseConfigured } from './firebase';

const BASE_CATEGORIES = {
  Home: [
    { name: 'Groceries', bn: 'কাঁচা বাজার', emoji: '🛒' }, { name: 'Medicine', bn: 'ওষুধ', emoji: '💊' },
    { name: 'Fish & Meat', bn: 'মাছ ও মাংস', emoji: '🐟' }, { name: 'Clothing', bn: 'জামাকাপড়', emoji: '👕' },
    { name: 'Utility Bills', bn: 'গ্যাস ও বিদ্যুৎ বিল', emoji: '💡' }, { name: 'Education', bn: 'বাচ্চাদের পড়াশোনা/স্কুল ফি', emoji: '📚' },
    { name: 'Mobile/Data', bn: 'মোবাইল রিচার্জ ও ইন্টারনেট', emoji: '📱' }, { name: 'Entertainment', bn: 'বিনোদন ও ওটিটি সাবস্ক্রিপশন', emoji: '🎬' },
    { name: 'Household', bn: 'জরুরি গৃহস্থালি কেনাকাটা', emoji: '🏠' },
  ],
  Office: [
    { name: 'Photocopy', bn: 'ফটোকপি', emoji: '🖨️' }, { name: 'Tea/Coffee', bn: 'চা ও কফি', emoji: '☕' },
    { name: 'Transport', bn: 'যাতায়াত ভাড়া', emoji: '🚌' }, { name: 'Stationery', bn: 'স্টেশনারি', emoji: '✏️' },
    { name: 'Internet/Wifi', bn: 'ইন্টারনেট ও ওয়াইফাই', emoji: '📶' }, { name: 'Office Lunch', bn: 'অফিস লাঞ্চ/খাবার', emoji: '🍱' },
    { name: 'Client Meeting', bn: 'ক্লায়েন্ট এন্টারটেইনমেন্ট', emoji: '🤝' }, { name: 'Courier', bn: 'কুরিয়ার ও ডেলিভারি', emoji: '📦' },
    { name: 'Software Subscriptions', bn: 'সফ্টওয়্যার/টুলস সাবস্ক্রিপশন', emoji: '💻' },
  ],
};
const KEY = 'hisab-v1';
const SETTINGS_KEY = 'hisab-settings';
const today = () => new Date().toISOString().slice(0, 10);
const monthNow = () => today().slice(0, 7);
const emptyData = { transactions: [], custom: { Home: [], Office: [] }, driveSpreadsheetId: '' };
const readData = () => {
  try {
    const value = JSON.parse(localStorage.getItem(KEY));
    if (!value) return emptyData;
    return {
      transactions: Array.isArray(value.transactions) ? value.transactions : [],
      custom: { Home: value.custom?.Home || [], Office: value.custom?.Office || [] },
      driveSpreadsheetId: value.driveSpreadsheetId || '',
    };
  } catch { return emptyData; }
};
const money = (value, language) => Number(value || 0).toLocaleString(language === 'bn' ? 'bn-BD' : 'en-US', { maximumFractionDigits: 2 });
const categoryFor = (profile, name, custom) => [...BASE_CATEGORIES[profile], ...(custom[profile] || [])].find((item) => item.name === name) || { name, bn: name, emoji: '✦' };
const COLORS = ['#cabaf5', '#a9dfca', '#afd0f8', '#efb9c8', '#e7d4a7', '#b8c5ed', '#c4e3d3', '#d2bce5'];

function App() {
  const [data, setData] = useState(readData);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(firebaseConfigured);
  const [cloudReady, setCloudReady] = useState(false);
  const [cloudStatus, setCloudStatus] = useState('local');
  const [driveToken, setDriveToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [language, setLanguage] = useState(() => {
    try { return JSON.parse(localStorage.getItem(SETTINGS_KEY))?.language || 'en'; } catch { return 'en'; }
  });
  const [profile, setProfile] = useState('Home');
  const [page, setPage] = useState('home');
  const [menu, setMenu] = useState(false);
  const [month, setMonth] = useState(monthNow());
  const [toast, setToast] = useState('');
  const [txOpen, setTxOpen] = useState(false);
  const [catOpen, setCatOpen] = useState(false);
  const [monthOpen, setMonthOpen] = useState(false);
  const [txProfile, setTxProfile] = useState('Home');
  const [txType, setTxType] = useState('expense');
  const [txCategory, setTxCategory] = useState('Groceries');
  const [txAmount, setTxAmount] = useState('');
  const [txDate, setTxDate] = useState(today());
  const [txNote, setTxNote] = useState('');
  const [catProfile, setCatProfile] = useState('Home');
  const [catName, setCatName] = useState('');
  const [catBn, setCatBn] = useState('');
  const [catEmoji, setCatEmoji] = useState('✦');

  const t = (en, bn) => language === 'bn' ? bn : en;
  const showToast = (message) => { setToast(message); window.clearTimeout(showToast.timer); showToast.timer = window.setTimeout(() => setToast(''), 2600); };
  const categories = useMemo(() => [...BASE_CATEGORIES[profile], ...(data.custom[profile] || [])], [profile, data.custom]);
  const selectedCategories = [...BASE_CATEGORIES[txProfile], ...(data.custom[txProfile] || [])];
  const transactions = useMemo(() => data.transactions.filter((item) => item.profile === profile && item.date?.startsWith(month)), [data.transactions, profile, month]);
  const allMonthly = useMemo(() => data.transactions.filter((item) => item.date?.startsWith(month)), [data.transactions, month]);
  const income = transactions.filter((item) => item.type === 'income').reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const expense = transactions.filter((item) => item.type === 'expense').reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const categoryTotals = useMemo(() => {
    const totals = {};
    transactions.filter((item) => item.type === 'expense').forEach((item) => { totals[item.category] = (totals[item.category] || 0) + Number(item.amount || 0); });
    return totals;
  }, [transactions]);
  const categoryChart = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]).map(([name, amount]) => ({ name: categoryFor(profile, name, data.custom)[language === 'bn' ? 'bn' : 'name'] || name, amount }));
  const dailyChart = useMemo(() => {
    const [year, monthNumber] = month.split('-');
    const count = new Date(Number(year), Number(monthNumber), 0).getDate();
    return Array.from({ length: count }, (_, index) => {
      const date = `${month}-${String(index + 1).padStart(2, '0')}`;
      const day = transactions.filter((item) => item.date === date);
      return { day: String(index + 1), [t('Income', 'আয়')]: day.filter((item) => item.type === 'income').reduce((sum, item) => sum + Number(item.amount), 0), [t('Expenses', 'খরচ')]: day.filter((item) => item.type === 'expense').reduce((sum, item) => sum + Number(item.amount), 0) };
    });
  }, [transactions, month, language]);
  const comparison = ['Home', 'Office'].map((workspace) => ({ name: t(workspace, workspace === 'Home' ? 'বাসা' : 'অফিস'), [t('Income', 'আয়')]: allMonthly.filter((item) => item.profile === workspace && item.type === 'income').reduce((sum, item) => sum + Number(item.amount), 0), [t('Expenses', 'খরচ')]: allMonthly.filter((item) => item.profile === workspace && item.type === 'expense').reduce((sum, item) => sum + Number(item.amount), 0) }));
  const monthLabel = new Date(`${month}-02`).toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-US', { month: 'long', year: 'numeric' });

  useEffect(() => { localStorage.setItem(KEY, JSON.stringify(data)); }, [data]);
  useEffect(() => { localStorage.setItem(SETTINGS_KEY, JSON.stringify({ language })); document.documentElement.lang = language === 'bn' ? 'bn' : 'en'; }, [language]);

  useEffect(() => {
    if (!auth) { setAuthLoading(false); return undefined; }
    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setCloudReady(false);
      setCloudStatus(nextUser ? 'loading' : 'local');
      setAuthLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!user || !db) { setCloudReady(false); return undefined; }
    const cloudDoc = doc(db, 'users', user.uid, 'private', 'hisab');
    return onSnapshot(cloudDoc, (snapshot) => {
      if (snapshot.exists()) {
        const remote = snapshot.data();
        setData({ transactions: Array.isArray(remote.transactions) ? remote.transactions : [], custom: { Home: remote.custom?.Home || [], Office: remote.custom?.Office || [] }, driveSpreadsheetId: remote.driveSpreadsheetId || '' });
      }
      setCloudReady(true);
      setCloudStatus('synced');
    }, (error) => {
      console.error('Hisab cloud listener:', error);
      setCloudStatus('error');
      setCloudReady(true);
    });
  }, [user]);

  useEffect(() => {
    if (!user || !db || !cloudReady || cloudStatus === 'error') return undefined;
    setCloudStatus('saving');
    const timer = window.setTimeout(async () => {
      try {
        await setDoc(doc(db, 'users', user.uid, 'private', 'hisab'), { transactions: data.transactions, custom: data.custom, driveSpreadsheetId: data.driveSpreadsheetId || '', updatedAt: serverTimestamp() });
        setCloudStatus('synced');
      } catch (error) {
        console.error('Hisab cloud save:', error);
        setCloudStatus('error');
      }
    }, 500);
    return () => window.clearTimeout(timer);
  }, [data, user, cloudReady]);

  useEffect(() => {
    if (txProfile !== profile && !txOpen) setTxProfile(profile);
  }, [profile, txOpen, txProfile]);

  const signIn = async () => {
    if (!firebaseConfigured || !auth) { showToast(t('Add Firebase web config to .env.local first.', 'আগে .env.local-এ Firebase config যোগ করুন।')); return; }
    setBusy(true);
    try {
      const result = await signInWithPopup(auth, createGoogleProvider());
      const credential = GoogleAuthProvider.credentialFromResult(result);
      setDriveToken(credential?.accessToken || '');
      showToast(t('Signed in with Google.', 'Google দিয়ে সাইন ইন হয়েছে।'));
    } catch (error) {
      console.error('Google sign-in:', error);
      showToast(error.code === 'auth/popup-blocked' ? t('Allow popups and try again.', 'Popup অনুমতি দিয়ে আবার চেষ্টা করুন।') : (error.message || t('Sign-in failed.', 'সাইন-ইন ব্যর্থ হয়েছে।')));
    } finally { setBusy(false); }
  };

  const createWorkbook = async (token) => {
    const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ properties: { title: 'Hisab — Transactions' }, sheets: [{ properties: { title: 'Home' } }, { properties: { title: 'Office' } }] }),
    });
    if (!response.ok) throw new Error(t('Could not create the Google Sheets workbook. Check Drive API access.', 'Google Sheets workbook তৈরি করা যায়নি। Drive API access যাচাই করুন।'));
    return response.json();
  };

  const syncDrive = async () => {
    if (!user) { showToast(t('Sign in with Google first.', 'আগে Google দিয়ে সাইন ইন করুন।')); return; }
    setBusy(true);
    try {
      let token = driveToken;
      if (!token) {
        const result = await signInWithPopup(auth, createGoogleProvider());
        token = GoogleAuthProvider.credentialFromResult(result)?.accessToken;
        if (!token) throw new Error(t('Google did not grant Drive access. Sign in and approve the Drive permission.', 'Google Drive permission দেয়নি। সাইন ইন করে অনুমতি দিন।'));
        setDriveToken(token);
      }
      let spreadsheetId = data.driveSpreadsheetId;
      if (!spreadsheetId) {
        const spreadsheet = await createWorkbook(token);
        spreadsheetId = spreadsheet.spreadsheetId;
        setData((current) => ({ ...current, driveSpreadsheetId: spreadsheetId }));
      }
      const base = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values`;
      const clearResponse = await fetch(`${base}:batchClear`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ ranges: ['Home', 'Office'] }) });
      if (!clearResponse.ok) throw new Error(t('Could not clear the Drive workbook.', 'Drive workbook পরিষ্কার করা যায়নি।'));
      const values = ['Home', 'Office'].map((workspace) => ({ range: `'${workspace}'!A1`, values: [[ 'Date', 'Type', 'Category', 'Amount (BDT)', 'Note' ], ...data.transactions.filter((item) => item.profile === workspace).map((item) => [item.date, item.type, item.category, Number(item.amount), item.note || ''])] }));
      const writeResponse = await fetch(`${base}:batchUpdate?valueInputOption=USER_ENTERED`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ valueInputOption: 'USER_ENTERED', data: values }) });
      if (!writeResponse.ok) throw new Error(t('Could not write transaction rows to Google Sheets.', 'Google Sheets-এ লেনদেন লেখা যায়নি।'));
      setMenu(false);
      showToast(t('Drive workbook synced: Home and Office tabs.', 'Drive workbook সিঙ্ক হয়েছে: Home ও Office ট্যাব।'));
    } catch (error) {
      console.error('Drive sync:', error);
      showToast(error.message || t('Drive sync failed.', 'Drive sync ব্যর্থ হয়েছে।'));
    } finally { setBusy(false); }
  };

  const exportExcel = async () => {
    const XLSX = await import('xlsx');
    const workbook = XLSX.utils.book_new();
    for (const workspace of ['Home', 'Office']) {
      const rows = data.transactions.filter((item) => item.profile === workspace).map(({ date, type, category, amount, note }) => ({ Date: date, Type: type, Category: category, Amount: amount, Note: note || '' }));
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), workspace);
    }
    XLSX.writeFile(workbook, 'Hisab-Home-Office.xlsx');
  };

  const handleSaveTransaction = () => {
    const amount = Number(txAmount);
    if (!amount || amount <= 0) { showToast(t('Enter an amount greater than zero.', 'শূন্যের বেশি পরিমাণ লিখুন।')); return; }
    setData((current) => ({ ...current, transactions: [...current.transactions, { id: crypto.randomUUID?.() || String(Date.now()), profile: txProfile, type: txType, category: txCategory, amount, date: txDate || today(), note: txNote.trim() }] }));
    setTxOpen(false); setTxAmount(''); setTxNote(''); showToast(t('Transaction saved.', 'লেনদেন সংরক্ষিত হয়েছে।'));
  };

  const handleSaveCategory = () => {
    const name = catName.trim();
    if (!name) { showToast(t('Enter a category name.', 'খাতের নাম লিখুন।')); return; }
    const list = [...BASE_CATEGORIES[catProfile], ...(data.custom[catProfile] || [])];
    if (list.some((item) => item.name.toLowerCase() === name.toLowerCase())) { showToast(t('That category already exists.', 'এই খাতটি আগে থেকেই আছে।')); return; }
    setData((current) => ({ ...current, custom: { ...current.custom, [catProfile]: [...current.custom[catProfile], { name, bn: catBn.trim() || name, emoji: catEmoji.trim() || '✦' }] } }));
    setCatOpen(false); setCatName(''); setCatBn(''); setCatEmoji('✦'); showToast(t('Category added.', 'খাত যোগ হয়েছে।'));
  };

  const exportCsv = () => {
    const rows = [['Profile', 'Date', 'Type', 'Category', 'Amount (BDT)', 'Note'], ...data.transactions.map((item) => [item.profile, item.date, item.type, item.category, item.amount, item.note || ''])];
    const csv = rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\n');
    const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })); link.download = 'hisab-transactions.csv'; link.click(); URL.revokeObjectURL(link.href); setMenu(false);
  };

  const txRow = (item) => {
    const category = categoryFor(profile, item.category, data.custom);
    return <article className="transaction-item glass-panel" key={item.id}><div className="tx-icon">{category.emoji}</div><div className="tx-main"><div className="tx-name">{item.note || (language === 'bn' ? category.bn : category.name)}</div><div className="tx-meta">{language === 'bn' ? category.bn : category.name} · {item.date}</div></div><div className={`tx-amount ${item.type === 'income' ? 'green' : 'red'}`}>{item.type === 'income' ? '+' : '−'} ৳{money(item.amount, language)}</div></article>;
  };
  const chartTooltip = { contentStyle: { background: '#17171f', border: '1px solid #ffffff22', borderRadius: 12, color: '#f5f4f9' }, itemStyle: { color: '#f5f4f9' } };

  return <>
    <main className="app-shell">
      <header className="topbar"><div className="brand-wrap"><div className="logo-coin">৳</div><div className="brand-text">Hisab <small>হিসাব</small></div></div><div className="top-actions">{user ? <button className="account-chip" title={user.email || ''} onClick={() => setMenu((value) => !value)}><img src={user.photoURL || ''} alt="" />{user.displayName || user.email}</button> : <button className="sign-in" onClick={signIn} disabled={busy || authLoading}>{busy ? '…' : t('Sign in with Google', 'Google দিয়ে সাইন ইন')}</button>}<button className="glass-icon" onClick={() => setMenu((value) => !value)} aria-label="menu">⋯</button></div></header>
      {menu && <div className="menu-panel glass-panel"><section className="sync-card"><div className="sync-head"><span>{t('Cloud & Drive sync', 'Cloud ও Drive সিঙ্ক')}</span><span className={`status-dot ${cloudStatus}`} /></div><div className="sync-status">{!firebaseConfigured ? t('Firebase setup required', 'Firebase সেটআপ প্রয়োজন') : user ? `${user.email || 'Google account'} · ${cloudStatus === 'synced' ? t('Cloud synced', 'Cloud সিঙ্ক হয়েছে') : cloudStatus === 'saving' ? t('Saving…', 'সংরক্ষণ হচ্ছে…') : cloudStatus === 'error' ? t('Sync error', 'সিঙ্ক ত্রুটি') : t('Connecting…', 'সংযোগ হচ্ছে…')}` : t('Sign in to enable multi-device sync', 'Multi-device sync চালু করতে সাইন ইন করুন')}</div><button className="menu-action" onClick={syncDrive} disabled={busy || !user}>{busy ? t('Syncing…', 'সিঙ্ক হচ্ছে…') : t('Sync Google Drive workbook →', 'Google Drive workbook সিঙ্ক →')}</button><div className="sheet-note">{t('Creates a spreadsheet with separate Home and Office tabs. Drive sync runs when you request it.', 'Home ও Office আলাদা ট্যাবসহ spreadsheet তৈরি হবে। আপনার অনুরোধে Drive sync হবে।')}</div></section><button className="menu-item" onClick={() => setLanguage((value) => value === 'en' ? 'bn' : 'en')}>{language === 'bn' ? 'English · Change language' : 'বাংলা · ভাষা পরিবর্তন'}</button><button className="menu-item" onClick={exportExcel}>{t('Download Excel workbook', 'Excel workbook ডাউনলোড')}</button><button className="menu-item" onClick={exportCsv}>{t('Export CSV', 'CSV এক্সপোর্ট')}</button>{user && <button className="menu-item danger" onClick={async () => { await signOut(auth); setDriveToken(''); setMenu(false); }}>{t('Sign out', 'সাইন আউট')}</button>}</div>}
      <div className="month-row"><button className="month-trigger" onClick={() => setMonthOpen(true)}>{monthLabel} <span>⌄</span></button><button className="glass-icon" onClick={() => setMonthOpen(true)} aria-label="choose month">▦</button></div>
      <div className="profile-switcher glass-panel">{['Home', 'Office'].map((workspace) => <button key={workspace} className={profile === workspace ? 'active' : ''} onClick={() => setProfile(workspace)}>{workspace === 'Home' ? '🏠' : '🏢'} <span>{t(workspace, workspace === 'Home' ? 'বাসা' : 'অফিস')}</span></button>)}</div>

      {page === 'home' && <section className="page-panel"><div className="summary-card glass-panel"><div className="summary-label">{t('Total balance', 'মোট ব্যালেন্স')}</div><div className="amount-row"><span className="currency">৳</span><span className="big-number">{money(income - expense, language)}</span></div><div className="stat-grid"><div className="mini-stat"><div className="mini-label">{t('Income', 'আয়')}</div><div className="green amount-small">৳ {money(income, language)}</div></div><div className="mini-stat"><div className="mini-label">{t('Expenses', 'খরচ')}</div><div className="red amount-small">৳ {money(expense, language)}</div></div></div></div>
        <div className="section-head"><h2>{t('Categories', 'খাতসমূহ')}</h2><button className="inline-button" onClick={() => { setCatProfile(profile); setCatOpen(true); }}>{t('+ Add category', '+ খাত যোগ করুন')}</button></div><div className="category-grid">{categories.map((category) => <article className="category-item glass-panel" key={category.name}><div className="emoji">{category.emoji}</div><div className="category-name">{language === 'bn' ? category.bn : category.name}</div><div className="category-value">৳ {money(categoryTotals[category.name], language)}</div></article>)}</div>
        <div className="section-head"><h2>{t('Recent transactions', 'সাম্প্রতিক লেনদেন')}</h2><button className="inline-button" onClick={() => setPage('transactions')}>{t('See all →', 'সব দেখুন →')}</button></div><div className="transaction-list">{transactions.length ? [...transactions].reverse().slice(0, 5).map(txRow) : <div className="empty-panel glass-panel">{t('No transactions yet. Tap + to add one.', 'এখনও লেনদেন নেই। যোগ করতে + চাপুন।')}</div>}</div>
      </section>}

      {page === 'transactions' && <section className="page-panel"><h1 className="page-title">{t('Transactions', 'লেনদেন')}</h1><p className="page-subtitle">{t('Manual entries for this workspace and month.', 'এই workspace ও মাসের ম্যানুয়াল লেনদেন।')}</p><div className="transaction-list">{transactions.length ? [...transactions].reverse().map(txRow) : <div className="empty-panel glass-panel">{t('No transactions this month.', 'এই মাসে লেনদেন নেই।')}</div>}</div></section>}

      {page === 'insights' && <section className="page-panel"><h1 className="page-title">{t('Insights', 'বিশ্লেষণ')}</h1><p className="page-subtitle">{t('Monthly trends and workspace spending.', 'মাসিক প্রবণতা ও workspace খরচ।')}</p><div className="glass-panel insight-card"><div className="insight-label">{t('Daily income & expenses', 'দৈনিক আয় ও খরচ')}</div><div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><LineChart data={dailyChart}><CartesianGrid stroke="#ffffff12" vertical={false} /><XAxis dataKey="day" stroke="#aaa4b5" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} interval="preserveStartEnd" /><YAxis stroke="#aaa4b5" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} width={48} /><Tooltip {...chartTooltip} /><Line type="monotone" dataKey={t('Income', 'আয়')} stroke="#a9dfca" strokeWidth={2.5} dot={false} /><Line type="monotone" dataKey={t('Expenses', 'খরচ')} stroke="#cabaf5" strokeWidth={2.5} dot={false} /></LineChart></ResponsiveContainer></div></div>
        <div className="glass-panel insight-card"><div className="insight-label">{t('Spending by category', 'খাতভিত্তিক খরচ')}</div>{categoryChart.length ? <div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><BarChart data={categoryChart} layout="vertical" margin={{ left: 8, right: 12 }}><CartesianGrid stroke="#ffffff12" horizontal={false} /><XAxis type="number" stroke="#aaa4b5" tick={{ fontSize: 10 }} /><YAxis type="category" dataKey="name" width={105} stroke="#aaa4b5" tick={{ fontSize: 10 }} /><Tooltip {...chartTooltip} /><Bar dataKey="amount" name={t('Amount (৳)', 'পরিমাণ (৳)')} radius={[0, 8, 8, 0]}>{categoryChart.map((entry, index) => <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />)}</Bar></BarChart></ResponsiveContainer></div> : <div className="empty-panel small">{t('Add expenses to see category insights.', 'খাতভিত্তিক বিশ্লেষণে খরচ যোগ করুন।')}</div>}</div>
        <div className="glass-panel insight-card"><div className="insight-label">{t('Home vs Office', 'বাসা বনাম অফিস')}</div><div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><BarChart data={comparison}><CartesianGrid stroke="#ffffff12" vertical={false} /><XAxis dataKey="name" stroke="#aaa4b5" tick={{ fontSize: 11 }} /><YAxis stroke="#aaa4b5" tick={{ fontSize: 10 }} width={48} /><Tooltip {...chartTooltip} /><Bar dataKey={t('Income', 'আয়')} fill="#a9dfca" radius={[6, 6, 0, 0]} /><Bar dataKey={t('Expenses', 'খরচ')} fill="#cabaf5" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div></div>
        <div className="glass-panel insight-card"><div className="insight-label">{t('Expense mix', 'খরচের অনুপাত')}</div>{categoryChart.length ? <div className="chart-wrap pie-wrap"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={categoryChart} dataKey="amount" nameKey="name" innerRadius={58} outerRadius={90} paddingAngle={3}>{categoryChart.map((entry, index) => <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />)}</Pie><Tooltip {...chartTooltip} /></PieChart></ResponsiveContainer><div className="legend">{categoryChart.slice(0, 5).map((entry, index) => <span key={entry.name}><i style={{ background: COLORS[index % COLORS.length] }} />{entry.name} · ৳{money(entry.amount, language)}</span>)}</div></div> : <div className="empty-panel small">{t('No spending data for this month.', 'এই মাসে খরচের তথ্য নেই।')}</div>}</div>
      </section>}

      {page === 'categories' && <section className="page-panel"><h1 className="page-title">{t('Categories', 'খাতসমূহ')}</h1><p className="page-subtitle">{t('Categories for your selected workspace.', 'নির্বাচিত workspace-এর খাতসমূহ।')}</p><button className="secondary-btn" onClick={() => { setCatProfile(profile); setCatOpen(true); }}>＋ {t('Add category', 'খাত যোগ করুন')}</button><div className="category-list">{categories.map((category) => <div className="row-cat glass-panel" key={category.name}><span className="row-emoji">{category.emoji}</span><div className="row-copy">{language === 'bn' ? category.bn : category.name}<br /><small>{profile === 'Home' ? '🏠' : '🏢'} {t(profile, profile === 'Home' ? 'বাসা' : 'অফিস')}</small></div></div>)}</div></section>}
    </main>

    <button className="fab" onClick={() => { setTxProfile(profile); setTxCategory([...BASE_CATEGORIES[profile], ...data.custom[profile]][0].name); setTxType('expense'); setTxDate(today()); setTxAmount(''); setTxNote(''); setTxOpen(true); }} aria-label="add transaction">＋</button>
    <nav className="bottom-dock">{[{ key: 'home', label: t('Home', 'হোম'), icon: '⌂' }, { key: 'transactions', label: t('Activity', 'লেনদেন'), icon: '↕' }, { key: 'insights', label: t('Insights', 'বিশ্লেষণ'), icon: '◒' }, { key: 'categories', label: t('Categories', 'খাত'), icon: '▦' }].map((item) => <button key={item.key} className={`dock-item ${page === item.key ? 'active' : ''}`} onClick={() => setPage(item.key)}><span className="dock-icon">{item.icon}</span><span>{item.label}</span></button>)}</nav>

    {txOpen && <div className="sheet-backdrop" onClick={(event) => event.target === event.currentTarget && setTxOpen(false)}><section className="sheet-panel"><div className="grabber" /><div className="sheet-head"><h3>{t('New transaction', 'নতুন লেনদেন')}</h3><button className="close-btn" onClick={() => setTxOpen(false)}>×</button></div><div className="field-group"><label>{t('Workspace', 'প্রোফাইল')}</label><div className="segmented-control">{['Home', 'Office'].map((workspace) => <button key={workspace} className={txProfile === workspace ? 'active' : ''} onClick={() => { setTxProfile(workspace); setTxCategory([...BASE_CATEGORIES[workspace], ...(data.custom[workspace] || [])][0].name); }}>{workspace === 'Home' ? '🏠' : '🏢'} {t(workspace, workspace === 'Home' ? 'বাসা' : 'অফিস')}</button>)}</div></div><div className="field-group"><label>{t('Type', 'ধরন')}</label><div className="segmented-control"><button className={txType === 'expense' ? 'active' : ''} onClick={() => setTxType('expense')}>{t('Expense', 'খরচ')}</button><button className={txType === 'income' ? 'active' : ''} onClick={() => setTxType('income')}>{t('Income', 'আয়')}</button></div></div><div className="field-group"><label>{t('Category', 'খাত')}</label><select value={txCategory} onChange={(event) => setTxCategory(event.target.value)}>{selectedCategories.map((item) => <option key={item.name} value={item.name}>{item.emoji} {language === 'bn' ? item.bn : item.name}</option>)}</select></div><div className="field-group"><label>{t('Amount (৳)', 'পরিমাণ (৳)')}</label><input type="number" min="1" inputMode="decimal" value={txAmount} onChange={(event) => setTxAmount(event.target.value)} placeholder="0.00" /></div><div className="two-col"><div className="field-group"><label>{t('Date', 'তারিখ')}</label><input type="date" value={txDate} onChange={(event) => setTxDate(event.target.value)} /></div><div className="field-group"><label>{t('Note (optional)', 'নোট (ঐচ্ছিক)')}</label><input value={txNote} onChange={(event) => setTxNote(event.target.value)} /></div></div><button className="primary-btn" onClick={handleSaveTransaction}>{t('Save transaction', 'লেনদেন সংরক্ষণ করুন')}</button><div className="sheet-note">{t('Only entries you save are recorded. No automatic transactions.', 'আপনি সংরক্ষণ করলেই লেনদেন যোগ হয়। কোনো স্বয়ংক্রিয় লেনদেন নেই।')}</div></section></div>}

    {catOpen && <div className="sheet-backdrop" onClick={(event) => event.target === event.currentTarget && setCatOpen(false)}><section className="sheet-panel"><div className="grabber" /><div className="sheet-head"><h3>{t('Add a category', 'নতুন খাত যোগ করুন')}</h3><button className="close-btn" onClick={() => setCatOpen(false)}>×</button></div><div className="field-group"><label>{t('Add to workspace', 'প্রোফাইল নির্বাচন করুন')}</label><div className="segmented-control">{['Home', 'Office'].map((workspace) => <button key={workspace} className={catProfile === workspace ? 'active' : ''} onClick={() => setCatProfile(workspace)}>{workspace === 'Home' ? '🏠' : '🏢'} {t(workspace, workspace === 'Home' ? 'বাসা' : 'অফিস')}</button>)}</div></div><div className="field-group"><label>{t('Category name (English)', 'খাতের নাম (English)')}</label><input value={catName} onChange={(event) => setCatName(event.target.value)} /></div><div className="field-group"><label>{t('Bengali label', 'বাংলা নাম')}</label><input value={catBn} onChange={(event) => setCatBn(event.target.value)} /></div><div className="field-group"><label>{t('Emoji', 'ইমোজি')}</label><input maxLength="4" value={catEmoji} onChange={(event) => setCatEmoji(event.target.value)} /></div><button className="primary-btn" onClick={handleSaveCategory}>{t('Add category', 'খাত যোগ করুন')}</button></section></div>}

    {monthOpen && <div className="sheet-backdrop" onClick={(event) => event.target === event.currentTarget && setMonthOpen(false)}><section className="sheet-panel small-sheet"><div className="grabber" /><div className="sheet-head"><h3>{t('Choose month', 'মাস নির্বাচন করুন')}</h3><button className="close-btn" onClick={() => setMonthOpen(false)}>×</button></div><div className="field-group"><label>{t('Month', 'মাস')}</label><input type="month" value={month} onChange={(event) => setMonth(event.target.value)} /></div><button className="primary-btn" onClick={() => setMonthOpen(false)}>{t('Done', 'সম্পন্ন')}</button></section></div>}
    {toast && <div className="toast">{toast}</div>}
  </>;
}

export default App;
