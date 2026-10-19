# Buku Panduan Standar Clean Code & Arsitektur Modular (Engineering Handbook)

**Cakupan Proyek:** Aplikasi Web Full-Stack Modern (SaaS, Enterprise, E-Commerce, Sistem Informasi)  
**Referensi Tech Stack:** Next.js (App Router), TypeScript, Tailwind CSS, Shadcn UI, ORM (Prisma / Drizzle), Relational DB (PostgreSQL / MySQL), Zustand, React Hook Form + Zod

Dokumen ini adalah **Single Source of Truth** (acuan utama) dalam penulisan kode lintas proyek. Mematuhi panduan ini secara disiplin akan mencegah *spaghetti code*, meminimalkan *bug* tersembunyi pada logika bisnis maupun transaksi data, serta memastikan *codebase* tetap mudah dipelihara dan dikembangkan dalam jangka panjang—baik saat dikerjakan sendiri (*solo developer*) maupun bersama tim.

---

## 1. Arsitektur Folder & Batas Modul (Feature-Driven Architecture)

Pendekatan yang digunakan adalah **Feature-Driven Architecture**. Seluruh logika bisnis dikelompokkan berdasarkan domain fiturnya di dalam `src/features/`, bukan dipisahkan secara kaku berdasarkan jenis teknologinya.

### 1.1 Pohon Struktur Folder Lengkap

```text
📦 project-root
 ┣ 📂 prisma
 ┃ ┣ 📜 schema.prisma          # Skema database utama
 ┃ ┗ 📜 seed.ts                # Data awal (Master Role, Kategori, Akun Superadmin)
 ┣ 📂 public                   # Aset statis (Logo, ikon, dokumen template, audio)
 ┣ 📂 src
 ┃ ┣ 📂 app                    # ⚠️ HANYA UNTUK ROUTING, LAYOUT, & HALAMAN UTAMA
 ┃ ┃ ┣ 📂 (auth)               # Route group autentikasi (tidak menambah segmen URL)
 ┃ ┃ ┃ ┗ 📂 login
 ┃ ┃ ┃   ┗ 📜 page.tsx
 ┃ ┃ ┣ 📂 (dashboard)          # Layout utama aplikasi setelah login
 ┃ ┃ ┃ ┣ 📂 users
 ┃ ┃ ┃ ┃ ┣ 📜 page.tsx         # Server Component (Fetch data awal & render fitur)
 ┃ ┃ ┃ ┃ ┣ 📜 loading.tsx      # Skeleton UI saat halaman dimuat
 ┃ ┃ ┃ ┃ ┗ 📜 error.tsx        # Tampilan tangkapan error spesifik halaman
 ┃ ┃ ┃ ┣ 📂 products
 ┃ ┃ ┃ ┣ 📂 orders
 ┃ ┃ ┃ ┃ ┗ 📂 [orderId]        # Dynamic route untuk halaman detail transaksi/pesanan
 ┃ ┃ ┃ ┣ 📂 payments
 ┃ ┃ ┃ ┣ 📂 reports
 ┃ ┃ ┃ ┗ 📜 layout.tsx         # Sidebar, Header, & Cek Sesi Login
 ┃ ┃ ┣ 📂 api                  # HANYA untuk Webhook eksternal (Payment Gateway, OAuth, Pihak Ketiga)
 ┃ ┃ ┣ 📜 globals.css
 ┃ ┃ ┗ 📜 layout.tsx           # Root Layout (Font, Theme & Toast Provider)
 ┃ ┃
 ┃ ┣ 📂 components             # KOMPONEN UI GLOBAL (Bebas dari logika bisnis spesifik fitur)
 ┃ ┃ ┣ 📂 ui                   # Murni komponen dasar UI (Button, Dialog, Input, Select)
 ┃ ┃ ┣ 📂 shared               # Komponen gabungan lintas fitur (PageHeader, DataTable, SearchInput, StatusBadge)
 ┃ ┃ ┗ 📂 layout               # Sidebar, Topbar, UserNav, Breadcrumbs
 ┃ ┃
 ┃ ┣ 📂 features               # ✨ JANTUNG APLIKASI (MODULAR & TERISOLASI) ✨
 ┃ ┃ ┣ 📂 users
 ┃ ┃ ┃ ┣ 📂 actions            # Server Actions: Mutasi data (Create, Update, Soft-Delete)
 ┃ ┃ ┃ ┣ 📂 queries            # Data Access Layer: Fungsi ambil data (SELECT/Read) ke DB
 ┃ ┃ ┃ ┣ 📂 components         # Komponen UI khusus fitur Users (UserForm, UserProfileCard)
 ┃ ┃ ┃ ┣ 📂 hooks              # Custom React Hooks spesifik fitur Users
 ┃ ┃ ┃ ┣ 📂 schemas            # Skema validasi Zod (user-schema.ts)
 ┃ ┃ ┃ ┣ 📂 constants          # Konstanta spesifik fitur (opsi status akun, tipe member)
 ┃ ┃ ┃ ┗ 📂 types              # Interface/Type spesifik fitur Users
 ┃ ┃ ┣ 📂 products             # Modul Katalog, Inventori, Kategori
 ┃ ┃ ┣ 📂 orders               # Modul Keranjang, Checkout, Riwayat Pesanan
 ┃ ┃ ┣ 📂 payments             # Modul Tagihan, Verifikasi Pembayaran, Invoice
 ┃ ┃ ┗ 📂 integrations         # Modul Klien API Eksternal (Payment Gateway, WhatsApp/Email Sender)
 ┃ ┃
 ┃ ┣ 📂 hooks                  # Custom Hooks Global (useDebounce, useMediaQuery, useLocalStorage)
 ┃ ┣ 📂 lib                    # KONFIGURASI CORE & UTILITY MURNI
 ┃ ┃ ┣ 📜 db.ts                # Singleton Database/ORM Client (misal: Prisma Client)
 ┃ ┃ ┣ 📜 auth.ts              # Konfigurasi Autentikasi & Role-Based Access Control (RBAC)
 ┃ ┃ ┣ 📜 utils.ts             # Fungsi helper murni (cn, formatCurrency, formatDate)
 ┃ ┃ ┗ 📜 action-client.ts     # Wrapper standar untuk eksekusi Server Actions
 ┃ ┃
 ┃ ┣ 📂 constants              # Konstanta Global (Daftar Role, Konfigurasi Aplikasi, Limit Paginasi)
 ┃ ┗ 📂 types                  # Tipe TypeScript Global (ActionResponse, PaginationParams)
 ┣ 📜 .env
 ┣ 📜 proxy.ts (atau middleware.ts) # Proteksi rute level jaringan (Next.js 16+ menggunakan proxy.ts)
 ┗ 📜 tsconfig.json
```

