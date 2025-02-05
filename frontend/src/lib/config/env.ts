// src/config/env.ts

interface EnvConfig {
  API_URL: string;
  NODE_ENV: string;
  AUTH_URL: string;
  MICROSOFT_CLIENT_ID: string;
  MICROSOFT_TENANT_ID: string;
  MICROSOFT_AUTH_URL: string;
}

const getEnvVar = (key: string): string => {
  // Try NEXT_PUBLIC_ prefix first
  let value = process.env[`NEXT_PUBLIC_${key}`];

  // If not found, try without the prefix
  if (!value) {
    value = process.env[key];
  }

  if (!value) {
    console.log(value)
    // throw new Error(
    //   `Missing environment variable: ${key} or NEXT_PUBLIC_${key}`
    // );
  }
  return value;
};

export const env: EnvConfig = {
  API_URL: getEnvVar("API_URL"),
  NODE_ENV: process.env.NODE_ENV || "development",
  AUTH_URL: getEnvVar("AUTH_URL"),
  MICROSOFT_CLIENT_ID: getEnvVar("MICROSOFT_CLIENT_ID"),
  MICROSOFT_TENANT_ID: getEnvVar("MICROSOFT_TENANT_ID"),
  MICROSOFT_AUTH_URL: getEnvVar("MICROSOFT_AUTH_URL"),
};

// API endpoints
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: `${env.API_URL}/auth/login`,
    REGISTER: `${env.API_URL}/auth/register`,
    REFRESH: `${env.API_URL}/auth/refresh`,
    LOGOUT: `${env.API_URL}/auth/logout`,
    ME: `${env.API_URL}/auth/me`,
  },
  CONNECTORS: {
    BASE: `${env.API_URL}/connectors`,
    ONEDRIVE: `${env.API_URL}/connectors/onedrive`,
    FOLDER: `${env.API_URL}/connectors/folder`,
  },
  DOCUMENTS: {
    BASE: `${env.API_URL}/documents`,
    SEARCH: `${env.API_URL}/documents/search`,
    VERSIONS: `${env.API_URL}/documents/versions`,
  },
  WORKSPACE: {
    BASE: `${env.API_URL}/workspace`,
    ACTIVITY: `${env.API_URL}/workspace/activity`,
    COMMENTS: `${env.API_URL}/workspace/comments`,
  },
};

// HTTP Headers
export const HTTP_HEADERS = {
  "Content-Type": "application/json",
  Accept: "application/json",
};

// Cache keys for React Query
export const CACHE_KEYS = {
  USER: "user",
  CONNECTORS: "connectors",
  DOCUMENTS: "documents",
  WORKSPACE: "workspace",
  COMMENTS: "comments",
  ACTIVITY: "activity",
};
