/**
 * UGC 运行时模块导出
 */

// 宿主桥接
export { UGCHostBridge, createHostBridge } from './hostBridge';
export type { CommandHandler, HostBridgeConfig } from './hostBridge';

// 视图 SDK
export { UGCViewSdk, createViewSdk, getGlobalSdk, initGlobalSdk } from './viewSdk';
export type { ViewSdkConfig, InitCallback, StateUpdateCallback, CommandResultCallback, ErrorCallback } from './viewSdk';
