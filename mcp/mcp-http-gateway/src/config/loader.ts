/**
 * Configuration loader with hot reload and backup support
 *
 * Features:
 * - Load and validate configuration
 * - Hot reload on file changes
 * - Automatic backup before changes
 *
 * @author lvdaxianerplus
 * @date 2026-04-19
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, watch, readdirSync, unlinkSync } from 'fs';
import { resolve, basename, join } from 'path';
import type { Config, HotReloadConfig, BackupConfig } from './types.js';
import { validateConfig, type ValidationResult } from './validator.js';
import {
  DEFAULT_TIMEOUT,
  DEFAULT_RETRY,
  DEFAULT_CIRCUIT_BREAKER,
  DEFAULT_CACHE,
  DEFAULT_LOGGING,
  DEFAULT_METRICS,
  DEFAULT_HEALTH_CHECK,
  DEFAULT_SERVER,
  DEFAULT_SQLITE_LOGGING,
  DEFAULT_COMPRESSION,
  DEFAULT_HOT_RELOAD,
  DEFAULT_BACKUP,
  DEFAULT_ALERT,
  DEFAULT_AUDIT,
} from './types.js';
import { logger } from '../middleware/logger.js';

// Current config path and loaded config
let currentConfigPath: string | null = null;
let currentConfig: Config | null = null;

// Reload callback
let onConfigReload: ((config: Config) => void) | null = null;

// Watcher instance
let watcher: ReturnType<typeof watch> | null = null;

/**
 * Load and parse configuration from JSON file
 *
 * @param configPath - Path to tools.json
 * @returns Parsed and validated configuration
 *
 * @author lvdaxianerplus
 * @date 2026-04-19
 */
