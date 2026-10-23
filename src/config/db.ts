import dns from "node:dns";
import mongoose from "mongoose";
import { env } from "./env.js";

/**
 * Point Node at reliable DNS resolvers before any connection is attempted.
 *
 * `mongodb+srv://` URIs are resolved through SRV DNS records. Several popular
 * resolvers - including loopback filtering proxies that listen on 127.0.0.1 -
 * answer those queries with REFUSED, so the driver reports
 * `querySrv ECONNREFUSED` even though the cluster is reachable and the OS
 * itself resolves the name fine. Using public resolvers removes that class of
 * failure entirely. Overridable via DNS_SERVERS.
 */
export function configureDns(): void {
  if (env.dnsServers.length > 0) {
    dns.setServers(env.dnsServers);
  }
}

/** Opens the shared Mongoose connection. Call once during startup. */
export async function connectDatabase(): Promise<void> {
  configureDns();
  mongoose.set("strictQuery", true);

  await mongoose.connect(env.MONGODB_URI, {
    serverSelectionTimeoutMS: 15_000,
  });
}

/** Reported by the health endpoint so uptime checks see a stalled database. */
export function databaseStatus(): "connected" | "disconnected" {
  return mongoose.connection.readyState === 1 ? "connected" : "disconnected";
}

/** Closes the connection during a graceful shutdown. */
export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
}
