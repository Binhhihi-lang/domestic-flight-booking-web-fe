export const environment = {
  production: false,
  /** Base path của Backend API — khớp tài liệu API Design v0.4 */
  apiBaseUrl: 'http://localhost:8080/api',
  /**
   * Kết nối trực tiếp API Backend thật (chỉ bật mock trong unit test Vitest).
   */
  useMock: false,
};
