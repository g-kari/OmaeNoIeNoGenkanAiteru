import { execFile } from "node:child_process";
import { GhCliError, GhNotFoundError, GhNotAuthenticatedError } from "../types.js";

export async function ghApi(
  endpoint: string,
  options?: { method?: string; field?: string[] },
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const args = ["api", endpoint];
    if (options?.method) {
      args.push("--method", options.method);
    }
    if (options?.field) {
      for (const f of options.field) {
        args.push("-f", f);
      }
    }

    execFile("gh", args, (err, stdout, stderr) => {
      if (err) {
        const code = (err as NodeJS.ErrnoException).code;
        if (code === "ENOENT") {
          return reject(new GhNotFoundError());
        }
        return reject(new GhCliError(stderr || err.message, typeof code === "number" ? code : undefined, stderr));
      }
      try {
        resolve(JSON.parse(stdout));
      } catch {
        resolve(stdout);
      }
    });
  });
}

export async function ghGraphQL(
  query: string,
  variables?: Record<string, unknown>,
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const args = ["api", "graphql", "-f", `query=${query}`];
    if (variables) {
      for (const [key, value] of Object.entries(variables)) {
        args.push("-f", `${key}=${String(value)}`);
      }
    }

    execFile("gh", args, (err, stdout, stderr) => {
      if (err) {
        const code = (err as NodeJS.ErrnoException).code;
        if (code === "ENOENT") {
          return reject(new GhNotFoundError());
        }
        return reject(new GhCliError(stderr || err.message, typeof code === "number" ? code : undefined, stderr));
      }
      try {
        resolve(JSON.parse(stdout));
      } catch {
        resolve(stdout);
      }
    });
  });
}

export async function checkGhAuth(): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile("gh", ["auth", "status"], (err, _stdout, stderr) => {
      if (err) {
        const code = (err as NodeJS.ErrnoException).code;
        if (code === "ENOENT") {
          return reject(new GhNotFoundError());
        }
        if (stderr && stderr.includes("not logged")) {
          return reject(new GhNotAuthenticatedError());
        }
        return reject(new GhCliError(stderr || err.message));
      }
      resolve();
    });
  });
}
