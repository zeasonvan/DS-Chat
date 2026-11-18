/** 原生能力失败时只记录日志，不打断主流程；集中一处便于发布版统一处理 */
export const warnNative = (message: string, error: unknown): void => {
  // eslint-disable-next-line no-console
  console.warn(message, error)
}
