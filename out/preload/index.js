"use strict";
const electron = require("electron");
const api = {
  // ========== 代理服务 ==========
  proxy: {
    start: (port) => electron.ipcRenderer.invoke("proxy:start", { port }),
    stop: () => electron.ipcRenderer.invoke("proxy:stop"),
    status: () => electron.ipcRenderer.invoke("proxy:status"),
    setChannel: (channelId) => electron.ipcRenderer.invoke("proxy:set-channel", { channelId })
  },
  // ========== 渠道管理 ==========
  channel: {
    list: () => electron.ipcRenderer.invoke("channel:list"),
    get: (id) => electron.ipcRenderer.invoke("channel:get", { id }),
    create: (data) => electron.ipcRenderer.invoke("channel:create", data),
    update: (id, updates) => electron.ipcRenderer.invoke("channel:update", { id, ...updates }),
    delete: (id) => electron.ipcRenderer.invoke("channel:delete", { id }),
    test: (id) => electron.ipcRenderer.invoke("channel:test", { id })
  },
  // ========== 客户端配置 ==========
  client: {
    list: () => electron.ipcRenderer.invoke("client:list"),
    switchChannel: (clientType, channelId) => electron.ipcRenderer.invoke("client:switch-channel", { clientType, channelId }),
    restore: (clientType, backupId) => electron.ipcRenderer.invoke("client:restore", { clientType, backupId }),
    backups: (clientType) => electron.ipcRenderer.invoke("client:backups", { clientType })
  },
  // ========== 日志 ==========
  log: {
    list: (filters) => electron.ipcRenderer.invoke("log:list", filters),
    clear: () => electron.ipcRenderer.invoke("log:clear")
  },
  // ========== 设置 ==========
  settings: {
    get: () => electron.ipcRenderer.invoke("settings:get"),
    update: (partial) => electron.ipcRenderer.invoke("settings:update", partial)
  },
  // ========== 事件监听 ==========
  on: (channel, callback) => {
    const subscription = (_event, ...args) => callback(...args);
    electron.ipcRenderer.on(channel, subscription);
    return () => {
      electron.ipcRenderer.removeListener(channel, subscription);
    };
  }
};
electron.contextBridge.exposeInMainWorld("api", api);
