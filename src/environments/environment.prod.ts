export const environment = {
  production: true,
  /**
   * Dùng đường dẫn tương đối '/api' để Nginx trên VPS (hoặc trong container)
   * vừa phục vụ Frontend vừa proxy /api/* sang Backend (http://127.0.0.1:8089).
   * Cùng origin nên chạy trực tiếp bằng IP VPS (http://103.74.100.134) hay tên miền đều được.
   */
  apiBaseUrl: '/api',
  useMock: false,
};