### 1.2 Aturan Aliran Impor Satu Arah (Unidirectional Import Rule)

Untuk mencegah *Circular Dependency* (File A mengimpor File B, dan File B mengimpor File A hingga menyebabkan kegagalan *build* atau *runtime crash*), patuhi hierarki aliran impor berikut:

1. **Level Dasar (`src/lib/`, `src/components/ui/`, `src/types/`, `src/constants/`):**
   - **DILARANG** mengimpor apa pun dari `src/features/` atau `src/app/`.
2. **Level Fitur (`src/features/[nama-fitur]/`):**
   - Boleh mengimpor dari `src/lib/`, `src/components/`, `src/hooks/`, `src/constants/`, dan `src/types/`.
   - **Aturan Lintas Fitur:** Fitur `orders` tidak boleh mengimpor komponen UI langsung dari `features/products/components`. Jika sebuah komponen dibutuhkan oleh dua fitur berbeda (misalnya `ProductSummaryTable`), pindahkan komponen tersebut ke `src/components/shared/`, atau batasi impor lintas fitur hanya pada fungsi *query* dan *types*-nya saja.
3. **Level Perakit / Aplikasi (`src/app/`):**
   - Bertugas sebagai perakit (*composer*). Boleh mengimpor dari `src/features/`, `src/components/`, dan `src/lib/`.
4. **Selalu Gunakan Path Alias (`@/`):**

```typescript
// ❌ BURUK: Relative path yang panjang dan rapuh saat file dipindah
import { formatCurrency } from "../../../lib/utils";

// ✅ BERSIH: Konsisten menggunakan Path Alias
import { formatCurrency } from "@/lib/utils";
```

---

## 2. Konvensi Penamaan & Bahasa (Naming Conventions)

Konsistensi penamaan membuat setiap pengembang dapat menebak isi file, variabel, atau fungsi tanpa harus membuka implementasinya terlebih dahulu.

