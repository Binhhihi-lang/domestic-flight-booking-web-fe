import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { ApiResponse } from '@core/models/api-response.model';

/**
 * Dịch vụ tải ảnh lên server (Cloudinary) cho trang Quản trị & Hồ sơ cá nhân.
 * - `POST /api/admin/uploads/image` (ảnh hãng bay, thành phố, tin tức)
 * - `POST /api/profile/avatar` (ảnh đại diện người dùng)
 */
@Injectable({ providedIn: 'root' })
export class UploadService {
  private readonly http = inject(HttpClient);
  private readonly apiBase = environment.apiBaseUrl;

  uploadAdminImage(file: File): Observable<ApiResponse<{ url: string }>> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<ApiResponse<{ url: string }>>(
      `${this.apiBase}/admin/uploads/image`,
      formData,
    );
  }

  uploadProfileAvatar(file: File): Observable<ApiResponse<{ avatar_url?: string; url?: string }>> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<ApiResponse<{ avatar_url?: string; url?: string }>>(
      `${this.apiBase}/profile/avatar`,
      formData,
    );
  }
}
