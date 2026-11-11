import { useEffect, useMemo, useState } from 'react';
import './index.css';

const STORAGE_KEY = 'hisab-todo-tasks-v1';
const FILTERS = ['all', 'active', 'completed'];

function loadTasks() {
  try {
    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(stored)
      ? stored.filter((task) => task && typeof task.id === 'string' && typeof task.title === 'string')
      : [];
  } catch {
    return [];
  }
}

function formatDueDate(value) {
  if (!value) return '';
  const due = new Date(`${value}T00:00:00`);
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(due);
}

function dueState(value, completed) {
  if (!value || completed) return '';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(`${value}T00:00:00`);
  if (due < today) return 'overdue';
  if (due.getTime() === today.getTime()) return 'due-today';
  return '';
}

function App() {
  const [tasks, setTasks] = useState(loadTasks);
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState('normal');
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [storageAvailable, setStorageAvailable] = useState(true);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
      setStorageAvailable(true);
    } catch {
      setStorageAvailable(false);
    }
  }, [tasks]);

  const completedCount = tasks.filter((task) => task.completed).length;
  const activeCount = tasks.length - completedCount;
  const progress = tasks.length ? Math.round((completedCount / tasks.length) * 100) : 0;

  const visibleTasks = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return tasks
      .filter((task) => {
        if (filter === 'active' && task.completed) return false;
        if (filter === 'completed' && !task.completed) return false;
        return !query || `${task.title} ${task.details || ''}`.toLocaleLowerCase().includes(query);
      })
      .sort((a, b) => {
        if (a.completed !== b.completed) return Number(a.completed) - Number(b.completed);
        const priorityRank = { high: 0, normal: 1, low: 2 };
        if (!a.completed && priorityRank[a.priority] !== priorityRank[b.priority]) {
          return priorityRank[a.priority] - priorityRank[b.priority];
        }
        if (a.dueDate && b.dueDate && a.dueDate !== b.dueDate) return a.dueDate.localeCompare(b.dueDate);
        if (a.dueDate) return -1;
        if (b.dueDate) return 1;
        return b.createdAt - a.createdAt;
      });
  }, [tasks, filter, search]);

  function addTask(event) {
    event.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle) return;

    setTasks((current) => [{
      id: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      title: cleanTitle,
      details: details.trim(),
      dueDate,
      priority,
      completed: false,
      createdAt: Date.now(),
    }, ...current]);
    setTitle('');
    setDetails('');
    setDueDate('');
    setPriority('normal');
  }

  function toggleTask(id) {
    setTasks((current) => current.map((task) => task.id === id ? { ...task, completed: !task.completed } : task));
  }

  function deleteTask(id) {
    setTasks((current) => current.filter((task) => task.id !== id));
  }

  function clearCompleted() {
    setTasks((current) => current.filter((task) => !task.completed));
  }

  const todayLabel = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date());

  return (
    <main className="todo-app">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Hisab tasks home">
          <span className="brand-mark" aria-hidden="true">✓</span>
          <span>Hisab <small>tasks</small></span>
        </a>
        <div className="local-badge"><span className="local-dot" /> Saved on this device</div>
      </header>

      <section className="welcome" id="top">
        <div className="date-label">{todayLabel}</div>
        <h1>A little more <span>done.</span></h1>
        <p>Keep your day clear. Add a task, take it one step at a time.</p>
      </section>

      <section className="overview glass" aria-label="Task progress">
        <div className="overview-copy">
          <div className="overline">YOUR PROGRESS</div>
          <strong>{activeCount}<span> {activeCount === 1 ? 'task' : 'tasks'} left</span></strong>
          <div className="progress-caption">{completedCount} of {tasks.length} completed</div>
        </div>
        <div className="progress-ring" style={{ '--progress': `${progress}%` }} role="img" aria-label={`${progress}% complete`}>
          <div><b>{progress}%</b><small>done</small></div>
        </div>
      </section>

      <section className="composer glass" aria-labelledby="add-heading">
        <div className="composer-heading">
          <div className="add-icon" aria-hidden="true">＋</div>
          <div><h2 id="add-heading">Add a task</h2><p>Make it small. Make it doable.</p></div>
        </div>
        <form onSubmit={addTask}>
          <label className="sr-only" htmlFor="task-title">Task name</label>
          <input id="task-title" className="task-input" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="What needs to get done?" maxLength={120} required />
          <label className="sr-only" htmlFor="task-details">Details (optional)</label>
          <input id="task-details" className="details-input" value={details} onChange={(event) => setDetails(event.target.value)} placeholder="Add a note (optional)" maxLength={240} />
          <div className="composer-bottom">
            <div className="form-options">
              <label className="date-control" title="Optional due date">
                <span aria-hidden="true">▦</span>
                <span className="sr-only">Due date</span>
                <input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} aria-label="Due date (optional)" />
              </label>
              <label className="priority-control">
                <span className="priority-indicator" data-priority={priority} />
                <span className="sr-only">Priority</span>
                <select value={priority} onChange={(event) => setPriority(event.target.value)} aria-label="Task priority">
                  <option value="low">Low priority</option>
                  <option value="normal">Normal priority</option>
                  <option value="high">High priority</option>
                </select>
              </label>
            </div>
            <button className="add-button" type="submit" disabled={!title.trim()}>Add task <span aria-hidden="true">↗</span></button>
          </div>
        </form>
      </section>

      <section className="task-section" aria-labelledby="tasks-heading">
        <div className="task-toolbar">
          <div><div className="overline">YOUR LIST</div><h2 id="tasks-heading">Tasks <span className="count-pill">{activeCount}</span></h2></div>
          <label className="search-box"><span aria-hidden="true">⌕</span><span className="sr-only">Search tasks</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search" /></label>
        </div>

        <div className="list-controls">
          <div className="filter-tabs" role="tablist" aria-label="Filter tasks">
            {FILTERS.map((item) => <button key={item} role="tab" aria-selected={filter === item} className={filter === item ? 'selected' : ''} onClick={() => setFilter(item)}>{item[0].toUpperCase() + item.slice(1)}{item === 'all' && <span>{tasks.length}</span>}</button>)}
          </div>
          {completedCount > 0 && <button className="clear-button" onClick={clearCompleted}>Clear completed</button>}
        </div>

        <div className="task-list" aria-live="polite">
          {visibleTasks.length > 0 ? visibleTasks.map((task) => {
            const urgency = dueState(task.dueDate, task.completed);
            return <article className={`task-row glass ${task.completed ? 'is-completed' : ''}`} key={task.id}>
              <button className={`check-button ${task.completed ? 'checked' : ''}`} onClick={() => toggleTask(task.id)} aria-label={task.completed ? `Mark ${task.title} as active` : `Complete ${task.title}`}>
                {task.completed && <span aria-hidden="true">✓</span>}
              </button>
              <div className="task-content">
                <div className="task-title-line"><h3>{task.title}</h3><span className={`priority-tag priority-${task.priority}`}>{task.priority}</span></div>
                {task.details && <p className="task-details">{task.details}</p>}
                {task.dueDate && <div className={`due-label ${urgency}`}><span aria-hidden="true">◷</span>{urgency === 'overdue' ? 'Overdue · ' : urgency === 'due-today' ? 'Due today · ' : 'Due · '}{formatDueDate(task.dueDate)}</div>}
              </div>
              <button className="delete-button" onClick={() => deleteTask(task.id)} aria-label={`Delete ${task.title}`} title="Delete task">×</button>
            </article>;
          }) : <div className="empty-state glass">
            <div className="empty-symbol" aria-hidden="true">{tasks.length === 0 ? '✳' : search ? '⌕' : '✓'}</div>
            <h3>{tasks.length === 0 ? 'A fresh start.' : search ? 'No matching tasks.' : filter === 'active' ? 'All caught up.' : 'Nothing here yet.'}</h3>
            <p>{tasks.length === 0 ? 'Add your first task above and it will stay saved on this device.' : search ? 'Try another search phrase.' : filter === 'active' ? 'You have completed everything on your list.' : 'Tasks you complete will show up here.'}</p>
          </div>}
        </div>
      </section>

      <footer className="footer-note">
        <span className="footer-check">✓</span>
        {storageAvailable ? 'Your tasks are saved locally on this device.' : 'Storage is unavailable. Keep this page open to retain your changes.'}
      </footer>
    </main>
  );
}

export default App;
