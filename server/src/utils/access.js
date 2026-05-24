import { Document } from "../models/Document.js";
import { Notebook } from "../models/Notebook.js";

const roleWeight = {
  none: 0,
  viewer: 1,
  editor: 2,
  owner: 3
};

export function strongestRole(...roles) {
  return roles.reduce((best, role) => {
    return roleWeight[role] > roleWeight[best] ? role : best;
  }, "none");
}

export function canRead(role) {
  return roleWeight[role] >= roleWeight.viewer;
}

export function canEdit(role) {
  return roleWeight[role] >= roleWeight.editor;
}

export async function getDocumentAccess({ documentId, userId, shareId }) {
  const document = await Document.findById(documentId).populate("notebook");

  if (!document) {
    return { document: null, role: "none" };
  }

  const role = await getRoleForDocument({ document, userId, shareId });
  return { document, role };
}

export async function getRoleForDocument({ document, userId, shareId }) {
  const user = userId ? userId.toString() : null;
  const notebook = document.notebook?.owner ? document.notebook : await Notebook.findById(document.notebook);

  if (user && document.owner.toString() === user) {
    return "owner";
  }

  let notebookRole = "none";
  if (user && notebook) {
    if (notebook.owner.toString() === user) {
      notebookRole = "owner";
    } else {
      const member = notebook.members.find((entry) => entry.user.toString() === user);
      notebookRole = member?.role || "none";
    }
  }

  const collaborator = user
    ? document.collaborators.find((entry) => entry.user.toString() === user)
    : null;

  const shareRole =
    shareId && document.shareId === shareId && document.shareRole !== "off"
      ? document.shareRole
      : "none";

  return strongestRole(notebookRole, collaborator?.role || "none", shareRole);
}

export async function getNotebookRole(notebookId, userId) {
  const notebook = await Notebook.findById(notebookId);

  if (!notebook) {
    return { notebook: null, role: "none" };
  }

  if (notebook.owner.toString() === userId.toString()) {
    return { notebook, role: "owner" };
  }

  const member = notebook.members.find((entry) => entry.user.toString() === userId.toString());
  return { notebook, role: member?.role || "none" };
}
