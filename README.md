# 🔧 IS2-WFlow v3.0 - Workflow Management System

Sistem manajemen workflow maintenance terintegrasi dengan Google Sheets untuk pendaftaran user, manajemen PdM (Predictive Maintenance), dan PM02 (Preventive Maintenance).

## 📋 Fitur Utama

### ✅ Sistem Registrasi & Autentikasi
- **Role-Based Access Control (RBAC)**
  - **Admin1**: Vice President, SIE → Mandat ke Staff/AVP
  - **Admin2**: AVP → Mandat ke Staff (Rotating 1, 2, Bengkel QC)
  - **Staff**: Akses standard

### 📊 PdM (Predictive Maintenance)
- Kolom: Pabrik | Area | WO | Deskripsi | Tanggal Start | WorkCenter | Realisasi | Status | PIC | Notes
- **Workflow Status**: `Datacollect → Laporan → Analisa → INSP → AVP → Done`
- **Dashboard**: Datacollect-AVP = "On Progress", Done = "Done"
- **Mode CRUD**: Staff dapat update saat mengerjakan & transfer PIC

### 🔧 PM02 (Preventive Maintenance)
- Kolom: Pabrik | WO | Deskripsi | Tanggal | Workcenter | Equipment | Status | PIC | PIC2 | Tindakan
- **Workflow Status**: `Open → On Progress → Tindakan (Optional) → Done`
- **Multi-PIC**: Support 2 PIC untuk team work
- **Mode CRUD**: Staff dapat update & transfer PIC

## 🗂️ Struktur Data Google Sheet

### Sheet: `users`
| A: Email | B: Nama | C: Jabatan | D: NIK | E: Role | F: Password | G: Created Date |
|----------|---------|-----------|--------|---------|-----------|-----------------|

### Sheet: `PIC`
| A: Nama | B: NIK | C: Jabatan |
|---------|--------|----------|

### Sheet: `PdM`
| A: Pabrik | B: Area | C: WO | D: Deskripsi | E: Tanggal Start | F: WorkCenter | G: Realisasi | H: Status | I: PIC | J: Notes |

### Sheet: `PM02`
| A: Pabrik | B: WO | C: Deskripsi | D: Tanggal | E: Workcenter | F: Equipment | G: Status | H: PIC | I: PIC2 | J: Tindakan |

## 🚀 Setup Instructions

1. **Google Sheets**: Buat sheet baru dengan struktur di atas
2. **Google Apps Script**:
   - Buka Google Sheets
   - Tools → Script Editor
   - Copy paste file dari `/appscript` folder
3. **Deploy**: Deploy sebagai web app
4. **Share**: Share link ke users

## 📁 File Structure

```
IS2-WFlow/
├── appscript/
│   ├── Code.gs
│   ├── Index.html
│   ├── JavaScript.html
│   └── CSS.html
├── docs/
│   ├── ROLE-PERMISSIONS.md
│   ├── WORKFLOW-GUIDE.md
│   └── SETUP-GUIDE.md
└── README.md
```

## 👥 Role Permissions

| Action | Admin1 | Admin2 | Staff |
|--------|--------|--------|-------|
| Login | ✅ | ✅ | ✅ |
| View Dashboard | ✅ | ✅ | ✅ |
| Input PdM/PM02 | ✅ | ✅ | ❌ |
| Update Status | ✅ | ✅ | ✅ |
| Transfer PIC | ✅ | ✅ | ✅ |
| Assign Task | ✅ (to AVP/Staff) | ✅ (to Staff) | ❌ |

## 🔐 Security Warning

⚠️ Password disimpan plain text di sheet. Untuk production:
- Implementasi password hashing
- Gunakan OAuth Google
- Encrypt sensitive data

---

**Created**: 2026-05-16  
**Owner**: @maulanaalatsar93-design  
**Status**: Active Development
