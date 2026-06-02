import { useState, useEffect } from 'react';
import { apiFetch, getBadge } from './api';

// --- ADMIN DASHBOARD COMPONENT ---
export function AdminDash({ db, refreshDb, currentUser }) {
    const [createForm, setCreateForm] = useState({ role: 'student', username: '', password: '', name: '', id: '' });
    const [editForm, setEditForm] = useState({ role: 'student', username: '', password: '', name: '', id: '' });
    const [editingUser, setEditingUser] = useState(null);

    const [createMsg, setCreateMsg] = useState('');
    const [editMsg, setEditMsg] = useState('');
    const [modifySearch, setModifySearch] = useState({ name: '', id: '' });

    const [paginatedUsers, setPaginatedUsers] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false); // Global panel submission lock state

    const loadUserPage = async (pageNumber) => {
        setIsSubmitting(true);
        try {
            const data = await apiFetch(`/api/users/paginated?page=${pageNumber}&limit=5`);
            setPaginatedUsers(data.users);
            setCurrentPage(data.currentPage);
            setTotalPages(data.totalPages);
        } catch (e) {
            console.error("Failed to load page", e);
        } finally {
            setIsSubmitting(false);
        }
    };

    useEffect(() => {
        loadUserPage(1);
    }, []);

    const handleCreate = async () => {
        if (!createForm.username) return alert("Username required.");
        if (!createForm.password) return alert("Password required for new accounts.");
        if (createForm.role !== 'admin' && (!createForm.name || !createForm.id)) return alert("Name and ID are required for students and professors.");

        setIsSubmitting(true);
        try {
            if (db.users.find(u => u.username === createForm.username)) return alert("Username already exists.");

            await apiFetch(`/api/users`, 'POST', createForm);
            setCreateMsg("Account created successfully!");
            setTimeout(() => setCreateMsg(''), 3000);

            refreshDb();
            loadUserPage(currentPage);
            setCreateForm({ role: 'student', username: '', password: '', name: '', id: '' });
        } catch (e) { alert(e.message); }
        finally { setIsSubmitting(false); }
    };

    const handleUpdate = async () => {
        if (editForm.role !== 'admin' && (!editForm.name || !editForm.id)) return alert("Name and ID are required for students and professors.");

        setIsSubmitting(true);
        try {
            await apiFetch(`/api/users/${editingUser}`, 'PUT', editForm);
            setEditMsg("Account updated successfully!");
            setTimeout(() => setEditMsg(''), 3000);

            refreshDb();
            loadUserPage(currentPage);
            setTimeout(() => cancelEdit(), 3000);
        } catch (e) { alert(e.message); }
        finally { setIsSubmitting(false); }
    };

    const editUser = (u) => {
        setEditingUser(u.username);
        setEditForm({ role: u.role, username: u.username, password: '', name: u.name || '', id: u.id || '' });
        setEditMsg('');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const cancelEdit = () => {
        setEditingUser(null);
        setEditForm({ role: 'student', username: '', password: '', name: '', id: '' });
        setEditMsg('');
    };

    const deleteUser = async (username) => {
        if (username === currentUser.username) return alert("You cannot delete your currently active account.");
        if (!confirm(`Are you sure you want to permanently delete the user '${username}'?`)) return;

        setIsSubmitting(true);
        try {
            await apiFetch(`/api/users/${username}`, 'DELETE');
            refreshDb();
            loadUserPage(currentPage);
            if (editingUser === username) cancelEdit();
        } catch (e) { console.error(e); }
        finally { setIsSubmitting(false); }
    };

    const filterUsers = (users, searchCriteria) => {
        return users.filter(u => {
            const matchName = searchCriteria.name === '' || (u.name || '').toLowerCase().includes(searchCriteria.name.toLowerCase());
            const matchId = searchCriteria.id === '' || (u.id || '').toLowerCase().includes(searchCriteria.id.toLowerCase());
            return matchName && matchId;
        });
    };

    const filteredForModify = filterUsers(paginatedUsers || [], modifySearch);

    return (
        <div id="admin-dashboard">
            {/* CREATE ACCOUNT PANEL */}
            <details className="glass-panel" open>
                <summary className="accordion-header">Create New Account</summary>
                <div className="accordion-body">
                    <div className="grid-container" style={{ gridTemplateColumns: '1fr 1fr', alignItems: 'end' }}>
                        <div className="form-group">
                            <label>Role</label>
                            <select value={createForm.role} disabled={isSubmitting} onChange={e => setCreateForm({ ...createForm, role: e.target.value })}>
                                <option value="student">Student</option>
                                <option value="professor">Professor</option>
                                <option value="admin">Admin</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Username</label>
                            <input type="text" value={createForm.username} disabled={isSubmitting} onChange={e => setCreateForm({ ...createForm, username: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label>Password</label>
                            <input type="password" placeholder="Enter password..." value={createForm.password} disabled={isSubmitting} onChange={e => setCreateForm({ ...createForm, password: e.target.value })} />
                        </div>
                        {createForm.role !== 'admin' && (
                            <>
                                <div className="form-group">
                                    <label>Full Name</label>
                                    <input type="text" value={createForm.name} disabled={isSubmitting} onChange={e => setCreateForm({ ...createForm, name: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label>Official ID Number</label>
                                    <input type="text" value={createForm.id} disabled={isSubmitting} onChange={e => setCreateForm({ ...createForm, id: e.target.value })} />
                                </div>
                            </>
                        )}
                        <div className="action-group" style={{ marginBottom: '20px' }}>
                            <button onClick={handleCreate} disabled={isSubmitting}>
                                {isSubmitting ? "Waking up server..." : "Create Account"}
                            </button>
                        </div>
                    </div>
                    <p style={{ color: 'var(--brand-primary)', fontWeight: 'bold' }}>{createMsg}</p>
                </div>
            </details>

            {/* EDIT ACCOUNT PANEL */}
            {editingUser && (
                <details className="glass-panel" open style={{ border: '2px solid #3498db' }}>
                    <summary className="accordion-header" style={{ color: '#3498db' }}>Editing Account: {editingUser}</summary>
                    <div className="accordion-body">
                        <div className="grid-container" style={{ gridTemplateColumns: '1fr 1fr', alignItems: 'end' }}>
                            <div className="form-group">
                                <label>Role</label>
                                <select value={editForm.role} disabled={isSubmitting} onChange={e => setEditForm({ ...editForm, role: e.target.value })}>
                                    <option value="student">Student</option>
                                    <option value="professor">Professor</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Username</label>
                                <input type="text" value={editForm.username} disabled />
                            </div>
                            <div className="form-group">
                                <label>New Password (Optional)</label>
                                <input type="password" placeholder="Leave blank to keep current password" value={editForm.password} disabled={isSubmitting} onChange={e => setEditForm({ ...editForm, password: e.target.value })} />
                            </div>
                            {editForm.role !== 'admin' && (
                                <>
                                    <div className="form-group">
                                        <label>Full Name</label>
                                        <input type="text" value={editForm.name} disabled={isSubmitting} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
                                    </div>
                                    <div className="form-group">
                                        <label>Official ID Number</label>
                                        <input type="text" value={editForm.id} disabled={isSubmitting} onChange={e => setEditForm({ ...editForm, id: e.target.value })} />
                                    </div>
                                </>
                            )}
                            <div className="action-group" style={{ marginBottom: '20px' }}>
                                <button onClick={handleUpdate} style={{ background: '#3498db!important' }} disabled={isSubmitting}>
                                    {isSubmitting ? "Waking up server..." : "Update Account"}
                                </button>
                                <button onClick={cancelEdit} style={{ background: '#7f8c8d!important' }} disabled={isSubmitting}>Cancel Edit</button>
                            </div>
                        </div>
                        <p style={{ color: '#3498db', fontWeight: 'bold' }}>{editMsg}</p>
                    </div>
                </details>
            )}

            {/* MODIFY ACCOUNTS DIRECTORY */}
            <details className="glass-panel">
                <summary className="accordion-header">Modify Accounts</summary>
                <div className="accordion-body">
                    <div className="grid-container" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: '25px', paddingBottom: '20px', borderBottom: '1px solid #eee' }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label>Search by Full Name</label>
                            <input type="text" placeholder="Type name..." value={modifySearch.name} disabled={isSubmitting} onChange={e => setModifySearch({ ...modifySearch, name: e.target.value })} />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label>Search by ID</label>
                            <input type="text" placeholder="Type ID..." value={modifySearch.id} disabled={isSubmitting} onChange={e => setModifySearch({ ...modifySearch, id: e.target.value })} />
                        </div>
                    </div>

                    <div className="grid-container">
                        {filteredForModify.length === 0 ? <p>No users match this search on the current page.</p> : filteredForModify.map(u => (
                            <div key={`mod-${u.username}`} className="grid-card">
                                <div>
                                    <div className="card-header">{u.username}</div>
                                    <div className="card-meta">
                                        <strong>Role:</strong> <span style={{ textTransform: 'capitalize' }}>{u.role}</span><br />
                                        {u.role !== 'admin' ? <><strong>Name:</strong> {u.name} <br /> <strong>ID:</strong> {u.id}</> : ''}
                                    </div>
                                </div>
                                <div className="action-group">
                                    <button onClick={() => editUser(u)} disabled={isSubmitting}>Edit</button>
                                    {u.username !== currentUser.username ? <button onClick={() => deleteUser(u.username)} style={{ background: '#e74c3c!important' }} disabled={isSubmitting}>Delete</button> : ''}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* PAGINATION CONTROLS */}
                    {totalPages > 1 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', padding: '15px', background: 'white', borderRadius: '8px', border: '1px solid #eee' }}>
                            <button onClick={() => loadUserPage(currentPage - 1)} disabled={currentPage === 1 || isSubmitting} style={{ background: currentPage === 1 ? '#bdc3c7' : '#3498db', margin: 0 }}>
                                &larr; Previous
                            </button>
                            <span style={{ fontWeight: 'bold', color: '#555' }}>
                                {isSubmitting ? "Waking up server..." : `Page ${currentPage} of ${totalPages}`}
                            </span>
                            <button onClick={() => loadUserPage(currentPage + 1)} disabled={currentPage >= totalPages || isSubmitting} style={{ background: currentPage >= totalPages ? '#bdc3c7' : '#3498db', margin: 0 }}>
                                Next &rarr;
                            </button>
                        </div>
                    )}
                </div>
            </details>
        </div>
    );
}

// --- PROFESSOR DASHBOARD COMPONENT ---
export function ProfessorDash({ db, refreshDb, currentUser }) {
    const [className, setClassName] = useState('');
    const [editingClassId, setEditingClassId] = useState(null);
    const [topicData, setTopicData] = useState({ title: '', classId: '' });
    const [editingTopicId, setEditingTopicId] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const myClasses = db.classes.filter(c => c.professor === currentUser.username);
    const myClassIds = myClasses.map(c => c.id);
    const myTopics = db.topics.filter(t => myClassIds.includes(t.classId) && !t.isArchived);

    const submitClass = async () => {
        if (!className) return alert("Class name cannot be empty.");
        setIsSubmitting(true);
        try {
            if (editingClassId) {
                await apiFetch(`/api/classes/${editingClassId}`, 'PUT', { title: className });
            } else {
                await apiFetch(`/api/classes`, 'POST', { id: Date.now().toString(), title: className });
            }
            setClassName(''); setEditingClassId(null); refreshDb();
        } catch (e) { alert(e.message); }
        finally { setIsSubmitting(false); }
    };

    const submitTopic = async () => {
        if (!topicData.title) return alert("Topic title cannot be empty.");
        if (!topicData.classId) return alert("You must create a class first.");
        setIsSubmitting(true);
        try {
            if (editingTopicId) {
                await apiFetch(`/api/topics/${editingTopicId}`, 'PUT', topicData);
            } else {
                await apiFetch(`/api/topics`, 'POST', { id: Date.now().toString(), classId: topicData.classId, title: topicData.title });
            }
            setTopicData({ title: '', classId: '' }); setEditingTopicId(null); refreshDb();
        } catch (e) { alert(e.message); }
        finally { setIsSubmitting(false); }
    };

    return (
        <div id="professor-dashboard">
            <details className="glass-panel">
                <summary className="accordion-header">Create, Edit, or Delete Classes</summary>
                <div className="accordion-body">
                    <div className="form-group" style={{ maxWidth: '500px' }}>
                        <label>{editingClassId ? 'Edit Class Title' : 'Enter Your Class'}</label>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <input type="text" placeholder="e.g. Computer Science 2026" value={className} disabled={isSubmitting} onChange={e => setClassName(e.target.value)} />
                            <button onClick={submitClass} disabled={isSubmitting}>
                                {isSubmitting ? "Waking up server..." : (editingClassId ? 'Update' : 'Create')}
                            </button>
                            {editingClassId && <button style={{ background: '#7f8c8d!important' }} disabled={isSubmitting} onClick={() => { setEditingClassId(null); setClassName(''); }}>Cancel</button>}
                        </div>
                    </div>
                    <h4 style={{ marginTop: '30px', color: '#333' }}>My Active Classes</h4>
                    <div className="grid-container">
                        {myClasses.length === 0 ? <p>You have not created any classes yet.</p> : myClasses.map(c => (
                            <div key={c.id} className="grid-card">
                                <div className="card-header">{c.title}</div>
                                <div className="action-group">
                                    <button onClick={() => { setEditingClassId(c.id); setClassName(c.title); }} disabled={isSubmitting}>Edit</button>
                                    <button onClick={async () => { if (confirm("Delete this class? All topics and registrations under it will be removed.")) { setIsSubmitting(true); try { await apiFetch(`/api/classes/${c.id}`, 'DELETE'); refreshDb(); } catch (e) { } finally { setIsSubmitting(false); } } }} style={{ background: '#e74c3c!important' }} disabled={isSubmitting}>Delete</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </details>

            <details className="glass-panel">
                <summary className="accordion-header">Create, Edit, or Delete Topics</summary>
                <div className="accordion-body">
                    <div className="grid-container" style={{ gridTemplateColumns: '1fr 2fr', alignItems: 'end' }}>
                        <div className="form-group">
                            <label>Select Associated Class</label>
                            <select value={topicData.classId} disabled={isSubmitting} onChange={e => setTopicData({ ...topicData, classId: e.target.value })}>
                                <option value="">-- Select --</option>
                                {myClasses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>New Topic Title</label>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <input type="text" placeholder="Enter graduation thesis topic..." value={topicData.title} disabled={isSubmitting} onChange={e => setTopicData({ ...topicData, title: e.target.value })} />
                                <button onClick={submitTopic} disabled={myClasses.length === 0 || isSubmitting}>
                                    {isSubmitting ? "Waking up server..." : (editingTopicId ? 'Update' : 'Publish')}
                                </button>
                                {editingTopicId && <button style={{ background: '#7f8c8d!important' }} disabled={isSubmitting} onClick={() => { setEditingTopicId(null); setTopicData({ title: '', classId: '' }); }}>Cancel</button>}
                            </div>
                        </div>
                    </div>
                    <h4 style={{ marginTop: '30px', color: '#333' }}>Published Topics</h4>
                    <div className="grid-container">
                        {myTopics.length === 0 ? <p>No active topics in your classes.</p> : myTopics.map(t => {
                            const className = db.classes.find(c => c.id === t.classId)?.title || "Unknown Class";
                            return (
                                <div key={t.id} className="grid-card">
                                    <div>
                                        <div className="card-header" style={{ fontSize: '16px' }}>{t.title}</div>
                                        <div className="card-meta">Class: {className}</div>
                                    </div>
                                    <div className="action-group">
                                        <button onClick={() => { setEditingTopicId(t.id); setTopicData({ title: t.title, classId: t.classId }); }} disabled={isSubmitting}>Edit</button>
                                        <button onClick={async () => { if (confirm("Are you sure you want to archive this topic?")) { setIsSubmitting(true); try { await apiFetch(`/api/topics/${t.id}`, 'DELETE'); refreshDb(); } catch (e) { } finally { setIsSubmitting(false); } } }} style={{ background: '#e74c3c!important' }} disabled={isSubmitting}>Archive</button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </details>

            <details className="glass-panel">
                <summary className="accordion-header">Approve or Deny Students to Join Your Class</summary>
                <div className="accordion-body">
                    <div className="grid-container">
                        {db.classAccess.filter(a => myClassIds.includes(a.classId)).map(acc => {
                            const studentInfo = db.users.find(u => u.username === acc.student);
                            const classInfo = db.classes.find(c => c.id === acc.classId);
                            const runAccessAction = async (status) => {
                                setIsSubmitting(true);
                                try { await apiFetch(`/api/access`, 'POST', { student: acc.student, classId: acc.classId, status }); refreshDb(); } catch (e) { } finally { setIsSubmitting(false); }
                            };
                            return (
                                <div key={acc.student + acc.classId} className="grid-card">
                                    <div>
                                        <div className="card-header">{studentInfo ? `${studentInfo.name} (ID: ${studentInfo.id})` : acc.student}</div>
                                        <div className="card-meta">
                                            Requested: <strong>{classInfo?.title}</strong><br />
                                            Status: {getBadge(acc.status)}
                                        </div>
                                    </div>
                                    {acc.status === 'Pending' ? (
                                        <div className="action-group">
                                            <button onClick={() => runAccessAction('Approved')} style={{ background: '#2ecc71!important' }} disabled={isSubmitting}>
                                                {isSubmitting ? "Waking up server..." : "Approve"}
                                            </button>
                                            <button onClick={() => runAccessAction('Denied')} style={{ background: '#e74c3c!important' }} disabled={isSubmitting}>
                                                {isSubmitting ? "Waking up server..." : "Deny"}
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="action-group">
                                            <button onClick={() => runAccessAction('Pending')} style={{ background: '#95a5a6!important' }} disabled={isSubmitting}>
                                                {isSubmitting ? "Waking up server..." : "Reset Status"}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>
            </details>

            <details className="glass-panel">
                <summary className="accordion-header">Approve or Deny Student Thesis Choices</summary>
                <div className="accordion-body">
                    <div className="grid-container">
                        {db.registrations.filter(r => myTopics.map(t => t.id).includes(r.topicId)).map(reg => {
                            const student = db.users.find(u => u.username === reg.student);
                            const topic = db.topics.find(t => t.id === reg.topicId);
                            const classInfo = topic ? db.classes.find(c => c.id === topic.classId) : null;
                            const runRegAction = async (status, reason = '') => {
                                setIsSubmitting(true);
                                try { await apiFetch(`/api/registrations`, 'POST', { student: reg.student, topicId: reg.topicId, status, reason }); refreshDb(); } catch (e) { } finally { setIsSubmitting(false); }
                            };
                            return (
                                <div key={reg.student} className="grid-card">
                                    <div>
                                        <div className="card-header">{student ? `${student.name} (ID: ${student.id})` : reg.student}</div>
                                        <div className="card-meta">
                                            <strong>Topic:</strong> {topic ? topic.title : 'Deleted Topic'}<br />
                                            <strong>Class:</strong> {classInfo ? classInfo.title : 'Unknown'}<br />
                                            <div style={{ marginTop: '10px' }}>Status: {getBadge(reg.status)}</div>
                                            {reg.status === 'Denied' && reg.reason ? <div style={{ marginTop: '5px', color: '#c0392b' }}><em>Note: {reg.reason}</em></div> : ''}
                                        </div>
                                    </div>
                                    {reg.status === 'Pending' ? (
                                        <div className="action-group" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                                            <input type="text" id={`reg-reason-${reg.student}`} placeholder="Reason for denial (if applicable)..." style={{ marginBottom: '8px' }} disabled={isSubmitting} />
                                            <div style={{ display: 'flex', gap: '10px' }}>
                                                <button style={{ flex: 1, background: '#2ecc71!important' }} onClick={() => runRegAction('Approved')} disabled={isSubmitting}>
                                                    {isSubmitting ? "Waking up server..." : "Approve"}
                                                </button>
                                                <button style={{ flex: 1, background: '#e74c3c!important' }} disabled={isSubmitting} onClick={() => {
                                                    const reason = document.getElementById(`reg-reason-${reg.student}`).value.trim();
                                                    if (!reason) return alert("You must provide a reason for denying this registration.");
                                                    runRegAction('Denied', reason);
                                                }}>
                                                    {isSubmitting ? "Waking up server..." : "Deny"}
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="action-group">
                                            <button onClick={() => runRegAction('Pending')} style={{ background: '#95a5a6!important' }} disabled={isSubmitting}>
                                                {isSubmitting ? "Waking up server..." : "Reset to Pending"}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>
            </details>
        </div>
    );
}

// --- STUDENT DASHBOARD COMPONENT ---
export function StudentDash({ db, refreshDb, currentUser }) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const myAccess = db.classAccess.filter(a => a.student === currentUser.username);
    const approvedClassIds = myAccess.filter(a => a.status === 'Approved').map(a => a.classId);
    const availableTopics = db.topics.filter(t => approvedClassIds.includes(t.classId) && !t.isArchived);
    const myReg = db.registrations.find(r => r.student === currentUser.username);

    return (
        <div id="student-dashboard">
            <details className="glass-panel">
                <summary className="accordion-header">Look for Classes to Join</summary>
                <div className="accordion-body">
                    <div className="grid-container">
                        {db.classes.length === 0 ? <p>No classes currently available.</p> : db.classes.map(c => {
                            const prof = db.users.find(u => u.username === c.professor);
                            const acc = myAccess.find(a => a.classId === c.id);
                            return (
                                <div key={c.id} className="grid-card">
                                    <div>
                                        <div className="card-header">{c.title}</div>
                                        <div className="card-meta">Professor: {prof ? `${prof.name} (ID: ${prof.id})` : c.professor}</div>
                                    </div>
                                    <div className="action-group">
                                        {!acc ? <button disabled={isSubmitting} onClick={async () => {
                                            setIsSubmitting(true);
                                            try { await apiFetch('/api/access', 'POST', { student: currentUser.username, classId: c.id, status: 'Pending' }); alert("Access request sent."); refreshDb(); } catch (e) { } finally { setIsSubmitting(false); }
                                        }}>
                                            {isSubmitting ? "Waking up server..." : "Request Access"}
                                        </button> : <div style={{ marginTop: '10px' }}>{getBadge(acc.status)}</div>}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </details>

            <details className="glass-panel">
                <summary className="accordion-header">Pick a Topic for Your Thesis</summary>
                <div className="accordion-body">
                    <div className="grid-container">
                        {approvedClassIds.length === 0 ? <p>You have not been approved for any classes yet.</p> :
                            availableTopics.length === 0 ? <p>Your approved classes currently have no active topics published.</p> :
                                availableTopics.map(t => {
                                    const classInfo = db.classes.find(c => c.id === t.classId);
                                    return (
                                        <div key={t.id} className="grid-card">
                                            <div>
                                                <div className="card-header" style={{ fontSize: '16px' }}>{t.title}</div>
                                                <div className="card-meta">Class: {classInfo.title}</div>
                                            </div>
                                            <div className="action-group">
                                                {myReg ? <span style={{ color: '#7f8c8d', fontSize: '13px', fontWeight: 600 }}>(Registration Locked)</span> :
                                                    <button disabled={isSubmitting} onClick={async () => {
                                                        setIsSubmitting(true);
                                                        try { await apiFetch('/api/registrations', 'POST', { student: currentUser.username, topicId: t.id, status: 'Pending', reason: '' }); alert("Registration submitted!"); refreshDb(); } catch (e) { } finally { setIsSubmitting(false); }
                                                    }}>
                                                        {isSubmitting ? "Waking up server..." : "Register for Topic"}
                                                    </button>}
                                            </div>
                                        </div>
                                    )
                                })}
                    </div>
                </div>
            </details>

            <details className="glass-panel">
                <summary className="accordion-header">My Thesis Status</summary>
                <div className="accordion-body">
                    <div>
                        {myReg ? (() => {
                            const topic = db.topics.find(t => t.id === myReg.topicId);
                            if (!topic || topic.isArchived) {
                                return (
                                    <>
                                        <div style={{ padding: '15px', borderRadius: '4px', backgroundColor: '#f2dede', color: '#a94442', border: '1px solid #ebccd1', marginBottom: '15px' }}>
                                            <strong>Alert:</strong> The topic you registered for was cancelled or archived by the faculty. Please select a new one.
                                        </div>
                                        <button disabled={isSubmitting} onClick={async () => {
                                            setIsSubmitting(true);
                                            try { await apiFetch(`/api/registrations/${currentUser.username}`, 'DELETE'); refreshDb(); } catch (e) { } finally { setIsSubmitting(false); }
                                        }}>
                                            {isSubmitting ? "Waking up server..." : "Acknowledge & Choose New Topic"}
                                        </button>
                                    </>
                                )
                            }
                            const classInfo = db.classes.find(c => c.id === topic.classId);
                            return (
                                <>
                                    <div style={{ fontSize: '16px', marginBottom: '20px' }}>
                                        <h4 style={{ margin: '0 0 5px 0', color: '#333' }}>{topic.title}</h4>
                                        <div style={{ color: '#666', fontSize: '14px', marginBottom: '15px' }}>Class: {classInfo ? classInfo.title : 'Unknown'}</div>
                                        {getBadge(myReg.status)}
                                    </div>
                                    {myReg.status === 'Denied' && myReg.reason && <div style={{ padding: '12px', background: 'rgba(192, 57, 43, 0.05)', borderLeft: '4px solid #c0392b', borderRadius: '4px', marginBottom: '20px' }}><strong>Faculty Feedback:</strong> {myReg.reason}</div>}
                                    <button onClick={async () => {
                                        if (confirm("Are you sure you want to clear your current registration?")) {
                                            setIsSubmitting(true);
                                            try { await apiFetch(`/api/registrations/${currentUser.username}`, 'DELETE'); refreshDb(); } catch (e) { } finally { setIsSubmitting(false); }
                                        }
                                    }} style={myReg.status === 'Denied' ? { background: '#e74c3c!important' } : {}} disabled={isSubmitting}>
                                        {isSubmitting ? "Waking up server..." : (myReg.status === 'Denied' ? 'Acknowledge & Clear Status' : 'Withdraw Registration')}
                                    </button>
                                </>
                            )
                        })() : <p style={{ margin: '0' }}>You have not registered for a graduation thesis topic yet.</p>}
                    </div>
                </div>
            </details>
        </div>
    );
}