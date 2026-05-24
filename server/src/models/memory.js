import { nanoid } from "nanoid";

const store = {
  users: [],
  notebooks: [],
  documents: []
};

class Id {
  constructor(value = nanoid(12)) {
    this.value = value;
  }

  equals(other) {
    return this.toString() === normalizeId(other);
  }

  toString() {
    return this.value;
  }

  toJSON() {
    return this.value;
  }
}

function normalizeId(value) {
  if (!value) return "";
  if (value instanceof Id) return value.toString();
  if (value._id) return normalizeId(value._id);
  return value.toString();
}

function now() {
  return new Date();
}

function matches(doc, filter = {}) {
  if (filter.$or) {
    return filter.$or.some((entry) => matches(doc, entry));
  }

  return Object.entries(filter).every(([key, expected]) => {
    if (expected && typeof expected === "object" && "$in" in expected) {
      const actual = getPath(doc, key);
      return expected.$in.some((entry) => normalizeId(entry) === normalizeId(actual));
    }

    const actual = getPath(doc, key);

    if (Array.isArray(actual)) {
      return actual.some((entry) => normalizeId(entry) === normalizeId(expected));
    }

    return normalizeId(actual) === normalizeId(expected);
  });
}

function getPath(doc, path) {
  return path.split(".").reduce((value, key) => {
    if (Array.isArray(value)) {
      return value.map((entry) => entry?.[key]);
    }
    return value?.[key];
  }, doc);
}

function sortItems(items, sortSpec) {
  if (!sortSpec) return items;
  const [[key, direction]] = Object.entries(sortSpec);
  return [...items].sort((a, b) => {
    const left = new Date(a[key]).getTime();
    const right = new Date(b[key]).getTime();
    return direction < 0 ? right - left : left - right;
  });
}

class Query {
  constructor(items, single = false) {
    this.items = items;
    this.single = single;
    this.sortSpec = null;
    this.populatePaths = [];
  }

  sort(spec) {
    this.sortSpec = spec;
    return this;
  }

  select() {
    return this;
  }

  populate(path) {
    this.populatePaths.push(path);
    return this;
  }

  async exec() {
    const raw = this.single ? this.items[0] || null : sortItems(this.items, this.sortSpec);
    const result = Array.isArray(raw) ? raw : raw ? [raw] : [];

    for (const doc of result) {
      for (const path of this.populatePaths) {
        await doc.populate(path);
      }
    }

    return this.single ? result[0] || null : result;
  }

  then(resolve, reject) {
    return this.exec().then(resolve, reject);
  }
}

class BaseDoc {
  constructor(data) {
    Object.assign(this, data);
    this._id = data._id instanceof Id ? data._id : new Id(data._id);
    this.createdAt = data.createdAt || now();
    this.updatedAt = data.updatedAt || now();
  }

  toString() {
    return this._id.toString();
  }

  equals(other) {
    return this._id.equals(other);
  }

  toJSON() {
    const json = { ...this };
    json._id = this._id.toString();
    delete json.__v;
    return json;
  }

  async populate() {
    return this;
  }
}

class UserDoc extends BaseDoc {
  async save() {
    this.updatedAt = now();
    upsert(store.users, this);
    return this;
  }

  async deleteOne() {
    removeById(store.users, this._id);
  }

  toJSON() {
    const json = super.toJSON();
    delete json.passwordHash;
    return json;
  }
}

class NotebookDoc extends BaseDoc {
  constructor(data) {
    super(data);
    this.members = data.members || [];
    this.color = data.color || "#496651";
  }

  async save() {
    this.updatedAt = now();
    upsert(store.notebooks, this);
    return this;
  }

  async deleteOne() {
    removeById(store.notebooks, this._id);
  }

  async populate(path) {
    if (path === "owner") {
      this.owner = findById(store.users, this.owner) || this.owner;
    }

    if (path === "members.user") {
      this.members = this.members.map((member) => ({
        ...member,
        user: findById(store.users, member.user) || member.user
      }));
    }

    return this;
  }
}

class DocumentDoc extends BaseDoc {
  constructor(data) {
    super(data);
    this.content = data.content || { ops: [{ insert: "\n" }] };
    this.plainText = data.plainText || "";
    this.shareRole = data.shareRole || "off";
    this.collaborators = data.collaborators || [];
  }

  async save() {
    this.updatedAt = now();
    upsert(store.documents, this);
    return this;
  }

  async deleteOne() {
    removeById(store.documents, this._id);
  }

  async populate(path) {
    if (path === "owner") {
      this.owner = findById(store.users, this.owner) || this.owner;
    }

    if (path === "notebook") {
      this.notebook = findById(store.notebooks, this.notebook) || this.notebook;
    }

    if (path === "collaborators.user") {
      this.collaborators = this.collaborators.map((collaborator) => ({
        ...collaborator,
        user: findById(store.users, collaborator.user) || collaborator.user
      }));
    }

    return this;
  }
}

function upsert(collection, doc) {
  const index = collection.findIndex((entry) => entry._id.equals(doc._id));
  if (index >= 0) {
    collection[index] = doc;
  } else {
    collection.push(doc);
  }
}

function removeById(collection, id) {
  const index = collection.findIndex((entry) => entry._id.equals(id));
  if (index >= 0) {
    collection.splice(index, 1);
  }
}

function findById(collection, id) {
  return collection.find((entry) => entry._id.equals(id)) || null;
}

export const MemoryUser = {
  async create(data) {
    const user = new UserDoc(data);
    await user.save();
    return user;
  },
  findOne(filter) {
    return new Query(store.users.filter((user) => matches(user, filter)), true);
  },
  findById(id) {
    return new Query(store.users.filter((user) => user._id.equals(id)), true);
  }
};

export const MemoryNotebook = {
  async create(data) {
    const notebook = new NotebookDoc(data);
    await notebook.save();
    return notebook;
  },
  find(filter) {
    return new Query(store.notebooks.filter((notebook) => matches(notebook, filter)));
  },
  findById(id) {
    return new Query(store.notebooks.filter((notebook) => notebook._id.equals(id)), true);
  },
  async deleteMany(filter) {
    const matchesToDelete = store.notebooks.filter((notebook) => matches(notebook, filter));
    matchesToDelete.forEach((notebook) => removeById(store.notebooks, notebook._id));
  }
};

export const MemoryDocument = {
  async create(data) {
    const document = new DocumentDoc(data);
    await document.save();
    return document;
  },
  find(filter) {
    return new Query(store.documents.filter((document) => matches(document, filter)));
  },
  findOne(filter) {
    return new Query(store.documents.filter((document) => matches(document, filter)), true);
  },
  findById(id) {
    return new Query(store.documents.filter((document) => document._id.equals(id)), true);
  },
  async findByIdAndUpdate(id, update) {
    const document = findById(store.documents, id);
    if (!document) return null;
    Object.assign(document, update);
    await document.save();
    return document;
  },
  async deleteMany(filter) {
    const matchesToDelete = store.documents.filter((document) => matches(document, filter));
    matchesToDelete.forEach((document) => removeById(store.documents, document._id));
  }
};
