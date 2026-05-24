import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import {
  AlertTriangle,
  BookOpen,
  FileText,
  LogOut,
  Pencil,
  Plus,
  Save,
  Search,
  Send,
  Settings,
  Trash2,
  Users,
  X
} from "lucide-react";
import EmptyState from "../components/EmptyState.jsx";
import Logo from "../components/Logo.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { api, getErrorMessage } from "../lib/api.js";

const notebookColors = ["#496651", "#c07155", "#3f6f8f", "#7b6856", "#936f9f"];

function getNotebookRole(notebook, user) {
  if (notebook.owner?._id === user?._id || notebook.owner === user?._id) {
    return "owner";
  }

  return notebook.members?.find((member) => member.user?._id === user?._id || member.user === user?._id)?.role || "viewer";
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, logout, updateSession } = useAuth();
  const [notebooks, setNotebooks] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [query, setQuery] = useState("");
  const [newNotebook, setNewNotebook] = useState("");
  const [newDocument, setNewDocument] = useState("");
  const [member, setMember] = useState({ email: "", role: "editor" });
  const [notebookRole, setNotebookRole] = useState("viewer");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [accountForm, setAccountForm] = useState({ name: user?.name || "", email: user?.email || "", currentPassword: "", password: "" });
  const [deleteAccountForm, setDeleteAccountForm] = useState({ currentPassword: "", confirmation: "" });
  const [renameNotebook, setRenameNotebook] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    loadNotebooks();
  }, []);

  useEffect(() => {
    setAccountForm((current) => ({
      ...current,
      name: user?.name || "",
      email: user?.email || ""
    }));
  }, [user]);

  useEffect(() => {
    if (selectedId) {
      loadDocuments(selectedId);
    } else {
      setDocuments([]);
    }
  }, [selectedId]);

  async function loadNotebooks() {
    try {
      const { data } = await api.get("/notebooks");
      setNotebooks(data.notebooks);
      setSelectedId((current) => current || data.notebooks[0]?._id || "");
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function loadDocuments(notebookId) {
    try {
      const { data } = await api.get(`/notebooks/${notebookId}/documents`);
      setDocuments(data.documents);
      setNotebookRole(data.role);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function createNotebook(event) {
    event.preventDefault();
    if (!newNotebook.trim()) return;

    const color = notebookColors[notebooks.length % notebookColors.length];
    try {
      setError("");
      setNotice("");
      const { data } = await api.post("/notebooks", { name: newNotebook.trim(), color });
      setNewNotebook("");
      setNotebooks((current) => [data.notebook, ...current]);
      setSelectedId(data.notebook._id);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function createDocument(event) {
    event.preventDefault();
    if (!newDocument.trim() || !selectedId) return;

    try {
      setError("");
      const { data } = await api.post(`/notebooks/${selectedId}/documents`, { title: newDocument.trim() });
      navigate(`/documents/${data.document._id}`);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function addMember(event) {
    event.preventDefault();
    if (!member.email.trim() || !selectedId) return;

    try {
      setError("");
      setNotice("");
      const { data } = await api.post(`/notebooks/${selectedId}/members`, member);
      setMember({ email: "", role: "editor" });
      setNotebooks((current) => current.map((notebook) => (notebook._id === data.notebook._id ? data.notebook : notebook)));
      setNotice("Notebook member updated.");
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function saveAccount(event) {
    event.preventDefault();
    setError("");
    setNotice("");

    try {
      const payload = {
        name: accountForm.name,
        email: accountForm.email
      };

      if (accountForm.password) {
        payload.currentPassword = accountForm.currentPassword;
        payload.password = accountForm.password;
      }

      const { data } = await api.patch("/auth/me", payload);
      updateSession(data.token, data.user);
      setAccountForm((current) => ({ ...current, currentPassword: "", password: "" }));
      setNotice("Account settings saved.");
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function deleteAccount(event) {
    event.preventDefault();
    setError("");

    try {
      await api.delete("/auth/me", { data: deleteAccountForm });
      logout();
      navigate("/signup");
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function updateNotebook(event) {
    event.preventDefault();
    if (!selectedNotebook || !renameNotebook.trim()) return;

    try {
      setError("");
      setNotice("");
      const { data } = await api.patch(`/notebooks/${selectedNotebook._id}`, { name: renameNotebook.trim() });
      setNotebooks((current) => current.map((notebook) => (notebook._id === data.notebook._id ? data.notebook : notebook)));
      setRenameNotebook("");
      setNotice("Notebook renamed.");
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function deleteNotebook() {
    if (!selectedNotebook) return;
    const confirmed = window.confirm(`Delete "${selectedNotebook.name}" and all documents inside it?`);
    if (!confirmed) return;

    try {
      setError("");
      setNotice("");
      await api.delete(`/notebooks/${selectedNotebook._id}`);
      const remaining = notebooks.filter((notebook) => notebook._id !== selectedNotebook._id);
      setNotebooks(remaining);
      setSelectedId(remaining[0]?._id || "");
      setDocuments([]);
      setNotice("Notebook deleted.");
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  const selectedNotebook = notebooks.find((notebook) => notebook._id === selectedId);
  const filteredDocuments = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return documents;
    return documents.filter((document) => {
      return `${document.title} ${document.plainText}`.toLowerCase().includes(normalized);
    });
  }, [documents, query]);
  const canEditNotebook = ["owner", "editor"].includes(notebookRole);
  const isNotebookOwner = notebookRole === "owner";

  return (
    <main className="min-h-screen bg-paper text-ink">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[320px_1fr]">
        <aside className="border-b border-ink/10 bg-white/70 px-5 py-5 lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between">
            <Logo />
            <div className="flex gap-1">
              <button
                className="grid h-10 w-10 place-items-center rounded-lg text-ink/60 transition hover:bg-mist hover:text-ink"
                onClick={() => setSettingsOpen(true)}
                title="Account settings"
              >
                <Settings size={19} />
              </button>
              <button
                className="grid h-10 w-10 place-items-center rounded-lg text-ink/60 transition hover:bg-mist hover:text-ink"
                onClick={logout}
                title="Sign out"
              >
                <LogOut size={19} />
              </button>
            </div>
          </div>

          <div className="mt-8 rounded-lg border border-ink/10 bg-paper p-4">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-ink/45">Signed in</p>
            <p className="mt-2 font-bold">{user?.name}</p>
            <p className="truncate text-sm text-ink/55">{user?.email}</p>
            <button className="mt-4 flex items-center gap-2 text-sm font-bold text-moss hover:underline" onClick={() => setSettingsOpen(true)}>
              <Settings size={15} />
              Account settings
            </button>
          </div>

          <form onSubmit={createNotebook} className="mt-5 flex gap-2">
            <input
              className="min-w-0 flex-1 rounded-lg border border-ink/10 bg-white px-3 py-2 text-sm outline-none focus:border-moss focus:ring-4 focus:ring-moss/10"
              value={newNotebook}
              onChange={(event) => setNewNotebook(event.target.value)}
              placeholder="New notebook"
            />
            <button className="grid h-10 w-10 place-items-center rounded-lg bg-ink text-paper transition hover:bg-moss" title="Create notebook">
              <Plus size={18} />
            </button>
          </form>

          <nav className="mt-5 space-y-2">
            {notebooks.map((notebook) => (
              <button
                key={notebook._id}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition ${
                  selectedId === notebook._id ? "bg-ink text-paper shadow-soft" : "hover:bg-mist"
                }`}
                onClick={() => setSelectedId(notebook._id)}
              >
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: notebook.color }} />
                <span className="min-w-0 flex-1 truncate font-bold">{notebook.name}</span>
                <span className="text-xs opacity-65">{getNotebookRole(notebook, user)}</span>
              </button>
            ))}
          </nav>
        </aside>

        <section className="px-5 py-6 sm:px-8 lg:px-10">
          <header className="flex flex-col gap-5 border-b border-ink/10 pb-6 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="mb-2 flex items-center gap-2 text-sm font-bold text-moss">
                <BookOpen size={17} />
                Workspace
              </p>
              <h1 className="text-4xl font-extrabold tracking-normal">{selectedNotebook?.name || "Create your first notebook"}</h1>
              <p className="mt-3 max-w-2xl text-ink/60">
                Organize documents by notebook, invite teammates by email, and open shared notes with live editing.
              </p>
            </div>
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" size={18} />
              <input
                className="w-full rounded-lg border border-ink/10 bg-white px-10 py-3 outline-none focus:border-moss focus:ring-4 focus:ring-moss/10"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search documents"
              />
            </div>
          </header>

          {error && <p className="mt-5 rounded-lg bg-clay/10 px-4 py-3 text-sm font-semibold text-clay">{error}</p>}
          {notice && <p className="mt-5 rounded-lg bg-moss/10 px-4 py-3 text-sm font-semibold text-moss">{notice}</p>}

          <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_340px]">
            <div>
              <form onSubmit={createDocument} className="mb-5 flex gap-2">
                <input
                  className="min-w-0 flex-1 rounded-lg border border-ink/10 bg-white px-4 py-3 outline-none focus:border-moss focus:ring-4 focus:ring-moss/10"
                  value={newDocument}
                  onChange={(event) => setNewDocument(event.target.value)}
                  placeholder={canEditNotebook ? "Draft title for a new document" : "Read-only notebook"}
                  disabled={!canEditNotebook}
                />
                <button
                  className="flex items-center gap-2 rounded-lg bg-ink px-4 py-3 font-bold text-paper transition hover:bg-moss disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={!canEditNotebook}
                >
                  <Plus size={18} />
                  New
                </button>
              </form>

              {filteredDocuments.length === 0 ? (
                <EmptyState title="No documents yet" body="Create a document to start writing with rich formatting and real-time sync." />
              ) : (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {filteredDocuments.map((document) => (
                    <Link
                      key={document._id}
                      to={`/documents/${document._id}`}
                      className="group rounded-lg border border-ink/10 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-moss/30 hover:shadow-soft"
                    >
                      <div className="mb-4 flex items-start justify-between gap-3">
                        <div className="grid h-10 w-10 place-items-center rounded-lg bg-mist text-ink">
                          <FileText size={19} />
                        </div>
                        <span className="rounded-full bg-paper px-2 py-1 text-xs font-bold text-ink/55">{document.shareRole === "off" ? "Private" : "Shared"}</span>
                      </div>
                      <h2 className="line-clamp-2 text-lg font-extrabold group-hover:text-moss">{document.title}</h2>
                      <p className="mt-3 line-clamp-3 min-h-[4.5rem] text-sm leading-6 text-ink/55">
                        {document.plainText || "A clean page ready for ideas."}
                      </p>
                      <p className="mt-5 text-xs font-bold uppercase tracking-[0.14em] text-ink/40">
                        Updated {formatDistanceToNow(new Date(document.updatedAt), { addSuffix: true })}
                      </p>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <aside className="space-y-5">
              <div className="rounded-lg border border-ink/10 bg-white p-5">
                <div className="mb-4 flex items-center gap-2">
                  <Pencil size={18} />
                  <h2 className="font-extrabold">Notebook options</h2>
                </div>
                <p className="text-sm leading-6 text-ink/60">
                  Rename or delete notebooks you own. Editors can still create documents, but only owners manage the container.
                </p>
                <form onSubmit={updateNotebook} className="mt-4 flex gap-2">
                  <input
                    className="min-w-0 flex-1 rounded-lg border border-ink/10 bg-paper px-3 py-2 text-sm outline-none focus:border-moss focus:ring-4 focus:ring-moss/10"
                    value={renameNotebook}
                    onChange={(event) => setRenameNotebook(event.target.value)}
                    placeholder={selectedNotebook?.name || "Notebook name"}
                    disabled={!isNotebookOwner}
                  />
                  <button
                    className="grid h-10 w-10 place-items-center rounded-lg bg-ink text-paper disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={!isNotebookOwner || !renameNotebook.trim()}
                    title="Rename notebook"
                  >
                    <Save size={16} />
                  </button>
                </form>
                <button
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-clay/30 bg-clay/10 px-3 py-2 text-sm font-bold text-clay transition hover:bg-clay hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={deleteNotebook}
                  disabled={!isNotebookOwner || !selectedNotebook}
                >
                  <Trash2 size={16} />
                  Delete notebook
                </button>
              </div>

              <div className="rounded-lg border border-ink/10 bg-white p-5">
                <div className="mb-4 flex items-center gap-2">
                  <Users size={18} />
                  <h2 className="font-extrabold">Notebook access</h2>
                </div>
                <p className="text-sm leading-6 text-ink/60">
                  Owners can invite members with read-only or edit access across this notebook.
                </p>
                <form onSubmit={addMember} className="mt-4 space-y-3">
                  <input
                    className="w-full rounded-lg border border-ink/10 bg-paper px-3 py-2 text-sm outline-none focus:border-moss focus:ring-4 focus:ring-moss/10"
                    value={member.email}
                    onChange={(event) => setMember((current) => ({ ...current, email: event.target.value }))}
                    placeholder="teammate@example.com"
                    disabled={notebookRole !== "owner"}
                  />
                  <div className="flex gap-2">
                    <select
                      className="min-w-0 flex-1 rounded-lg border border-ink/10 bg-paper px-3 py-2 text-sm outline-none focus:border-moss focus:ring-4 focus:ring-moss/10"
                      value={member.role}
                      onChange={(event) => setMember((current) => ({ ...current, role: event.target.value }))}
                      disabled={notebookRole !== "owner"}
                    >
                      <option value="editor">Can edit</option>
                      <option value="viewer">Read only</option>
                    </select>
                    <button
                      className="grid h-10 w-10 place-items-center rounded-lg bg-moss text-white disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={notebookRole !== "owner"}
                      title="Invite member"
                    >
                      <Send size={16} />
                    </button>
                  </div>
                </form>
              </div>
            </aside>
          </div>
        </section>
      </div>

      {settingsOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/35 p-4 backdrop-blur-sm">
          <section className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-paper p-5 shadow-soft sm:p-6">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-extrabold">Account settings</h2>
                <p className="mt-2 text-sm leading-6 text-ink/60">Update your profile, change your password, or remove your account.</p>
              </div>
              <button className="grid h-10 w-10 place-items-center rounded-lg hover:bg-mist" onClick={() => setSettingsOpen(false)} title="Close">
                <X size={19} />
              </button>
            </div>

            {error && <p className="mb-4 rounded-lg bg-clay/10 px-4 py-3 text-sm font-semibold text-clay">{error}</p>}
            {notice && <p className="mb-4 rounded-lg bg-moss/10 px-4 py-3 text-sm font-semibold text-moss">{notice}</p>}

            <form onSubmit={saveAccount} className="space-y-4">
              <label className="block">
                <span className="text-sm font-bold text-ink/70">Name</span>
                <input
                  className="mt-2 w-full rounded-lg border border-ink/10 bg-white px-4 py-3 outline-none focus:border-moss focus:ring-4 focus:ring-moss/10"
                  value={accountForm.name}
                  onChange={(event) => setAccountForm((current) => ({ ...current, name: event.target.value }))}
                />
              </label>
              <label className="block">
                <span className="text-sm font-bold text-ink/70">Email</span>
                <input
                  className="mt-2 w-full rounded-lg border border-ink/10 bg-white px-4 py-3 outline-none focus:border-moss focus:ring-4 focus:ring-moss/10"
                  value={accountForm.email}
                  onChange={(event) => setAccountForm((current) => ({ ...current, email: event.target.value }))}
                  type="email"
                />
              </label>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-bold text-ink/70">Current password</span>
                  <input
                    className="mt-2 w-full rounded-lg border border-ink/10 bg-white px-4 py-3 outline-none focus:border-moss focus:ring-4 focus:ring-moss/10"
                    value={accountForm.currentPassword}
                    onChange={(event) => setAccountForm((current) => ({ ...current, currentPassword: event.target.value }))}
                    placeholder="Required for password change"
                    type="password"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-bold text-ink/70">New password</span>
                  <input
                    className="mt-2 w-full rounded-lg border border-ink/10 bg-white px-4 py-3 outline-none focus:border-moss focus:ring-4 focus:ring-moss/10"
                    value={accountForm.password}
                    onChange={(event) => setAccountForm((current) => ({ ...current, password: event.target.value }))}
                    placeholder="Leave blank to keep current"
                    type="password"
                    minLength={8}
                  />
                </label>
              </div>
              <button className="flex items-center gap-2 rounded-lg bg-ink px-4 py-3 font-bold text-paper transition hover:bg-moss">
                <Save size={18} />
                Save account
              </button>
            </form>

            <form onSubmit={deleteAccount} className="mt-8 rounded-lg border border-clay/30 bg-clay/10 p-4">
              <div className="mb-4 flex items-center gap-2 text-clay">
                <AlertTriangle size={19} />
                <h3 className="font-extrabold">Delete account</h3>
              </div>
              <p className="text-sm leading-6 text-ink/65">
                This deletes your user account, owned notebooks, and owned documents. Type DELETE and enter your password to confirm.
              </p>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <input
                  className="rounded-lg border border-clay/20 bg-white px-4 py-3 outline-none focus:border-clay focus:ring-4 focus:ring-clay/10"
                  value={deleteAccountForm.currentPassword}
                  onChange={(event) => setDeleteAccountForm((current) => ({ ...current, currentPassword: event.target.value }))}
                  placeholder="Current password"
                  type="password"
                />
                <input
                  className="rounded-lg border border-clay/20 bg-white px-4 py-3 outline-none focus:border-clay focus:ring-4 focus:ring-clay/10"
                  value={deleteAccountForm.confirmation}
                  onChange={(event) => setDeleteAccountForm((current) => ({ ...current, confirmation: event.target.value }))}
                  placeholder="DELETE"
                />
              </div>
              <button
                className="mt-4 flex items-center gap-2 rounded-lg bg-clay px-4 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
                disabled={deleteAccountForm.confirmation !== "DELETE" || !deleteAccountForm.currentPassword}
              >
                <Trash2 size={18} />
                Delete account
              </button>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
