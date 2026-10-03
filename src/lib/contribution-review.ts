export type ChangedFile = { filename: string; status: string };

export function assertDataOnlyDiff(files: unknown, kind: string) {
  if (!Array.isArray(files) || files.length < 2 || files.length > 3)
    throw new Error("Expected two or three generated data files.");
  const list = files as ChangedFile[];
  if (list.some((file) => !["added", "modified"].includes(file.status)))
    throw new Error("Generated PR cannot delete or rename files.");
  const changes = list.filter((file) => file.filename === "data/changes.json");
  const projects = list.filter((file) =>
    /^data\/projects\/[a-z0-9-]+\.json$/.test(file.filename),
  );
  const sources = list.filter((file) =>
    /^data\/sources\/[a-z0-9-]+\.json$/.test(file.filename),
  );
  if (
    changes.length !== 1 ||
    sources.length > 1 ||
    (kind === "source-correction" && sources.length !== 1) ||
    projects.length !==
      (kind === "source-correction" && list.length === 2 ? 0 : 1) ||
    changes.length + sources.length + projects.length !== list.length
  )
    throw new Error(
      "PR contains unexpected files or is missing generated data.",
    );
}