### 2.1 Aturan Bahasa (Domain vs. Teknis)

Pilih salah satu pendekatan di bawah ini pada awal proyek dan terapkan secara konsisten:
- **Opsi A (Full English):** Seluruh istilah bisnis dan teknis menggunakan Bahasa Inggris (`User`, `Order`, `Product`, `Invoice`). Direkomendasikan untuk produk SaaS umum.
- **Opsi B (Hybrid — Domain Lokal + Technical English):** Istilah bisnis mengikuti regulasi/istilah operasional lokal (`Pegawai`, `Tagihan`, `Barang`), sedangkan kata kerja teknis menggunakan Bahasa Inggris (`get...`, `create...`, `update...`, `delete...`, `validate...`, `format...`, `use...`, `is...`, `has...`).

### 2.2 Tabel Standar Penamaan

| Kategori | Format | Contoh Benar (✅) | Contoh Salah (❌) |
| :--- | :--- | :--- | :--- |
| **Folder & File** | `kebab-case` | `order-form.tsx`, `user-queries.ts` | `OrderForm.tsx`, `user_queries.ts` |
| **Komponen React** | `PascalCase` | `export function OrderForm()` | `export function orderForm()` |
| **Fungsi & Variabel** | `camelCase` | `const totalOrderAmount = 150000;` | `const Total_Order_Amount = 150000;` |
| **Variabel Boolean** | `is/has/can/should` + `camelCase` | `isVerified`, `hasActiveSubscription`, `canEditPost` | `verified`, `statusSubscription`, `editPost` |
| **Konstanta Global / Enum** | `UPPER_SNAKE_CASE` | `MAX_ITEMS_PER_PAGE = 20`, `ORDER_STATUS` | `maxItemsPerPage = 20` |
| **Type & Interface** | `PascalCase` | `type OrderDetailPayload = { ... }` | `type order_detail_payload = { ... }` |
| **Custom Hooks** | `use` + `camelCase` | `useShoppingCart()`, `useSearchProducts()` | `shoppingCartHook()` |
| **File Server Actions** | `[kata-kerja]-[entitas].ts` | `create-order.ts`, `cancel-invoice.ts` | `action1.ts`, `process.ts` |

### 2.3 Penamaan Event Handler di React

Pisahkan penamaan antara *props* komponen dengan fungsi internal penangan *event*:
- Gunakan awalan `on...` untuk deklarasi nama *props* komponen.
- Gunakan awalan `handle...` untuk fungsi internal yang mengeksekusi logika tersebut.

```tsx
// ✅ BERSIH & JELAS
interface ProductItemProps {
  onSelectProduct: (productId: string) => void;
}

export function ProductItem({ onSelectProduct }: ProductItemProps) {
  function handleRowClick(id: string) {
    // Logika internal sebelum memanggil prop
    onSelectProduct(id);
  }
  // ...
}
```

---

## 3. Prinsip Clean Code pada Fungsi & Logika Bisnis

### 3.1 Gunakan Early Return Pattern (Hindari Nested If / Arrow Code)

Hindari menumpuk blok `if-else` terlalu dalam. Periksa kondisi yang tidak valid di awal fungsi (*Guard Clauses*) dan langsung hentikan eksekusi (`return`).

```typescript
// ❌ BURUK: Menjorok terlalu dalam dan sulit ditelusuri
export async function processOrderPayment(orderId: string, paidAmount: number) {
  const invoice = await getInvoice(orderId);
  if (invoice) {
    if (invoice.status !== "PAID") {
      if (paidAmount >= invoice.grandTotal) {
        await executePayment(invoice.id, paidAmount);
        return { success: true };
      } else {
        return { error: "Nominal pembayaran kurang" };
      }
    } else {
      return { error: "Tagihan sudah dibayar sebelumnya" };
    }
  } else {
    return { error: "Tagihan tidak ditemukan" };
  }
}

// ✅ BERSIH: Early Return / Guard Clauses — Rata kiri & mudah dibaca
export async function processOrderPayment(orderId: string, paidAmount: number) {
  const invoice = await getInvoice(orderId);

  if (!invoice) {
    return { success: false, error: "Tagihan tidak ditemukan." };
  }
  if (invoice.status === "PAID") {
    return { success: false, error: "Tagihan ini sudah lunas sebelumnya." };
  }
  if (paidAmount < invoice.grandTotal) {
    return { success: false, error: "Nominal pembayaran kurang dari total tagihan." };
  }

  // Happy Path selalu berada di bagian paling bawah dan rata kiri
  await executePayment(invoice.id, paidAmount);
  return { success: true };
}
```

