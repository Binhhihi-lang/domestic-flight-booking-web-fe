import { Airport, City } from '@core/models/location.model';

/** Thành phố nội địa có sân bay — dùng tên thật để demo trông thật. */
export const CITIES_MOCK: City[] = [
  { id: 1, city_code: 'HAN', city_name: 'Hà Nội', country: 'Việt Nam', is_active: true, is_deleted: false },
  { id: 2, city_code: 'SGN', city_name: 'TP. Hồ Chí Minh', country: 'Việt Nam', is_active: true, is_deleted: false },
  { id: 3, city_code: 'DAD', city_name: 'Đà Nẵng', country: 'Việt Nam', is_active: true, is_deleted: false },
  { id: 4, city_code: 'CXR', city_name: 'Nha Trang', country: 'Việt Nam', is_active: true, is_deleted: false },
  { id: 5, city_code: 'PQC', city_name: 'Phú Quốc', country: 'Việt Nam', is_active: true, is_deleted: false },
  { id: 6, city_code: 'DLI', city_name: 'Đà Lạt', country: 'Việt Nam', is_active: true, is_deleted: false },
  { id: 7, city_code: 'HUI', city_name: 'Huế', country: 'Việt Nam', is_active: true, is_deleted: false },
  { id: 8, city_code: 'VCA', city_name: 'Cần Thơ', country: 'Việt Nam', is_active: true, is_deleted: false },
  { id: 9, city_code: 'HPH', city_name: 'Hải Phòng', country: 'Việt Nam', is_active: true, is_deleted: false },
  { id: 10, city_code: 'VII', city_name: 'Vinh', country: 'Việt Nam', is_active: false, is_deleted: false },
  { id: 11, city_code: 'BMV', city_name: 'Buôn Ma Thuột', country: 'Việt Nam', is_active: true, is_deleted: false },
  { id: 12, city_code: 'UIH', city_name: 'Quy Nhơn', country: 'Việt Nam', is_active: true, is_deleted: false },
];

/** Sân bay — `city_id` trỏ tới CITIES_MOCK ở trên. */
export const AIRPORTS_MOCK: Airport[] = [
  { id: 1, airport_code: 'HAN', airport_name: 'Sân bay Quốc tế Nội Bài', city_id: 1, latitude: 21.2212, longitude: 105.8072, is_active: true, is_deleted: false },
  { id: 2, airport_code: 'SGN', airport_name: 'Sân bay Quốc tế Tân Sơn Nhất', city_id: 2, latitude: 10.8188, longitude: 106.652, is_active: true, is_deleted: false },
  { id: 3, airport_code: 'DAD', airport_name: 'Sân bay Quốc tế Đà Nẵng', city_id: 3, latitude: 16.0439, longitude: 108.1994, is_active: true, is_deleted: false },
  { id: 4, airport_code: 'CXR', airport_name: 'Sân bay Quốc tế Cam Ranh', city_id: 4, latitude: 11.9982, longitude: 109.2194, is_active: true, is_deleted: false },
  { id: 5, airport_code: 'PQC', airport_name: 'Sân bay Quốc tế Phú Quốc', city_id: 5, latitude: 10.1698, longitude: 103.9931, is_active: true, is_deleted: false },
  { id: 6, airport_code: 'DLI', airport_name: 'Sân bay Liên Khương', city_id: 6, latitude: 11.7503, longitude: 108.3672, is_active: true, is_deleted: false },
  { id: 7, airport_code: 'HUI', airport_name: 'Sân bay Quốc tế Phú Bài', city_id: 7, latitude: 16.4015, longitude: 107.7027, is_active: true, is_deleted: false },
  { id: 8, airport_code: 'VCA', airport_name: 'Sân bay Quốc tế Cần Thơ', city_id: 8, latitude: 10.0851, longitude: 105.7119, is_active: true, is_deleted: false },
  { id: 9, airport_code: 'HPH', airport_name: 'Sân bay Quốc tế Cát Bi', city_id: 9, latitude: 20.8194, longitude: 106.7248, is_active: true, is_deleted: false },
  { id: 10, airport_code: 'VII', airport_name: 'Sân bay Quốc tế Vinh', city_id: 10, latitude: 18.7376, longitude: 105.6708, is_active: false, is_deleted: false },
  { id: 11, airport_code: 'BMV', airport_name: 'Sân bay Buôn Ma Thuột', city_id: 11, latitude: 12.6683, longitude: 108.12, is_active: true, is_deleted: false },
  { id: 12, airport_code: 'UIH', airport_name: 'Sân bay Phù Cát', city_id: 12, latitude: 13.955, longitude: 109.042, is_active: true, is_deleted: false },
];