export function loadConfig(configPath: string): Config {
  // Read file
  let rawConfig: string;
  try {
    rawConfig = readFileSync(resolve(configPath), 'utf-8');
  } catch (error) {
    throw new Error(`Config file not found: ${configPath}`);
  }

  // Parse JSON
  let config: unknown;
  try {
    config = JSON.parse(rawConfig);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Config file parse error: ${message}`);
  }

  // Validate
  const result: ValidationResult = validateConfig(config);
  if (!result.valid) {
    const errorMessages = result.errors.map((e) => `[ERROR] ${e.message}`);
    throw new Error(`Config validation failed:\n${errorMessages.join('\n')}`);
  }

  // Apply defaults and return
  const finalConfig = applyDefaults(config as Config);

  // Store current config path and config
  currentConfigPath = configPath;
  currentConfig = finalConfig;

  return finalConfig;
}

/**
 * Apply default values to configuration
 *
 * @param config - Raw configuration
 * @returns Configuration with defaults applied
 *
 * @author lvdaxianerplus
 * @date 2026-04-19
 */
function applyDefaults(config: Config): Config {
  return {
    ...config,
    timeout: { ...DEFAULT_TIMEOUT, ...config.timeout },
    retry: { ...DEFAULT_RETRY, ...config.retry },
    circuitBreaker: { ...DEFAULT_CIRCUIT_BREAKER, ...config.circuitBreaker },
    cache: { ...DEFAULT_CACHE, ...config.cache },
    logging: { ...DEFAULT_LOGGING, ...config.logging },
    metrics: { ...DEFAULT_METRICS, ...config.metrics },
    healthCheck: { ...DEFAULT_HEALTH_CHECK, ...config.healthCheck },
    server: { ...DEFAULT_SERVER, ...config.server },
    sqlite: { ...DEFAULT_SQLITE_LOGGING, ...config.sqlite },
    compression: { ...DEFAULT_COMPRESSION, ...config.compression },
    hotReload: { ...DEFAULT_HOT_RELOAD, ...config.hotReload },
    backup: { ...DEFAULT_BACKUP, ...config.backup },
    alert: { ...DEFAULT_ALERT, ...config.alert },
    audit: { ...DEFAULT_AUDIT, ...config.audit },
  };
}

/**
 * Backup configuration file
 *
 * @param configPath - Config file path
 * @param backupConfig - Backup configuration
 * @returns Backup file path or null if backup failed
 *
 * @author lvdaxianerplus
 * @date 2026-04-19
 */
export function backupConfigFile(
  configPath: string,
  backupConfig: BackupConfig = DEFAULT_BACKUP
): string | null {
  // Backup disabled
  if (!backupConfig.enabled) {
    return null;
  }

  const backupDir = backupConfig.dir ?? './backups';
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T').join('-');
  const backupFileName = `${basename(configPath)}.backup.${timestamp}`;
  const backupPath = join(backupDir, backupFileName);

  // Ensure backup directory exists
  if (!existsSync(backupDir)) {
    mkdirSync(backupDir, { recursive: true });
  }

  // Copy current config to backup
  try {
    const currentContent = readFileSync(resolve(configPath), 'utf-8');
    writeFileSync(backupPath, currentContent);
    logger.info('[配置备份] Config backed up', { backupPath });

    // Clean old backups if exceeds max versions
    cleanOldBackups(backupDir, backupConfig.maxVersions ?? 10, basename(configPath));

    return backupPath;
  } catch (error) {
    logger.error('[配置备份] Failed to backup config', { error, backupPath });
    return null;
  }
}

/**
 * Clean old backup files
 *
 * @param backupDir - Backup directory
 * @param maxVersions - Maximum versions to keep
 * @param configFileName - Config file name pattern
 *
 * @author lvdaxianerplus
 * @date 2026-04-19
 */
function cleanOldBackups(backupDir: string, maxVersions: number, configFileName: string): void {
  try {
    // List all backup files for this config
    const files = readdirSync(backupDir)
      .filter(f => f.startsWith(configFileName) && f.includes('.backup.'))
      .sort()
      .reverse(); // Most recent first

    // Delete old backups beyond maxVersions
    if (files.length > maxVersions) {
      for (const file of files.slice(maxVersions)) {
        const filePath = join(backupDir, file);
        unlinkSync(filePath);
        logger.info('[配置备份] Deleted old backup', { filePath });
      }
    }
  } catch (error) {
    logger.error('[配置备份] Failed to clean old backups', { error });
  }
}

/**
 * List available backup versions
 *
 * @param configPath - Config file path
 * @param backupConfig - Backup configuration
 * @returns Backup file list
 *
 * @author lvdaxianerplus
 * @date 2026-04-19
 */
export function listBackupVersions(
  configPath: string,
  backupConfig: BackupConfig = DEFAULT_BACKUP
): Array<{ file: string; path: string; timestamp: string }> {
  const backupDir = backupConfig.dir ?? './backups';
  const configFileName = basename(configPath);

  if (!existsSync(backupDir)) {
    return [];
  }

  try {
    return readdirSync(backupDir)
      .filter(f => f.startsWith(configFileName) && f.includes('.backup.'))
      .sort()
      .reverse()
      .map(f => {
        // Extract timestamp from filename
        const match = f.match(/\.backup\.(\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}-\d+Z)/);
        return {
          file: f,
          path: join(backupDir, f),
          timestamp: match ? match[1] : '',
        };
      });
  } catch (error) {
    logger.error('[配置备份] Failed to list backup versions', { error });
    return [];
  }
}

/**
 * Restore configuration from backup
 *
 * @param configPath - Current config file path
 * @param backupPath - Backup file to restore
 * @returns Restored configuration
 *
 * @author lvdaxianerplus
 * @date 2026-04-19
 */
export function restoreConfigFromBackup(configPath: string, backupPath: string): Config {
  // Backup current config before restore
  backupConfigFile(configPath);

  // Read backup content
  const backupContent = readFileSync(backupPath, 'utf-8');
  writeFileSync(configPath, backupContent);
  logger.info('[配置备份] Config restored from backup', { backupPath, configPath });

  // Reload config
  return loadConfig(configPath);
}

/**
 * Watch configuration file for changes and auto reload
 *
 * @param configPath - Config file path
 * @param callback - Callback when config is reloaded
 * @param hotReloadConfig - Hot reload configuration
 *
 * @author lvdaxianerplus
 * @date 2026-04-19
 */
export function watchConfig(
  configPath: string,
  callback: (config: Config) => void,
  hotReloadConfig: HotReloadConfig = DEFAULT_HOT_RELOAD
): void {
  // Hot reload disabled
  if (!hotReloadConfig.enabled || !hotReloadConfig.watchFile) {
    return;
  }

  currentConfigPath = configPath;
  onConfigReload = callback;

  // Stop existing watcher
  if (watcher) {
    watcher.close();
  }

  // Debounce timer
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  const debounceMs = hotReloadConfig.debounceMs ?? 1000;

  // Start watching
  watcher = watch(configPath, (eventType) => {
    if (eventType === 'change') {
      // Debounce: wait before reloading to handle rapid changes
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }

      debounceTimer = setTimeout(() => {
        reloadConfig();
      }, debounceMs);
    }
  });

  logger.info('[配置热更新] Watching config file for changes', { configPath, debounceMs });
}

/**
 * Manually trigger configuration reload
 *
 * @returns Reloaded configuration
 *
 * @author lvdaxianerplus
 * @date 2026-04-19
 */
export function reloadConfig(): Config {
  if (!currentConfigPath) {
    throw new Error('No config path set, call watchConfig first');
  }

  // Backup current config before reload
  if (currentConfig) {
    backupConfigFile(currentConfigPath);
  }

  // Load new config
  try {
    const newConfig = loadConfig(currentConfigPath);
    currentConfig = newConfig;

    // Notify callback
    if (onConfigReload) {
      onConfigReload(newConfig);
    }

    logger.info('[配置热更新] Config reloaded successfully');
    return newConfig;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('[配置热更新] Failed to reload config', { error: errorMessage });
    throw error;
  }
}

/**
 * Stop watching configuration file
 *
 * @author lvdaxianerplus
 * @date 2026-04-19
 */
export function stopWatchingConfig(): void {
  if (watcher) {
    watcher.close();
    watcher = null;
    logger.info('[配置热更新] Stopped watching config file');
  }
}

/**
 * Get current loaded configuration
 *
 * @returns Current configuration or null
 *
 * @author lvdaxianerplus
 * @date 2026-04-19
 */
export function getCurrentConfig(): Config | null {
  return currentConfig;
}

/**
 * Get all tool names from current config
 *
 * @returns Array of tool names
 *
 * @author lvdaxianerplus
 * @date 2026-04-24
 */
export function getToolNames(): string[] {
  // 条件注释：获取当前配置中的所有工具名称
  if (!currentConfig || !currentConfig.tools) {
    return [];
  }
  return Object.keys(currentConfig.tools);
}

/**
 * Get current config file path
 *
 * @returns Current config file path or null
 *
 * @author lvdaxianerplus
 * @date 2026-04-19
 */
export function getCurrentConfigPath(): string | null {
  return currentConfigPath;
}

/**
 * Mask sensitive configuration data
 *
 * Masks tokens, passwords, and other sensitive fields for safe display
 *
 * @param config - Configuration to mask
 * @returns Configuration with sensitive data masked
 *
 * @author lvdaxianerplus
 * @date 2026-04-19
 */
export function maskSensitiveConfig(config: Config): Record<string, unknown> {
  // Create safe copy of config
  const safeConfig: Record<string, unknown> = { ...config };

  // Mask tokens
  if (config.tokens) {
    safeConfig.tokens = Object.fromEntries(
      Object.keys(config.tokens).map(k => [k, '***MASKED***'])
    );
  }

  // Mask any fields that might contain secrets in tools config
  if (config.tools) {
    const safeTools: Record<string, unknown> = {};
    for (const [name, tool] of Object.entries(config.tools)) {
      const safeTool: Record<string, unknown> = { ...tool };
      // Mask headers that might contain Authorization or tokens
      if (tool.headers) {
        const safeHeaders: Record<string, unknown> = {};
        for (const [headerName, headerValue] of Object.entries(tool.headers)) {
          // Condition: header is authorization or token related
          if (headerName.toLowerCase().includes('authorization') ||
              headerName.toLowerCase().includes('token') ||
              headerName.toLowerCase().includes('key') ||
              headerName.toLowerCase().includes('secret')) {
            safeHeaders[headerName] = '***MASKED***';
          } else {
            safeHeaders[headerName] = headerValue;
          }
        }
        safeTool.headers = safeHeaders;
      }
      safeTools[name] = safeTool;
    }
    safeConfig.tools = safeTools;
  }

  return safeConfig;
}

/**
 * Save configuration to file with backup
 *
 * @param newConfig - New configuration to save
 * @param configPathOverride - Optional override for config path
 * @returns Saved configuration path
 *
 * @author lvdaxianerplus
 * @date 2026-04-19
 */
export function saveConfig(newConfig: Config, configPathOverride?: string): string {
  const targetPath = configPathOverride ?? currentConfigPath;

  // Condition: no target path available
  if (!targetPath) {
    throw new Error('No config path set, cannot save configuration');
  }

  // Backup current config before saving
  if (existsSync(targetPath)) {
    backupConfigFile(targetPath);
  }

  // Validate new config
  const result: ValidationResult = validateConfig(newConfig);
  if (!result.valid) {
    const errorMessages = result.errors.map((e) => `[ERROR] ${e.message}`);
    throw new Error(`Config validation failed:\n${errorMessages.join('\n')}`);
  }

  // Apply defaults and save
  const finalConfig = applyDefaults(newConfig);

  // Write to file
  try {
    const configJson = JSON.stringify(finalConfig, null, 2);
    writeFileSync(resolve(targetPath), configJson, 'utf-8');
    logger.info('[配置保存] Config saved successfully', { path: targetPath });

    // Update current config
    currentConfig = finalConfig;

    // Notify reload callback if set
    if (onConfigReload) {
      onConfigReload(finalConfig);
    }

    return targetPath;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('[配置保存] Failed to save config', { error: errorMessage });
    throw new Error(`Failed to save config: ${errorMessage}`);
  }
}

/**
 * Validate configuration format without saving
 *
 * @param config - Configuration to validate
 * @returns Validation result with errors if any
 *
 * @author lvdaxianerplus
 * @date 2026-04-19
 */
export function validateConfigFormat(config: unknown): ValidationResult {
  return validateConfig(config);
}
