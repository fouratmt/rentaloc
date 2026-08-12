(function exposeStorage(root, factory) {
  const schema = typeof module === "object" && module.exports ? require("./schema.js") : root.RentaLocSchema;
  const api = factory(schema);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.RentaLocStorage = api;
})(
  typeof globalThis !== "undefined" ? globalThis : this,
  function createStorageModule({ SIMULATION_SCHEMA_VERSION, normalizeValues, validateSchema }) {
    const PROJECTS_STORAGE_KEY = "rentaloc-projects-v1";
    const RECOVERY_STORAGE_KEY = `${PROJECTS_STORAGE_KEY}-recovery`;
    const PROJECTS_ENVELOPE_VERSION = 2;
    const MAX_PROJECTS = 50;
    const MAX_IMPORT_BYTES = 1024 * 1024;
    const MAX_PROJECT_NAME_LENGTH = 80;
    const MAX_PROJECT_ID_LENGTH = 120;

    function validDate(value) {
      return typeof value === "string" && Number.isFinite(Date.parse(value));
    }

    function normalizeProject(project) {
      if (!project || typeof project !== "object" || Array.isArray(project)) return null;
      if (typeof project.id !== "string" || project.id.length < 1 || project.id.length > MAX_PROJECT_ID_LENGTH)
        return null;
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

    function createEnvelope(projects, now = () => new Date()) {
      return {
        version: PROJECTS_ENVELOPE_VERSION,
        simulationSchemaVersion: SIMULATION_SCHEMA_VERSION,
        savedAt: now().toISOString(),
        projects,
      };
    }

    function getSerializedByteLength(value) {
      if (typeof globalThis.TextEncoder === "function") return new globalThis.TextEncoder().encode(value).byteLength;
      return value.length;
    }

    function serializeProjectExport(projects, now) {
      if (!Array.isArray(projects) || projects.length > MAX_PROJECTS) {
        return { ok: false, message: "Le portefeuille à exporter est invalide." };
      }
      const normalized = projects.map(normalizeProject);
      if (normalized.some((project) => !project)) {
        return { ok: false, message: "Une simulation sauvegardée est invalide." };
      }

      try {
        const value = JSON.stringify(createEnvelope(normalized, now));
        if (getSerializedByteLength(value) > MAX_IMPORT_BYTES) {
          return { ok: false, message: "La sauvegarde dépasse la limite de 1 Mo." };
        }
        return { ok: true, value };
      } catch {
        return { ok: false, message: "La sauvegarde n’a pas pu être préparée." };
      }
    }

    function parseProjectImport(raw) {
      if (typeof raw !== "string") {
        return { ok: false, message: "Le fichier de sauvegarde est illisible." };
      }
      if (getSerializedByteLength(raw) > MAX_IMPORT_BYTES) {
        return { ok: false, message: "Le fichier dépasse la limite de 1 Mo." };
      }

      let parsed;
      try {
        parsed = JSON.parse(raw);
      } catch {
        return { ok: false, message: "Le fichier n’est pas un JSON valide." };
      }

      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        return { ok: false, message: "Le format de sauvegarde n’est pas reconnu." };
      }
      if (parsed.version !== PROJECTS_ENVELOPE_VERSION) {
        return { ok: false, message: "Cette version de sauvegarde n’est pas prise en charge." };
      }
      if (parsed.simulationSchemaVersion !== SIMULATION_SCHEMA_VERSION) {
        return { ok: false, message: "Le schéma des simulations n’est pas compatible." };
      }
      if (!Array.isArray(parsed.projects) || parsed.projects.length > MAX_PROJECTS) {
        return { ok: false, message: `Le fichier doit contenir au maximum ${MAX_PROJECTS} simulations.` };
      }

      const projects = parsed.projects.map(normalizeProject);
      if (projects.some((project) => !project)) {
        return { ok: false, message: "Le fichier contient une simulation invalide." };
      }
      return { ok: true, projects };
    }

    function createProjectRepository(storage, options = {}) {
      const key = options.key || PROJECTS_STORAGE_KEY;
      const recoveryKey = options.recoveryKey || RECOVERY_STORAGE_KEY;

      function preserveForRecovery(raw, reason) {
        if (!raw) return false;
        try {
          storage.setItem(recoveryKey, JSON.stringify({ preservedAt: new Date().toISOString(), reason, raw }));
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
        if (
          !legacy &&
          (!parsed ||
            typeof parsed !== "object" ||
            parsed.version !== PROJECTS_ENVELOPE_VERSION ||
            parsed.simulationSchemaVersion !== SIMULATION_SCHEMA_VERSION ||
            !Array.isArray(parsed.projects))
        ) {
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
        if (skipped > 0)
          messages.push(
            `${skipped} sauvegarde(s) invalide(s) ou excédentaire(s) ont été écartées et conservées pour récupération.`,
          );
        return {
          projects,
          message: messages.join(" "),
          shouldPersist: legacy || skipped > 0,
        };
      }

      function save(projects) {
        const sourceProjects = Array.isArray(projects) ? projects : [];
        if (sourceProjects.length > MAX_PROJECTS) {
          return {
            ok: false,
            projects: sourceProjects.slice(),
            message: `La limite de ${MAX_PROJECTS} simulations est atteinte. Supprimez une simulation avant d'en enregistrer une nouvelle.`,
          };
        }
        const normalized = sourceProjects.map(normalizeProject).filter(Boolean);
        if (normalized.length !== sourceProjects.length) {
          return {
            ok: false,
            projects: sourceProjects.slice(),
            message: "Certaines simulations sont invalides. Aucune sauvegarde n'a été modifiée.",
          };
        }
        const envelope = createEnvelope(normalized);
        try {
          storage.setItem(key, JSON.stringify(envelope));
          return {
            ok: true,
            projects: normalized,
            message: "",
          };
        } catch {
          return {
            ok: false,
            projects: sourceProjects.slice(),
            message:
              "Sauvegarde locale indisponible ou quota dépassé. Les simulations existantes n'ont pas été modifiées. Libérez de l'espace dans le navigateur et réessayez.",
          };
        }
      }

      return Object.freeze({ key, recoveryKey, load, save });
    }

    return Object.freeze({
      MAX_PROJECTS,
      MAX_IMPORT_BYTES,
      MAX_PROJECT_NAME_LENGTH,
      PROJECTS_ENVELOPE_VERSION,
      PROJECTS_STORAGE_KEY,
      RECOVERY_STORAGE_KEY,
      createProjectRepository,
      parseProjectImport,
      serializeProjectExport,
      normalizeProject,
    });
  },
);