### 3.2 Larangan Magic Strings & Magic Numbers

Jangan menulis nilai teks status atau angka rumus secara langsung (*hardcode*) di berbagai tempat. Kesalahan ketik satu huruf dapat memicu *bug* logika yang sulit dilacak.

```typescript
// ❌ BURUK: Rawan salah ketik dan angka tidak memiliki konteks
if (order.status === "WAITING_APPROVAL") { ... }
const taxAmount = subTotal * 0.11; // Angka 0.11 ini apa?

// ✅ BERSIH: Gunakan Konstanta bernama jelas atau Enum dari skema database
import { OrderStatus } from "@prisma/client";

const PPN_TAX_RATE = 0.11;

if (order.status === OrderStatus.WAITING_APPROVAL) { ... }
const taxAmount = subTotal * PPN_TAX_RATE;
```

### 3.3 Satu Fungsi = Satu Tugas (Single Responsibility Principle)

- Sebuah fungsi hanya boleh melakukan satu tanggung jawab spesifik. Jika nama fungsi mengandung kata **"Dan"** (contoh: `validateUserAndCreateOrderAndSendEmail()`), pecah menjadi tiga fungsi terpisah: `validateUser()`, `createOrder()`, dan `sendConfirmationEmail()`.
- **Batas Parameter Fungsi:** Maksimal **2 parameter**. Jika membutuhkan 3 parameter atau lebih, bungkus ke dalam **Object Parameter** (*Destructuring*) agar urutan pemanggilan tidak tertukar.

```typescript
// ❌ BURUK: Urutan parameter rawan tertukar saat dipanggil
function calculateItemPrice(basePrice: number, quantity: number, discountPercent: number, shippingFee: number) {}

// ✅ BERSIH: Self-documenting dan urutan properti tidak masalah
interface CalculateItemPriceParams {
  basePrice: number;
  quantity: number;
  discountPercent?: number;
  shippingFee?: number;
}

function calculateItemPrice({
  basePrice,
  quantity,
  discountPercent = 0,
  shippingFee = 0,
}: CalculateItemPriceParams) {
  // ...
}
```

### 3.4 Aturan Penulisan Komentar (Comments)

- **Jangan** menulis komentar untuk menjelaskan **APA** yang dilakukan kode—biarkan nama variabel dan fungsi yang menjelaskannya.
- Tulislah komentar **HANYA** untuk menjelaskan **MENGAPA (WHY)** suatu keputusan bisnis, batasan sistem pihak ketiga, atau *workaround* teknis diambil.

```typescript
// ❌ KOMENTAR TIDAK PERLU (Sudah jelas dari kodenya)
// Mengurangi stok produk dengan jumlah yang dibeli
productStock = productStock - purchasedQuantity;

// ✅ KOMENTAR BERHARGA (Menjelaskan batasan eksternal / aturan bisnis)
// API Payment Gateway menolak transaksi di bawah Rp10.000 untuk metode Virtual Account
if (paymentMethod === "VIRTUAL_ACCOUNT" && totalAmount < 10_000) { ... }
```

---

## 4. Modularisasi Komponen & UI

### 4.1 Batas Ukuran File & Dekomposisi Komponen

- **Batas Kuning (150 Baris):** Evaluasi apakah ada logika state, validasi, atau pemformatan data yang sebaiknya diekstrak ke *custom hook* atau fungsi utilitas.
- **Batas Merah (250 Baris):** **WAJIB DIPECAH.** Tidak boleh ada satu pun file komponen `.tsx` yang melebihi 250–300 baris.

**Contoh Dekomposisi Halaman Kompleks (Misal: Halaman Checkout / Detail Transaksi):**  
Jangan menumpuk seluruh kode di dalam satu file `checkout-page.tsx`. Pecah menjadi sub-komponen yang terfokus:
1. `customer-address-section.tsx` (Bagian pemilihan alamat pengiriman).
2. `order-items-list.tsx` (Daftar produk yang dibeli beserta kuantitasnya).
3. `voucher-selector-combobox.tsx` (Komponen khusus pencarian dan penerapan kode promo).
4. `payment-summary-card.tsx` (Ringkasan rincian biaya, pajak, dan tombol bayar).
5. `checkout-container.tsx` (Komponen perakit yang menyatukan bagian-bagian di atas).

