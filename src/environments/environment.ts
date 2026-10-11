export const environment = {
  production: false,
  /** Base path của Backend API — khớp tài liệu API Design v0.2 */
  apiBaseUrl: 'http://localhost:8080/api/v1',
  /**
   * Bật mock layer khi Backend chưa có endpoint thật.
   * Tắt đi thì request đi thẳng ra apiBaseUrl, không phải sửa code.
   */
  useMock: true,
};
