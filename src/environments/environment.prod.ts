export const environment = {
  production: true,
  /**
   * Đường dẫn TƯƠNG ĐỐI: trình duyệt gọi cùng origin đang mở trang, nginx
   * proxy /api → backend:8080. Nhờ vậy chạy được ở bất kỳ host/cổng nào
   * (localhost, IP LAN, domain) mà không phải sửa code hay rebuild.
   */
  apiBaseUrl: '/api',
  useMock: false,
};