### 4.2 Pisahkan Logika UI ke dalam Custom Hooks

Jangan mengotori bagian atas komponen UI dengan deretan panjang `useState` dan `useEffect`. Jika logika interaksinya kompleks, ekstrak ke dalam folder `hooks/`.

```tsx
// ❌ BURUK: Logika pencarian, debounce, dan fetch menumpuk di dalam komponen UI
export function ProductSearchBox() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  useEffect(() => {
    /* 30 baris logika fetch & debounce */
  }, [query]);
  return <div>...</div>;
}

// ✅ BERSIH: Komponen UI hanya fokus merender tampilan
export function ProductSearchBox() {
  const { query, setQuery, products, isLoading } = useSearchProducts();
  return <div>...</div>;
}
```

### 4.3 Aturan Server Component vs. Client Component

- **Server Component adalah Default:** Seluruh `page.tsx` dan komponen yang hanya bertugas menampilkan data wajib berupa Server Component (tanpa direktif `"use client"`).
- **Dorong `"use client"` ke Daun Terluar (*Push Client to the Leaves*):**
  - Jika halaman Daftar Produk memiliki Tabel (statis) dan Tombol "Tambah Produk" (membutuhkan state buka/tutup modal), **jangan** jadikan seluruh halaman atau tabel sebagai Client Component.
  - Biarkan `page.tsx` dan `ProductTable` tetap menjadi Server Component, lalu buat komponen kecil terpisah khusus untuk tombol dan modalnya yang menggunakan `"use client"`.

---

## 5. Aturan Ketat TypeScript (Zero `any` Policy)

TypeScript adalah jaring pengaman utama terhadap *runtime error*.

- **DILARANG KERAS Menggunakan `any`:** Menggunakan `any` sama dengan mematikan pemeriksaan tipe TypeScript. Jika tipe data belum diketahui (misalnya dari input eksternal, webhook, atau blok `catch`), gunakan `unknown` lalu lakukan *type narrowing* atau validasi menggunakan Zod.
- **Jangan Menulis Ulang Tipe Database/Form secara Manual:** Manfaatkan inferensi otomatis dari Zod atau ORM (seperti Prisma/Drizzle) agar tipe data selalu sinkron dengan skema terbaru.

```typescript
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { OrderSchema } from "../schemas/order-schema";

// ✅ 1. Mengambil tipe otomatis dari Skema Zod untuk Form
export type OrderFormValues = z.infer<typeof OrderSchema>;

// ✅ 2. Mengambil tipe otomatis dari ORM beserta Relasinya (Include)
export type OrderWithDetails = Prisma.OrderGetPayload<{
  include: {
    customer: true;
    payment: true;
    items: {
      include: { product: true };
    };
  };
}>;
```

---

## 6. Standar Database, Queries (Read), & Actions (Write)

Untuk menjaga keamanan dan kerapihan akses data, pisahkan secara tegas antara operasi **Baca (Queries)** dan operasi **Tulis/Mutasi (Actions)**.

### 6.1 Pemisahan `queries/` vs. `actions/`

- **`src/features/[fitur]/queries/` (Data Access Layer — READ):**
  - Berisi fungsi `async` untuk mengambil data dari database (`findMany`, `findUnique`, `count`).
  - Dipanggil langsung di dalam Server Components.
  - Wajib menyertakan `import "server-only"` di baris pertama agar modul tidak pernah tidak sengaja terbundel ke sisi *client*.
- **`src/features/[fitur]/actions/` (Server Actions — WRITE):**
  - Berisi fungsi mutasi data (`create`, `update`, `delete`).
  - Wajib diawali dengan `"use server"` di baris pertama.
  - Dipanggil dari Client Components (misalnya saat pengiriman form atau aksi tombol).

### 6.2 Format Standar Response Server Action

Seluruh Server Actions wajib mengembalikan struktur objek (*return type*) yang seragam agar penanganan pesan umpan balik (*Toast* atau pesan error form) di sisi UI selalu konsisten:

```typescript
// src/types/index.ts
export type ActionResponse<T = void> = {
  success: boolean;
  message: string;
  data?: T;
  fieldErrors?: Record<string, string[]>;
};
```

### 6.3 Template Wajib Server Action (Lima Langkah Aman)

