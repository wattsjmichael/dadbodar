CREATE TABLE IF NOT EXISTS labels (
 id TEXT PRIMARY KEY, internalName TEXT NOT NULL UNIQUE, displayName TEXT NOT NULL,
 sourceImage TEXT NOT NULL DEFAULT '', targetFile TEXT NOT NULL DEFAULT '',
 targetType TEXT NOT NULL CHECK(targetType IN ('flat','cylindrical','conical')),
 targetName TEXT NOT NULL UNIQUE, physicalWidth REAL, physicalHeight REAL,
 circumference REAL, radius REAL, radiusTop REAL, radiusBottom REAL,
 status TEXT NOT NULL CHECK(status IN ('draft','active','disabled')),
 createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS experiences (
 id TEXT PRIMARY KEY, name TEXT NOT NULL, slug TEXT NOT NULL UNIQUE,
 description TEXT NOT NULL DEFAULT '', thumbnail TEXT NOT NULL DEFAULT '',
 experienceType TEXT NOT NULL CHECK(experienceType IN ('GAME','BREWER_TOUR','STORY','CUSTOM')),
 implementationKey TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('draft','active','disabled')),
 config TEXT NOT NULL DEFAULT '{}', createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS label_experience_assignments (
 id TEXT PRIMARY KEY, labelId TEXT NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
 experienceId TEXT NOT NULL REFERENCES experiences(id) ON DELETE CASCADE,
 enabled INTEGER NOT NULL CHECK(enabled IN (0,1)), priority INTEGER NOT NULL DEFAULT 0,
 overrides TEXT NOT NULL DEFAULT '{}', createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL,
 UNIQUE(labelId, experienceId)
);
CREATE INDEX IF NOT EXISTS assignment_label ON label_experience_assignments(labelId, priority);
CREATE INDEX IF NOT EXISTS assignment_experience ON label_experience_assignments(experienceId);
CREATE TABLE IF NOT EXISTS app_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
