import { useEffect, useMemo, useState } from 'react';

const BASE_CATEGORIES = {
  Home: [
    { name: 'Groceries', bn: 'কাঁচা বাজার', emoji: '🛒' },
    { name: 'Medicine', bn: 'ওষুধ', emoji: '💊' },
    { name: 'Fish & Meat', bn: 'মাছ ও মাংস', emoji: '🐟' },
    { name: 'Clothing', bn: 'জামাকাপড়', emoji: '👕' },
    { name: 'Utility Bills', bn: 'গ্যাস ও বিদ্যুৎ বিল', emoji: '💡' },
    { name: 'Education', bn: 'বাচ্চাদের পড়াশোনা/স্কুল ফি', emoji: '📚' },
    { name: 'Mobile/Data', bn: 'মোবাইল রিচার্জ ও ইন্টারনেট', emoji: '📱' },
    { name: 'Entertainment', bn: 'বিনোদন ও ওটিটি সাবস্ক্রিপশন', emoji: '🎬' },
    { name: 'Household', bn: 'জরুরি গৃহস্থালি কেনাকাটা', emoji: '🏠' },
  ],
  Office: [
    { name: 'Photocopy', bn: 'ফটোকপি', emoji: '🖨️' },
    { name: 'Tea/Coffee', bn: 'চা ও কফি', emoji: '☕' },
    { name: 'Transport', bn: 'যাতায়াত ভাড়া', emoji: '🚌' },
    { name: 'Stationery', bn: 'স্টেশনারি', emoji: '✏️' },
    { name: 'Internet/Wifi', bn: 'ইন্টারনেট ও ওয়াইফাই', emoji: '📶' },
    { name: 'Office Lunch', bn: 'অফিস লাঞ্চ/খাবার', emoji: '🍱' },
    { name: 'Client Meeting', bn: 'ক্লায়েন্ট এন্টারটেইনমেন্ট', emoji: '🤝' },
    { name: 'Courier', bn: 'কুরিয়ার ও ডেলিভারি', emoji: '📦' },
    { name: 'Software Subscriptions', bn: 'সফ্টওয়্যার/টুলস সাবস্ক্রিপশন', emoji: '💻' },
  ],
};

const STORAGE_KEY = 'hisab-v1';

const defaultData = {
  transactions: [
    {
      id: 1,
      profile: 'Home',
      type: 'expense',
      category: 'Groceries',
      amount: 1250,
      date: '2026-07-02',
      note: 'Weekly market',
    },
    {
      id: 2,
      profile: 'Home',
      type: 'income',
      category: 'Salary',
      amount: 60000,
      date: '2026-07-01',
      note: 'Monthly salary',
    },
    {
      id: 3,
      profile: 'Office',
      type: 'expense',
      category: 'Transport',
      amount: 450,
      date: '2026-07-04',
      note: 'Office commute',
    },
    {
      id: 4,
      profile: 'Office',
      type: 'expense',
      category: 'Internet/Wifi',
      amount: 920,
      date: '2026-07-08',
      note: 'Internet bill',
    },
  ],
  custom: { Home: [], Office: [] },
};

const getInitialData = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultData;
    const parsed = JSON.parse(raw);
    return {
      transactions: parsed.transactions || [],
      custom: {
        Home: parsed.custom?.Home || [],
        Office: parsed.custom?.Office || [],
      },
    };
  } catch {
    return defaultData;
  }
};

const formatMoney = (value, locale) => {
  const safe = Number(value || 0);
  return safe.toLocaleString(locale === 'bn' ? 'bn-BD' : 'en-US', {
    maximumFractionDigits: 2,
  });
};

const getCategoryLabel = (category, lang) => {
  if (!category) return lang === 'bn' ? 'খাত' : 'Category';
  const match = category.bn ? category : null;
  return match ? (lang === 'bn' ? match.bn : match.name) : category;
};

const useLocalStore = () => {
  const [data, setData] = useState(() => getInitialData());

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  return [data, setData];
};