Setiap mutasi data wajib mengikuti 5 tahapan berurutan:
1. **Cek Sesi & Hak Akses (RBAC)**
2. **Validasi Input (Zod)**
3. **Cek Aturan Bisnis (Business Logic Validation)**
4. **Eksekusi Database (Gunakan Transaksi ACID bila multi-tabel)**
5. **Revalidate Cache & Kembalikan Response Standar**

```typescript
// src/features/orders/actions/create-order.ts
"use server";

import { revalidatePath } from "next/cache";
import db from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { CreateOrderSchema } from "../schemas/order-schema";
import { ActionResponse } from "@/types";

export async function createOrder(rawInput: unknown): Promise<ActionResponse<{ id: string }>> {
  // 1. CEK AUTENTIKASI & HAK AKSES (RBAC)
  const user = await getCurrentUser();
  if (!user || !["CUSTOMER", "ADMIN"].includes(user.role)) {
    return { success: false, message: "Akses ditolak. Silakan masuk terlebih dahulu." };
  }

  // 2. VALIDASI INPUT DENGAN ZOD
  const parsed = CreateOrderSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      message: "Data pesanan belum lengkap atau tidak valid.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { customerId, items, paymentMethod } = parsed.data;

  try {
    // 3. CEK ATURAN BISNIS (Contoh: Pastikan stok mencukupi sebelum membuat pesanan)
    const productIds = items.map((item) => item.productId);
    const productsInDb = await db.product.findMany({
      where: { id: { in: productIds }, isActive: true },
    });

    if (productsInDb.length !== items.length) {
      return { success: false, message: "Salah satu produk tidak ditemukan atau sudah tidak aktif." };
    }

    // 4. EKSEKUSI DATABASE DENGAN TRANSAKSI (ACID)
    // Wajib menggunakan $transaction jika memodifikasi lebih dari 1 tabel sekaligus!
    const result = await db.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          customerId,
          createdById: user.id,
          status: "PENDING_PAYMENT",
          paymentMethod,
          items: {
            create: items,
          },
        },
      });

      // Kurangi stok masing-masing produk secara atomik
      for (const item of items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });
      }

      return newOrder;
    });

    // 5. REVALIDATE CACHE HALAMAN & KEMBALIKAN RESPONSE STANDAR
    revalidatePath("/orders");
    revalidatePath("/products");

    return {
      success: true,
      message: "Pesanan berhasil dibuat.",
      data: { id: result.id },
    };
  } catch (error) {
    console.error("[CREATE_ORDER_ERROR]:", error);
    return {
      success: false,
      message: "Terjadi kesalahan pada server saat memproses pesanan.",
    };
  }
}
```

---

## 7. Integritas Data, Transaksi & Keamanan (Data Integrity Rules)

1. **Hindari Hard Delete pada Data Transaksional & Historis:**
   - Data penting seperti riwayat transaksi, invoice, log audit, dan akun pengguna yang memiliki relasi historis **dilarang dihapus permanen** (`DELETE FROM`).
   - Terapkan mekanisme **Soft Delete** menggunakan kolom `deletedAt DateTime?`, `isActive Boolean @default(true)`, atau perubahan status menjadi `CANCELLED` / `ARCHIVED` disertai pencatatan alasan (`cancelReason`).
2. **Kewajiban Database Transaction (`$transaction`):**
   - Setiap operasi yang mengubah lebih dari satu tabel secara berantai (misalnya: pemotongan stok inventori, pembuatan tagihan, dan pencatatan jurnal keuangan) **wajib** dibungkus dalam transaksi database. Jika salah satu langkah gagal di tengah jalan, seluruh perubahan sebelumnya harus dibatalkan (*rollback*) secara otomatis.
3. **Presisi Angka Keuangan & Kuantitas:**
   - Untuk menyimpan nominal mata uang atau angka desimal presisi tinggi di database relasional, gunakan tipe `Int` (simpan dalam satuan terkecil/sen atau Rupiah utuh) atau `Decimal` / `Numeric`.
   - **Jangan pernah** menggunakan tipe `Float` atau `Double` untuk perhitungan uang karena masalah ketidakakuratan *floating-point* biner.

---

## 8. Hierarki Manajemen State (State Management Rules)

Jangan menyimpan seluruh state di dalam `useState` atau *global store* (Zustand/Redux). Tempatkan state sesuai dengan peruntukannya:

