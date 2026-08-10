(function exposeStorage(root, factory) {
  const schema = typeof module === "object" && module.exports ? require("./schema.js") : root.RentaLocSchema;
  const api = factory(schema);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.RentaLocStorage = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createStorageModule({
  SIMULATION_SCHEMA_VERSION,
  normalizeValues,
  validateSchema,
}) {
  const PROJECTS_STORAGE_KEY = "rentaloc-projects-v1";
  const RECOVERY_STORAGE_KEY = `${PROJECTS_STORAGE_KEY}-recovery`;
  const PROJECTS_ENVELOPE_VERSION = 2;
  const MAX_PROJECTS = 50;
  const MAX_PROJECT_NAME_LENGTH = 80;
  const MAX_PROJECT_ID_LENGTH = 120;

  function validDate(value) {
    return typeof value === "string" && Number.isFinite(Date.parse(value));
  }

  function normalizeProject(project) {
    if (!project || typeof project !== "object" || Array.isArray(project)) return null;
    if (typeof project.id !== "string" || project.id.length < 1 || project.id.length > MAX_PROJECT_ID_LENGTH) return null;
    if (typeof project.name !== "string") return null;
    const name = project.name.trim().slice(0, MAX_PROJECT_NAME_LENGTH);
    if (!name || !project.values || typeof project.values !== "object" || Array.isArray(project.values)) return null;
    const values = normalizeValues(project.values);
    if (validateSchema(values).length > 0) return null;
    const fallbackDate = new Date(0).toISOString();
    const createdAt = validDate(project.createdAt) ? project.createdAt : fallbackDate;
    const updatedAt = validDate(project.updatedAt) ? project.updatedAt : createdAt;
    return { id: project.id, name, values, createdAt, updatedAt };
  }

  function createProjectRepository(storage, options = {}) {
    const key = options.key || PROJECTS_STORAGE_KEY;
    const recoveryKey = options.recoveryKey || RECOVERY_STORAGE_KEY;

    function preserveForRecovery(raw, reason) {
      if (!raw) return false;
      try {
        storage.setItem(
          recoveryKey,
          JSON.stringify({ preservedAt: new Date().toISOString(), reason, raw }),
        );
        return true;
      } catch {
        return false;
      }
    }

    function load() {
      let raw;
      try {
        raw = storage.getItem(key);
      } catch {
        return {
          projects: [],
          message: "Le stockage local est inaccessible. Les simulations ne pourront pas être restaurées.",
          shouldPersist: false,
        };
      }
      if (!raw) return { projects: [], message: "", shouldPersist: false };

      let parsed;
      try {
        parsed = JSON.parse(raw);
      } catch {
        const preserved = preserveForRecovery(raw, "invalid-json");
        return {
          projects: [],
          message: preserved
            ? "Les sauvegardes locales étaient illisibles. Une copie brute a été conservée sous la clé de récupération."
            : "Les sauvegardes locales sont illisibles et n'ont pas pu être copiées pour récupération.",
          shouldPersist: false,
        };
      }

      const legacy = Array.isArray(parsed);
      if (!legacy && (!parsed || typeof parsed !== "object" || parsed.version !== PROJECTS_ENVELOPE_VERSION || !Array.isArray(parsed.projects))) {
        const preserved = preserveForRecovery(raw, "unsupported-envelope");
        return {
          projects: [],
          message: preserved
            ? "Le format des sauvegardes n'est pas reconnu. Les données originales ont été conservées pour récupération."
            : "Le format des sauvegardes n'est pas reconnu.",
          shouldPersist: false,
        };
      }

      const sourceProjects = legacy ? parsed : parsed.projects;
      const normalized = sourceProjects.slice(0, MAX_PROJECTS).map(normalizeProject);
      const projects = normalized.filter(Boolean);
      const skipped = sourceProjects.length - projects.length;
      if (skipped > 0) preserveForRecovery(raw, "invalid-or-excess-projects");
      const messages = [];
      if (legacy) messages.push("Les sauvegardes locales ont été migrées vers le format versionné.");
      if (skipped > 0) messages.push(`${skipped} sauvegarde(s) invalide(s) ou excédentaire(s) ont été écartées et conservées pour récupération.`);
      return {
        projects,
        message: messages.join(" "),
        shouldPersist: legacy || skipped > 0,
      };
    }

    function save(projects) {
      const normalized = Array.isArray(projects)
        ? projects.slice(0, MAX_PROJECTS).map(normalizeProject).filter(Boolean)
        : [];
      const envelope = {
        version: PROJECTS_ENVELOPE_VERSION,
        simulationSchemaVersion: SIMULATION_SCHEMA_VERSION,
        savedAt: new Date().toISOString(),
        projects: normalized,
      };
      try {
        storage.setItem(key, JSON.stringify(envelope));
        return {
          ok: normalized.length === Math.min(Array.isArray(projects) ? projects.length : 0, MAX_PROJECTS),
          projects: normalized,
          message:
            normalized.length === Math.min(Array.isArray(projects) ? projects.length : 0, MAX_PROJECTS)
              ? ""
              : "Certaines simulations invalides n'ont pas été enregistrées.",
        };
      } catch {
        return {
          ok: false,
          projects: normalized,
          message: "Sauvegarde locale indisponible ou quota dépassé. Exportez vos données avant de fermer la page.",
        };
      }
    }

    return Object.freeze({ key, recoveryKey, load, save });
  }

  return Object.freeze({
    MAX_PROJECTS,
    MAX_PROJECT_NAME_LENGTH,
    PROJECTS_ENVELOPE_VERSION,
    PROJECTS_STORAGE_KEY,
    RECOVERY_STORAGE_KEY,
    createProjectRepository,
    normalizeProject,
  });
});