function App() {
  const [language, setLanguage] = useState('en');
  const [activeProfile, setActiveProfile] = useState('Home');
  const [activePage, setActivePage] = useState('home');
  const [menuOpen, setMenuOpen] = useState(false);
  const [month, setMonth] = useState('2026-07');
  const [toast, setToast] = useState('');
  const [data, setData] = useLocalStore();

  const [txSheetOpen, setTxSheetOpen] = useState(false);
  const [catSheetOpen, setCatSheetOpen] = useState(false);
  const [monthSheetOpen, setMonthSheetOpen] = useState(false);

  const [txProfile, setTxProfile] = useState('Home');
  const [txType, setTxType] = useState('expense');
  const [txCategory, setTxCategory] = useState('Groceries');
  const [txAmount, setTxAmount] = useState('');
  const [txDate, setTxDate] = useState(new Date().toISOString().slice(0, 10));
  const [txNote, setTxNote] = useState('');

  const [catProfile, setCatProfile] = useState('Home');
  const [catName, setCatName] = useState('');
  const [catEmoji, setCatEmoji] = useState('✦');

  const t = (en, bn) => (language === 'bn' ? bn : en);

  const categories = useMemo(() => {
    const base = BASE_CATEGORIES[activeProfile] || [];
    const custom = data.custom?.[activeProfile] || [];
    return [...base, ...custom];
  }, [activeProfile, data.custom]);

  useEffect(() => {
    if (txProfile !== activeProfile) {
      setTxProfile(activeProfile);
    }
  }, [activeProfile, txProfile]);

  useEffect(() => {
    const selected = categories.find((cat) => cat.name === txCategory);
    if (!selected && categories[0]) setTxCategory(categories[0].name);
  }, [categories, txCategory]);

  const monthLabel = useMemo(() => {
    const [year, monthNum] = month.split('-');
    const date = new Date(Number(year), Number(monthNum) - 1, 1);
    return date.toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-US', {
      month: 'long',
      year: 'numeric',
    });
  }, [month, language]);

  const filteredTransactions = useMemo(
    () =>
      data.transactions.filter(
        (item) => item.profile === activeProfile && item.date?.startsWith(month),
      ),
    [data.transactions, activeProfile, month],
  );

  const totalIncome = filteredTransactions
    .filter((item) => item.type === 'income')
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const totalExpense = filteredTransactions
    .filter((item) => item.type === 'expense')
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const balance = totalIncome - totalExpense;

  const categoryTotals = useMemo(() => {
    const map = {};
    filteredTransactions
      .filter((item) => item.type === 'expense')
      .forEach((item) => {
        map[item.category] = (map[item.category] || 0) + Number(item.amount || 0);
      });
    return map;
  }, [filteredTransactions]);

  const topCategoryNames = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);

  const showToast = (message) => {
    setToast(message);
    clearTimeout(showToast.timeout);
    showToast.timeout = setTimeout(() => setToast(''), 2200);
  };

  const saveData = (nextData) => setData(nextData);

  const handleSaveTransaction = () => {
    const amount = Number(txAmount);
    if (!amount || amount <= 0) {
      showToast(t('Enter an amount greater than zero.', 'শূন্যের বেশি পরিমাণ লিখুন।'));
      return;
    }

    const next = {
      ...data,
      transactions: [
        ...data.transactions,
        {
          id: Date.now(),
          profile: txProfile,
          type: txType,
          category: txCategory,
          amount,
          date: txDate || new Date().toISOString().slice(0, 10),
          note: txNote.trim(),
        },
      ],
    };
    saveData(next);
    setTxSheetOpen(false);
    setTxAmount('');
    setTxNote('');
    showToast(t('Transaction saved.', 'লেনদেন সংরক্ষিত হয়েছে।'));
  };

  const handleSaveCategory = () => {
    const name = catName.trim();
    if (!name) {
      showToast(t('Enter a category name.', 'খাতের নাম লিখুন।'));
      return;
    }

    const allCategories = [...BASE_CATEGORIES[catProfile], ...data.custom[catProfile]];
    const exists = allCategories.some(
      (category) => category.name.toLowerCase() === name.toLowerCase(),
    );

    if (exists) {
      showToast(t('That category already exists.', 'এই খাতটি আগে থেকেই আছে।'));
      return;
    }

    const next = {
      ...data,
      custom: {
        ...data.custom,
        [catProfile]: [
          ...data.custom[catProfile],
          {
            name,
            bn: name,
            emoji: catEmoji.trim() || '✦',
          },
        ],
      },
    };
    saveData(next);
    setCatSheetOpen(false);
    setCatName('');
    setCatEmoji('✦');
    showToast(t('Category added.', 'খাত যোগ হয়েছে।'));
  };

  const handleExportCsv = () => {
    const rows = [
      ['Profile', 'Date', 'Type', 'Category', 'Amount', 'Note'],
      ...data.transactions.map((tx) => [
        tx.profile,
        tx.date,
        tx.type,
        tx.category,
        String(tx.amount),
        tx.note || '',
      ]),
    ];

    const csv = rows
      .map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(','))
      .join('\n');

    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'hisab-transactions.csv';
    link.click();
    URL.revokeObjectURL(url);
    setMenuOpen(false);
  };

  const currency = '৳';

  return (
    <>
      <div className="app-shell">
        <header className="topbar">
          <div className="brand-wrap">
            <div className="logo-coin">৳</div>
            <div className="brand-text">
              Hisab <small>হিসাব</small>
            </div>
          </div>
          <button className="glass-icon" onClick={() => setMenuOpen((v) => !v)} aria-label="menu">
            ⋯
          </button>
        </header>

        {menuOpen && (
          <div className="menu-panel glass-panel">
            <div className="sync-card">
              <div className="sync-head">
                <span>{t('Google Drive sync', 'Google Drive সিঙ্ক')}</span>
                <span className="sync-dot">◉</span>
              </div>
              <div className="sync-status">
                {t('Not connected · Local data only', 'সংযুক্ত নয় · শুধু লোকাল ডেটা')}
              </div>
              <button className="text-link" onClick={() => showToast(t('Google OAuth is not configured yet.', 'Google OAuth এখনো কনফিগার করা হয়নি।'))}>
                {t('Set up Google sync →', 'Google সিঙ্ক সেটআপ →')}
              </button>
            </div>

            <button className="menu-item" onClick={() => setLanguage((prev) => (prev === 'en' ? 'bn' : 'en'))}>
              {language === 'bn' ? 'English · Change language' : 'বাংলা · ভাষা পরিবর্তন'}
            </button>
            <button className="menu-item" onClick={handleExportCsv}>Export transactions as CSV</button>
            <button className="menu-item" onClick={() => showToast(t('Hisab · Private manual tracking', 'হিসাব · ব্যক্তিগত ম্যানুয়াল ট্র্যাকিং'))}>About Hisab</button>
          </div>
        )}

        <div className="month-row">
          <button className="month-trigger" onClick={() => setMonthSheetOpen(true)}>
            {monthLabel} <span>⌄</span>
          </button>
          <button className="glass-icon" onClick={() => setMonthSheetOpen(true)} aria-label="choose month">
            ▦
          </button>
        </div>

        <div className="profile-switcher glass-panel">
          {['Home', 'Office'].map((profile) => (
            <button
              key={profile}
              className={profile === activeProfile ? 'active' : ''}
              onClick={() => setActiveProfile(profile)}
            >
              {profile === 'Home' ? '🏠' : '🏢'}{' '}
              <span>{t(profile === 'Home' ? 'Home' : 'Office', profile === 'Home' ? 'বাসা' : 'অফিস')}</span>
            </button>
          ))}
        </div>

        {activePage === 'home' && (
          <section className="page-panel">
            <div className="summary-card glass-panel">
              <div className="summary-label">{t('Total Balance', 'মোট ব্যালেন্স')}</div>
              <div className="amount-row">
                <span className="currency">{currency}</span>
                <span className="big-number">{formatMoney(balance, language)}</span>
              </div>
              <div className="stat-grid">
                <div className="mini-stat">
                  <div className="mini-label">{t('Income', 'আয়')}</div>
                  <div className="green amount-small">{currency} {formatMoney(totalIncome, language)}</div>
                </div>
                <div className="mini-stat">
                  <div className="mini-label">{t('Expenses', 'খরচ')}</div>
                  <div className="red amount-small">{currency} {formatMoney(totalExpense, language)}</div>
                </div>
              </div>
            </div>

            <div className="section-head">
              <h2>{t('Categories', 'খাতসমূহ')}</h2>
              <button className="inline-button" onClick={() => setCatSheetOpen(true)}>
                {t('+ Add category', '+ খাত যোগ করুন')}
              </button>
            </div>

            <div className="category-grid">
              {categories.map((category) => (
                <div className="category-item glass-panel" key={`${category.name}-${activeProfile}`}>
                  <div className="emoji">{category.emoji}</div>
                  <div className="category-name">{language === 'bn' ? (category.bn || category.name) : category.name}</div>
                  <div className="category-value">{currency} {formatMoney(categoryTotals[category.name] || 0, language)}</div>
                </div>
              ))}
            </div>

            <div className="section-head">
              <h2>{t('Recent transactions', 'সাম্প্রতিক লেনদেন')}</h2>
              <button className="inline-button" onClick={() => setActivePage('transactions')}>
                {t('See all →', 'সব দেখুন →')}
              </button>
            </div>

            <div className="transaction-list">
              {filteredTransactions.length === 0 ? (
                <div className="empty-panel glass-panel">
                  {t('No transactions yet. Tap + to add one.', 'এখনও কোনো লেনদেন নেই। যোগ করতে + চাপুন।')}
                </div>
              ) : (
                [...filteredTransactions]
                  .reverse()
                  .slice(0, 5)
                  .map((item) => {
                    const chosenCategory = [...BASE_CATEGORIES[activeProfile], ...data.custom[activeProfile]].find(
                      (category) => category.name === item.category,
                    ) || { emoji: '✦', name: item.category, bn: item.category };

                    return (
                      <div className="transaction-item glass-panel" key={item.id}>
                        <div className="tx-icon">{chosenCategory.emoji}</div>
                        <div className="tx-main">
                          <div className="tx-name">{item.note || getCategoryLabel(chosenCategory, language)}</div>
                          <div className="tx-meta">
                            {language === 'bn' ? (chosenCategory.bn || chosenCategory.name) : chosenCategory.name} · {item.date}
                          </div>
                        </div>
                        <div className={`tx-amount ${item.type === 'income' ? 'green' : 'red'}`}>
                          {item.type === 'income' ? '+' : '-'} {currency}{formatMoney(item.amount, language)}
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </section>
        )}

        {activePage === 'transactions' && (
          <section className="page-panel">
            <h1 className="page-title">{t('Transactions', 'লেনদেন')}</h1>
            <p className="page-subtitle">
              {t('Your manually logged activity for this profile.', 'এই প্রোফাইলের আপনার হাতে লেখা লেনদেন।')}
            </p>
            <div className="transaction-list">
              {filteredTransactions.length === 0 ? (
                <div className="empty-panel glass-panel">{t('No transactions for this month.', 'এই মাসে কোনো লেনদেন নেই।')}</div>
              ) : (
                [...filteredTransactions]
                  .reverse()
                  .map((item) => {
                    const chosenCategory = [...BASE_CATEGORIES[activeProfile], ...data.custom[activeProfile]].find(
                      (category) => category.name === item.category,
                    ) || { emoji: '✦', name: item.category, bn: item.category };

                    return (
                      <div className="transaction-item glass-panel" key={item.id}>
                        <div className="tx-icon">{chosenCategory.emoji}</div>
                        <div className="tx-main">
                          <div className="tx-name">{item.note || getCategoryLabel(chosenCategory, language)}</div>
                          <div className="tx-meta">
                            {language === 'bn' ? (chosenCategory.bn || chosenCategory.name) : chosenCategory.name} · {item.date}
                          </div>
                        </div>
                        <div className={`tx-amount ${item.type === 'income' ? 'green' : 'red'}`}>
                          {item.type === 'income' ? '+' : '-'} {currency}{formatMoney(item.amount, language)}
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </section>
        )}

        {activePage === 'insights' && (
          <section className="page-panel">
            <h1 className="page-title">{t('Insights', 'বিশ্লেষণ')}</h1>
            <p className="page-subtitle">
              {t('A clear view of your monthly spending.', 'মাসিক খরচের সহজ চিত্র।')}
            </p>

            <div className="insight-card glass-panel">
              <div className="insight-label">{t('Spending by category', 'খাতভিত্তিক খরচ')}</div>
              {topCategoryNames.length === 0 ? (
                <div className="empty-panel small">{t('No spending logged yet.', 'এখনও কোনো খরচ যোগ হয়নি।')}</div>
              ) : (
                (() => {
                  const max = Math.max(...topCategoryNames.map(([, value]) => value), 1);
                  return topCategoryNames.map(([name, value]) => {
                    const category = [...BASE_CATEGORIES[activeProfile], ...data.custom[activeProfile]].find(
                      (item) => item.name === name,
                    ) || { emoji: '✦', name, bn: name };
                    const width = (value / max) * 100;
                    return (
                      <div className="bar-row" key={name}>
                        <span className="bar-label">{language === 'bn' ? (category.bn || category.name) : category.name}</span>
                        <div className="bar-track">
                          <span className="bar-fill" style={{ width: `${width}%` }} />
                        </div>
                        <span className="bar-value">{currency}{formatMoney(value, language)}</span>
                      </div>
                    );
                  });
                })()
              )}
            </div>

            <div className="insight-card glass-panel">
              <div className="insight-label">{t('Monthly summary', 'মাসিক সারাংশ')}</div>
              <p>
                {t(
                  'Only manually added transactions are included. Home and Office are isolated.',
                  'শুধু ম্যানুয়ালি যোগ করা লেনদেন আছে। বাসা ও অফিস আলাদা রাখা হয়।',
                )}
              </p>
            </div>
          </section>
        )}

        {activePage === 'categories' && (
          <section className="page-panel">
            <h1 className="page-title">{t('Categories', 'খাতসমূহ')}</h1>
            <p className="page-subtitle">
              {t('Categories for your selected profile.', 'নির্বাচিত প্রোফাইলের খাতসমূহ।')}
            </p>
            <button className="secondary-btn" onClick={() => setCatSheetOpen(true)}>
              + {t('Add category', 'খাত যোগ করুন')}
            </button>

            <div className="category-list">
              {categories.map((category) => (
                <div className="row-cat glass-panel" key={`${category.name}-${activeProfile}`}>
                  <div className="row-emoji">{category.emoji}</div>
                  <div className="row-copy">
                    <div>{language === 'bn' ? (category.bn || category.name) : category.name}</div>
                    <small>{activeProfile === 'Home' ? '🏠 Home' : '🏢 Office'}</small>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      <button className="fab" onClick={() => {
        setTxProfile(activeProfile);
        setTxType('expense');
        setTxDate(new Date().toISOString().slice(0, 10));
        setTxAmount('');
        setTxNote('');
        setTxCategory(categories[0]?.name || 'Groceries');
        setTxSheetOpen(true);
      }} aria-label="add transaction">
        ＋
      </button>

      <nav className="bottom-dock">
        {[
          { key: 'home', label: t('Home', 'হোম') },
          { key: 'transactions', label: t('Activity', 'লেনদেন') },
          { key: 'insights', label: t('Insights', 'বিশ্লেষণ') },
          { key: 'categories', label: t('Categories', 'খাত') },
        ].map((item) => (
          <button
            key={item.key}
            className={`dock-item ${activePage === item.key ? 'active' : ''}`}
            onClick={() => setActivePage(item.key)}
          >
            <span className="dock-icon">{item.key === 'home' ? '⌂' : item.key === 'transactions' ? '↕' : item.key === 'insights' ? '◒' : '▦'}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      {txSheetOpen && (
        <div className="sheet-backdrop" onClick={(e) => e.target === e.currentTarget && setTxSheetOpen(false)}>
          <div className="sheet-panel">
            <div className="grabber" />
            <div className="sheet-head">
              <h3>{t('New transaction', 'নতুন লেনদেন')}</h3>
              <button className="close-btn" onClick={() => setTxSheetOpen(false)}>×</button>
            </div>

            <div className="field-group">
              <label>{t('Workspace', 'প্রোফাইল')}</label>
              <div className="segmented-control">
                {['Home', 'Office'].map((profile) => (
                  <button
                    key={profile}
                    className={txProfile === profile ? 'active' : ''}
                    onClick={() => {
                      setTxProfile(profile);
                      setTxCategory(
                        [...BASE_CATEGORIES[profile], ...data.custom[profile]][0]?.name || 'Groceries',
                      );
                    }}
                  >
                    {profile === 'Home' ? '🏠' : '🏢'} {t(profile === 'Home' ? 'Home' : 'Office', profile === 'Home' ? 'বাসা' : 'অফিস')}
                  </button>
                ))}
              </div>
            </div>

            <div className="field-group">
              <label>{t('Type', 'ধরন')}</label>
              <div className="segmented-control">
                <button className={txType === 'expense' ? 'active' : ''} onClick={() => setTxType('expense')}>
                  {t('Expense', 'খরচ')}
                </button>
                <button className={txType === 'income' ? 'active' : ''} onClick={() => setTxType('income')}>
                  {t('Income', 'আয়')}
                </button>
              </div>
            </div>

            <div className="field-group">
              <label>{t('Category', 'খাত')}</label>
              <select value={txCategory} onChange={(e) => setTxCategory(e.target.value)}>
                {[...BASE_CATEGORIES[txProfile], ...data.custom[txProfile]].map((category) => (
                  <option value={category.name} key={`${category.name}-${txProfile}`}>
                    {category.emoji} {language === 'bn' ? (category.bn || category.name) : category.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="field-group">
              <label>{t('Amount (৳)', 'পরিমাণ (৳)')}</label>
              <input
                type="number"
                min="1"
                inputMode="decimal"
                value={txAmount}
                onChange={(e) => setTxAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div className="two-col">
              <div className="field-group">
                <label>{t('Date', 'তারিখ')}</label>
                <input type="date" value={txDate} onChange={(e) => setTxDate(e.target.value)} />
              </div>
              <div className="field-group">
                <label>{t('Note (optional)', 'নোট (ঐচ্ছিক)')}</label>
                <input value={txNote} onChange={(e) => setTxNote(e.target.value)} placeholder="" />
              </div>
            </div>

            <button className="primary-btn" onClick={handleSaveTransaction}>
              {t('Save transaction', 'লেনদেন সংরক্ষণ করুন')}
            </button>

            <div className="sheet-note">
              {t('Transactions are added only when you save them. No recurring or automatic entries.', 'সংরক্ষণ করলেই শুধু লেনদেন যোগ হবে। কোনো স্বয়ংক্রিয় বা পুনরাবৃত্ত এন্ট্রি নেই।')}
            </div>
          </div>
        </div>
      )}

      {catSheetOpen && (
        <div className="sheet-backdrop" onClick={(e) => e.target === e.currentTarget && setCatSheetOpen(false)}>
          <div className="sheet-panel">
            <div className="grabber" />
            <div className="sheet-head">
              <h3>{t('Add a category', 'নতুন খাত যোগ করুন')}</h3>
              <button className="close-btn" onClick={() => setCatSheetOpen(false)}>×</button>
            </div>

            <div className="field-group">
              <label>{t('Add to workspace', 'প্রোফাইল নির্বাচন করুন')}</label>
              <div className="segmented-control">
                {['Home', 'Office'].map((profile) => (
                  <button
                    key={profile}
                    className={catProfile === profile ? 'active' : ''}
                    onClick={() => setCatProfile(profile)}
                  >
                    {profile === 'Home' ? '🏠' : '🏢'} {t(profile === 'Home' ? 'Home' : 'Office', profile === 'Home' ? 'বাসা' : 'অফিস')}
                  </button>
                ))}
              </div>
            </div>

            <div className="field-group">
              <label>{t('Category name', 'খাতের নাম')}</label>
              <input value={catName} onChange={(e) => setCatName(e.target.value)} placeholder="e.g. Pet care / পোষা প্রাণী" />
            </div>

            <div className="field-group">
              <label>{t('Emoji', 'ইমোজি')}</label>
              <input maxLength="4" value={catEmoji} onChange={(e) => setCatEmoji(e.target.value)} />
            </div>

            <button className="primary-btn" onClick={handleSaveCategory}>
              {t('Add category', 'খাত যোগ করুন')}
            </button>

            <div className="sheet-note">
              {t('Custom categories belong to the selected workspace only.', 'কাস্টম খাত শুধু নির্বাচিত প্রোফাইলেই যোগ হবে।')}
            </div>
          </div>
        </div>
      )}

      {monthSheetOpen && (
        <div className="sheet-backdrop" onClick={(e) => e.target === e.currentTarget && setMonthSheetOpen(false)}>
          <div className="sheet-panel small-sheet">
            <div className="grabber" />
            <div className="sheet-head">
              <h3>{t('Choose month', 'মাস নির্বাচন করুন')}</h3>
              <button className="close-btn" onClick={() => setMonthSheetOpen(false)}>×</button>
            </div>
            <div className="field-group">
              <label>{t('Month', 'মাস')}</label>
              <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
            </div>
            <button className="primary-btn" onClick={() => setMonthSheetOpen(false)}>
              {t('Done', 'সম্পন্ন')}
            </button>
          </div>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </>
  );
}

export default App;