1. **URL State (`searchParams`) → Prioritas Utama untuk Filter & Navigasi:**
   - Gunakan URL untuk menyimpan kata kunci pencarian (`?q=laptop`), posisi halaman paginasi (`?page=2`), filter rentang tanggal (`?from=2026-01-01`), dan tab aktif (`?tab=analytics`).
   - **Keuntungan:** Halaman dapat dibagikan lewat tautan (*shareable URL*), dapat di-*bookmark*, dan posisi tampilan tidak hilang saat pengguna memuat ulang (*refresh*) browser.
2. **Server State (Framework Cache & Database):**
   - Data yang diambil dari database tidak perlu disalin ke dalam global state Zustand. Biarkan Server Component yang mengambil data dan meneruskannya ke komponen anak melalui *props*.
3. **Local UI State (`useState`):**
   - Gunakan khusus untuk interaksi antarmuka lokal yang terisolasi pada satu komponen (misalnya: membuka/menutup Dialog Modal, *toggle* visibilitas *password*, atau membuka *Dropdown*).
4. **Form State (React Hook Form):**
   - Seluruh input form yang memiliki validasi wajib dikelola oleh `useForm()` dari React Hook Form yang diintegrasikan dengan `zodResolver`.
5. **Global Client State (Zustand):**
   - Gunakan hanya untuk data sementara lintas komponen di sisi klien sebelum dikirim ke server, atau fitur antarmuka global (misalnya: *Shopping Cart* lokal, *Draft Auto-Save* di `localStorage`, atau kontrol pemutar media/notifikasi global).

---

## 9. Standar Styling & Design System (Tailwind CSS & UI Library)

1. **Gunakan Fungsi `cn()` untuk Menggabungkan Class Dinamis:**
   - Saat menerapkan class CSS bersyarat, selalu gunakan helper `cn()` dari `@/lib/utils` (kombinasi `clsx` dan `tailwind-merge`) untuk menghindari konflik class Tailwind.

```tsx
// ✅ BERSIH
<Badge
  className={cn(
    "px-2 py-1 text-xs font-medium",
    status === "URGENT" && "bg-red-100 text-red-800",
    status === "COMPLETED" && "bg-green-100 text-green-800"
  )}
>
  {status}
</Badge>
```

2. **Gunakan Variabel Warna Semantik (*Design Tokens*):**
   - Hindari menulis kode warna spesifik secara acak di tiap halaman (misal `bg-blue-500` di halaman A, lalu `bg-sky-600` di halaman B).
   - Gunakan kelas semantik seperti `bg-primary`, `text-muted-foreground`, `bg-destructive`, dan `border-input` agar perubahan tema merek atau dukungan *Dark Mode* terpusat di satu file konfigurasi (`globals.css`).

---

## 10. Standar Git & Daftar Periksa Sebelum Commit (Checklist)

Gunakan format **Conventional Commits** pada setiap pesan *commit* Git agar riwayat perubahan proyek terstruktur dan mudah dilacak:

- `feat(orders): tambah fitur ekspor laporan pesanan ke PDF`
- `fix(payments): perbaiki pembulatan perhitungan diskon kupon`
- `refactor(products): pecah komponen form produk menjadi sub-komponen`
- `schema(db): tambah indeks pencarian pada kolom email dan kode produk`
- `chore(deps): perbarui dependensi validasi dan komponen UI`

### Checklist Mandiri Sebelum Menutup Fitur / Pull Request

- [ ] Apakah ada file yang panjangnya melebihi **250 baris**? *(Jika ya, pecah menjadi sub-komponen atau custom hook sekarang).*
- [ ] Apakah ada tipe `any` yang terselip? *(Ganti dengan tipe eksplisit, inferensi skema, atau `unknown`).*
- [ ] Apakah setiap mutasi data (*Server Action* / API Endpoint) sudah memeriksa sesi autentikasi, hak akses role, dan validasi input Zod?
- [ ] Apakah operasi database yang mengubah lebih dari satu tabel sudah dibungkus dalam `$transaction`?
- [ ] Apakah tombol *Submit* pada form sudah memiliki atribut `disabled={isPending}` untuk mencegah pengiriman data ganda akibat klik berulang (*double submit*)?
- [ ] Apakah pengguna mendapatkan umpan balik visual yang jelas (*Loading State*, *Toast Success*, atau *Toast Error*) pada setiap aksi mutasi data?