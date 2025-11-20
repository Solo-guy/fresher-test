## Web Quản Lý Chi Tiêu

Ứng dụng full-stack theo đúng yêu cầu trong `yeu_cau_web_quan_ly_chi_tieu.md`, gồm:

- **Client**: React + TypeScript + Ant Design, hỗ trợ đăng nhập Google, quản lý ví, ghi giao dịch thu/chi, xem lịch sử và sao kê theo ví & thời gian.
- **Server**: Node.js + Express + TypeScript + MongoDB, xác thực Google, JWT bảo vệ API, kiểm soát số dư ví và báo cáo.
- **Đóng gói**: Docker/Docker Compose để chạy đồng thời client, server, MongoDB.

### 1. Chuẩn bị môi trường

- Node.js >= 22.12 (Vite yêu cầu 20.19+ hoặc 22.12+)
- npm 10+
- MongoDB cục bộ (nếu không dùng Docker)
- Google Cloud project để lấy `GOOGLE_CLIENT_ID`.

### 2. Cấu hình biến môi trường

Tạo file `.env` dựa trên mẫu:

- `client/.env.example`
- `server/.env.example`

Các giá trị cần thiết:

```
MONGO_URI=mongodb://localhost:27017/spending_tracker
JWT_SECRET=chuoi-bi-mat
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
CLIENT_URL=http://localhost:5173
DEFAULT_TENANT_ID=default

VITE_API_URL=http://localhost:4000/api
VITE_GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
VITE_TENANT_ID=default
```

### 3. Chạy bằng npm

```bash
# Server
cd server
npm install
npm run dev

# Client
cd client
npm install
npm run dev
```

- Truy cập client tại `http://localhost:5173`.
- Server chạy ở `http://localhost:4000`.

### 4. Chạy bằng Docker

```bash
docker compose up --build
```

- MongoDB: cổng `27017`
- API: `http://localhost:4000`
- Client (Nginx): `http://localhost:4173`

> Chỉnh `GOOGLE_CLIENT_ID` trong `docker-compose.yml` (biến build `VITE_GOOGLE_CLIENT_ID`) trước khi build.

### 5. Luồng chức năng chính

1. **Đăng nhập Google** → backend xác thực `idToken`, tạo user + ví đầu tiên nếu chưa có, trả JWT.
2. **Quản lý ví** → tạo ví với tên/STK/số dư đầu/ ngày tạo, xem tổng số dư toàn bộ.
3. **Giao dịch thu/chi** → form thu/chi cập nhật số dư ví tự động, không cho chi vượt số dư.
4. **Lịch sử & sao kê** → lọc theo ví, thời gian, loại giao dịch; hiển thị số dư đầu kỳ, tổng thu, tổng chi, số dư cuối kỳ + danh sách chi tiết.
5. **Nâng cao** → 
   - Phân trang phía server (tới 500 dòng/trang) + index tối ưu để hỗ trợ hàng triệu giao dịch/tài khoản.
   - Xuất sao kê PDF/Excel dạng streaming, phù hợp với file rất lớn.
   - Multi-tenant: mỗi request mang `x-tenant-id`, dữ liệu được cô lập hoàn toàn theo tenant.

### 6. Kiểm thử nhanh

```bash
# Client build (yêu cầu Node 22.12+ hoặc 20.19+)
cd client && npm run build

# Server type-check + build
cd server && npm run lint && npm run build
```

### 7. Cấu trúc thư mục

```
client/  # React + AntD
server/  # Express + MongoDB
docker-compose.yml
yeu_cau_web_quan_ly_chi_tieu.md  # đặc tả gốc
```

Ứng dụng đã bám sát đặc tả: đăng nhập Google, quản lý nhiều ví, ghi thu/chi, tự động cập nhật số dư, không chi âm, xem lịch sử, sao kê theo ví & thời gian, kiến trúc client/server tách biệt và sẵn sàng Docker.


