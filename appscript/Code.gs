const SS_ID = "1vEINfSVdoUDbKTqdob-c6_ZYMAhtbuHCEDIuCmhxrtM";

function doGet() {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('IS2-WFlow v3.0')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// ===== AUTH SYSTEM =====
function checkLogin(email, password) {
  try {
    const ss = SpreadsheetApp.openById(SS_ID);
    const userSheet = ss.getSheetByName("users");
    if (!userSheet) return { success: false, message: "Sheet users tidak ditemukan!" };
    
    const data = userSheet.getDataRange().getValues();
    if (data.length < 2) return { success: false, message: "Belum ada data user!" };
    
    // Data structure: A: Email, B: Nama, C: Jabatan, D: NIK, E: Role, F: Password, G: Created Date
    for (let i = 1; i < data.length; i++) {
      const userEmail = data[i][0] ? data[i][0].toString().trim() : "";
      const nama = data[i][1] ? data[i][1].toString().trim() : "";
      const jabatan = data[i][2] ? data[i][2].toString().trim() : "";
      const nik = data[i][3] ? data[i][3].toString().trim() : "";
      const role = data[i][4] ? data[i][4].toString().trim() : "";
      const storedPassword = data[i][5] ? data[i][5].toString().trim() : "";
      
      if (userEmail === email && storedPassword === password) {
        return { 
          success: true, 
          email: userEmail,
          nama: nama,
          jabatan: jabatan,
          nik: nik,
          role: role,
          isLoggedIn: true 
        };
      }
    }
    
    return { success: false, message: "❌ Email atau Password salah!" };
  } catch(e) {
    Logger.log("Error checkLogin: " + e);
    return { success: false, message: "❌ Error login: " + e.toString() };
  }
}

// Get PIC data dari sheet PIC
function getPICByNIK() {
  try {
    const ss = SpreadsheetApp.openById(SS_ID);
    const sheet = ss.getSheetByName("PIC");
    if (!sheet) return [];
    
    const data = sheet.getDataRange().getValues();
    if (data.length < 2) return [];
    
    let result = [];
    for (let i = 1; i < data.length; i++) {
      const nama = data[i][0] ? data[i][0].toString().trim() : "";
      const nik = data[i][1] ? data[i][1].toString().trim() : "";
      const jabatan = data[i][2] ? data[i][2].toString().trim() : "";
      
      if (nik) {
        result.push({
          nik: nik,
          nama: nama,
          jabatan: jabatan,
          displayText: `${nik} - ${nama} (${jabatan})`
        });
      }
    }
    
    return result.sort((a, b) => a.nik.localeCompare(b.nik));
  } catch(e) {
    Logger.log("Error getPICByNIK: " + e);
    return [];
  }
}

// Proses Registrasi
function processRegistration(obj) {
  try {
    const ss = SpreadsheetApp.openById(SS_ID);
    const userSheet = ss.getSheetByName("users");
    if (!userSheet) return { success: false, message: "Sheet users tidak ditemukan!" };
    
    const userData = userSheet.getDataRange().getValues();
    
    // CEK EMAIL SUDAH TERDAFTAR
    for (let i = 1; i < userData.length; i++) {
      if (userData[i][0] === obj.email) {
        return { success: false, message: "❌ Email sudah terdaftar!" };
      }
    }
    
    // CEK NIK SUDAH TERDAFTAR
    for (let i = 1; i < userData.length; i++) {
      if (userData[i][3] === obj.nik) {
        return { success: false, message: "❌ NIK sudah terdaftar!" };
      }
    }
    
    // VALIDASI: NIK harus ada di PIC master
    const validPIC = getPICByNIK();
    const matchingPIC = validPIC.find(pic => pic.nik === obj.nik);
    
    if (!matchingPIC) {
      return { success: false, message: "❌ NIK tidak ditemukan di daftar PIC resmi!" };
    }
    
    // Tentukan role berdasarkan jabatan
    let assignedRole = "staff";
    if (matchingPIC.jabatan.includes("Vice President") || matchingPIC.jabatan.includes("SIE")) {
      assignedRole = "admin1";
    } else if (matchingPIC.jabatan.startsWith("AVP")) {
      assignedRole = "admin2";
    }
    
    // REGISTRASI BERHASIL
    userSheet.appendRow([
      obj.email,
      matchingPIC.nama,
      matchingPIC.jabatan,
      matchingPIC.nik,
      assignedRole,
      obj.password,
      new Date()
    ]);
    
    Logger.log("User berhasil terdaftar: " + obj.email + " | Role: " + assignedRole);
    return { success: true, message: "✅ Registrasi berhasil! Silakan Login." };
  } catch(e) {
    Logger.log("Error processRegistration: " + e);
    return { success: false, message: "❌ Error registrasi: " + e.toString() };
  }
}

// ===== ROLE BASED FUNCTIONS =====
function isAdmin1(jabatan) {
  return jabatan.includes("Vice President") || jabatan.includes("SIE");
}

function isAdmin2(jabatan) {
  return jabatan.startsWith("AVP");
}

function canAssignTask(assignerRole, targetRole) {
  const hierarchy = {
    "admin1": ["staff", "admin2"],
    "admin2": ["staff"],
    "staff": []
  };
  return hierarchy[assignerRole]?.includes(targetRole) || false;
}

function getSubordinateUsers(userJabatan) {
  try {
    const ss = SpreadsheetApp.openById(SS_ID);
    const userSheet = ss.getSheetByName("users");
    if (!userSheet) return [];
    
    const data = userSheet.getDataRange().getValues();
    let result = [];
    
    for (let i = 1; i < data.length; i++) {
      const email = data[i][0] ? data[i][0].toString().trim() : "";
      const nama = data[i][1] ? data[i][1].toString().trim() : "";
      const jabatan = data[i][2] ? data[i][2].toString().trim() : "";
      const role = data[i][4] ? data[i][4].toString().trim() : "";
      
      // admin1 (VP, SIE) bisa assign ke Staff dan AVP
      if (isAdmin1(userJabatan)) {
        if (role === "staff" || jabatan.startsWith("AVP")) {
          result.push({ email, nama, jabatan, role });
        }
      }
      // admin2 (AVP) bisa assign ke Staff saja
      else if (isAdmin2(userJabatan)) {
        if (role === "staff" && !jabatan.includes("Vice President") && !jabatan.includes("SIE") && !jabatan.startsWith("AVP")) {
          result.push({ email, nama, jabatan, role });
        }
      }
    }
    
    return result;
  } catch(e) {
    Logger.log("Error getSubordinateUsers: " + e);
    return [];
  }
}

// ===== PdM DATA FUNCTIONS =====
function getPdMData() {
  try {
    const ss = SpreadsheetApp.openById(SS_ID);
    const sheet = ss.getSheetByName("PdM") || ss.getSheetByName("data3");
    if (!sheet) return [];
    
    const data = sheet.getDataRange().getValues();
    if (data.length < 2) return [];
    
    let result = [];
    for (let i = 1; i < data.length; i++) {
      result.push({
        rowId: i + 2,
        pabrik: data[i][0] || "-",
        area: data[i][1] || "-",
        wo: data[i][2] || "-",
        deskripsi: data[i][3] || "-",
        tanggalStart: formatDate(data[i][4]),
        workCenter: data[i][5] || "-",
        realisasi: data[i][6] || "-",
        status: data[i][7] || "Datacollect",
        pic: data[i][8] || "-",
        notes: data[i][9] || "-"
      });
    }
    return result.reverse();
  } catch(e) {
    Logger.log("Error getPdMData: " + e);
    return [];
  }
}

function addPdMData(obj) {
  try {
    const ss = SpreadsheetApp.openById(SS_ID);
    const sheet = ss.getSheetByName("PdM") || ss.getSheetByName("data3");
    if (!sheet) return { success: false, message: "Sheet PdM tidak ditemukan!" };
    
    sheet.appendRow([
      obj.pabrik,
      obj.area,
      obj.wo,
      obj.deskripsi,
      new Date(obj.tanggalStart),
      obj.workCenter,
      obj.realisasi || "-",
      "Datacollect",
      obj.pic || "-",
      obj.notes || "-"
    ]);
    
    return { success: true, message: "✅ Data PdM berhasil ditambahkan!" };
  } catch(e) {
    return { success: false, message: "❌ Error: " + e.toString() };
  }
}

function updatePdMData(rowId, updates) {
  try {
    const ss = SpreadsheetApp.openById(SS_ID);
    const sheet = ss.getSheetByName("PdM") || ss.getSheetByName("data3");
    if (!sheet) return { success: false, message: "Sheet PdM tidak ditemukan!" };
    
    if (updates.realisasi) sheet.getRange(rowId, 7).setValue(updates.realisasi);
    if (updates.status) sheet.getRange(rowId, 8).setValue(updates.status);
    if (updates.pic) sheet.getRange(rowId, 9).setValue(updates.pic);
    if (updates.notes) sheet.getRange(rowId, 10).setValue(updates.notes);
    
    return { success: true, message: "✅ Data PdM berhasil diupdate!" };
  } catch(e) {
    return { success: false, message: "❌ Error: " + e.toString() };
  }
}

// ===== PM02 DATA FUNCTIONS =====
function getPM02Data() {
  try {
    const ss = SpreadsheetApp.openById(SS_ID);
    const sheet = ss.getSheetByName("PM02") || ss.getSheetByName("data2");
    if (!sheet) return [];
    
    const data = sheet.getDataRange().getValues();
    if (data.length < 2) return [];
    
    let result = [];
    for (let i = 1; i < data.length; i++) {
      result.push({
        rowId: i + 2,
        pabrik: data[i][0] || "-",
        wo: data[i][1] || "-",
        deskripsi: data[i][2] || "-",
        tanggal: formatDate(data[i][3]),
        workCenter: data[i][4] || "-",
        equipment: data[i][5] || "-",
        status: data[i][6] || "Open",
        pic: data[i][7] || "-",
        pic2: data[i][8] || "-",
        tindakan: data[i][9] || "-"
      });
    }
    return result.reverse();
  } catch(e) {
    Logger.log("Error getPM02Data: " + e);
    return [];
  }
}

function addPM02Data(obj) {
  try {
    const ss = SpreadsheetApp.openById(SS_ID);
    const sheet = ss.getSheetByName("PM02") || ss.getSheetByName("data2");
    if (!sheet) return { success: false, message: "Sheet PM02 tidak ditemukan!" };
    
    sheet.appendRow([
      obj.pabrik,
      obj.wo,
      obj.deskripsi,
      new Date(obj.tanggal),
      obj.workCenter,
      obj.equipment,
      "Open",
      obj.pic || "-",
      obj.pic2 || "-",
      obj.tindakan || "-"
    ]);
    
    return { success: true, message: "✅ Data PM02 berhasil ditambahkan!" };
  } catch(e) {
    return { success: false, message: "❌ Error: " + e.toString() };
  }
}

function updatePM02Data(rowId, updates) {
  try {
    const ss = SpreadsheetApp.openById(SS_ID);
    const sheet = ss.getSheetByName("PM02") || ss.getSheetByName("data2");
    if (!sheet) return { success: false, message: "Sheet PM02 tidak ditemukan!" };
    
    if (updates.status) sheet.getRange(rowId, 7).setValue(updates.status);
    if (updates.pic) sheet.getRange(rowId, 8).setValue(updates.pic);
    if (updates.pic2) sheet.getRange(rowId, 9).setValue(updates.pic2);
    if (updates.tindakan) sheet.getRange(rowId, 10).setValue(updates.tindakan);
    
    return { success: true, message: "✅ Data PM02 berhasil diupdate!" };
  } catch(e) {
    return { success: false, message: "❌ Error: " + e.toString() };
  }
}

// ===== PUBLIC DASHBOARD =====
function getPublicDashboardStats() {
  try {
    const ss = SpreadsheetApp.openById(SS_ID);
    let stats = { done: 0, progress: 0, pending: 0, total: 0 };
    
    const pdmSheet = ss.getSheetByName("PdM") || ss.getSheetByName("data3");
    if (pdmSheet) {
      const data = pdmSheet.getDataRange().getValues();
      if (data.length > 1) {
        for (let i = 1; i < data.length; i++) {
          const status = (data[i][7] || "").toString().toLowerCase();
          stats.total++;
          if (status === 'done') stats.done++;
          else if (["datacollect", "laporan", "analisa", "insp", "avp"].includes(status)) stats.progress++;
        }
      }
    }
    
    const pm02Sheet = ss.getSheetByName("PM02") || ss.getSheetByName("data2");
    if (pm02Sheet) {
      const data = pm02Sheet.getDataRange().getValues();
      if (data.length > 1) {
        for (let i = 1; i < data.length; i++) {
          const status = (data[i][6] || "").toString().toLowerCase();
          stats.total++;
          if (status === 'done') stats.done++;
          else stats.progress++;
        }
      }
    }
    
    stats.pending = stats.total - stats.done - stats.progress;
    return stats;
  } catch(e) {
    Logger.log("Error getPublicDashboardStats: " + e);
    return { done: 0, progress: 0, pending: 0, total: 0 };
  }
}

function getPublicWorkData() {
  try {
    const ss = SpreadsheetApp.openById(SS_ID);
    let allData = [];
    
    const pdmSheet = ss.getSheetByName("PdM") || ss.getSheetByName("data3");
    if (pdmSheet) {
      const data = pdmSheet.getDataRange().getValues();
      if (data.length > 1) {
        for (let i = 1; i < data.length; i++) {
          allData.push({
            rowId: i + 2,
            type: "PdM",
            pabrik: data[i][0] || "-",
            wo: data[i][2] || "-",
            status: data[i][7] || "Datacollect",
            pic: data[i][8] || "-"
          });
        }
      }
    }
    
    const pm02Sheet = ss.getSheetByName("PM02") || ss.getSheetByName("data2");
    if (pm02Sheet) {
      const data = pm02Sheet.getDataRange().getValues();
      if (data.length > 1) {
        for (let i = 1; i < data.length; i++) {
          allData.push({
            rowId: i + 2,
            type: "PM02",
            pabrik: data[i][0] || "-",
            wo: data[i][1] || "-",
            status: data[i][6] || "Open",
            pic: data[i][7] || "-"
          });
        }
      }
    }
    
    return allData.reverse().slice(0, 20);
  } catch(e) {
    Logger.log("Error getPublicWorkData: " + e);
    return [];
  }
}

function getDashboardStats(userRole) {
  try {
    const ss = SpreadsheetApp.openById(SS_ID);
    let stats = { pdm: { done: 0, progress: 0, pending: 0, total: 0 }, pm02: { done: 0, progress: 0, pending: 0, total: 0 } };
    
    const pdmSheet = ss.getSheetByName("PdM") || ss.getSheetByName("data3");
    if (pdmSheet) {
      const data = pdmSheet.getDataRange().getValues();
      if (data.length > 1) {
        for (let i = 1; i < data.length; i++) {
          const status = (data[i][7] || "").toString().toLowerCase();
          stats.pdm.total++;
          if (status === 'done') stats.pdm.done++;
          else if (["datacollect", "laporan", "analisa", "insp", "avp"].includes(status)) stats.pdm.progress++;
          else stats.pdm.pending++;
        }
      }
    }
    
    const pm02Sheet = ss.getSheetByName("PM02") || ss.getSheetByName("data2");
    if (pm02Sheet) {
      const data = pm02Sheet.getDataRange().getValues();
      if (data.length > 1) {
        for (let i = 1; i < data.length; i++) {
          const status = (data[i][6] || "").toString().toLowerCase();
          stats.pm02.total++;
          if (status === 'done') stats.pm02.done++;
          else if (status.includes('progress') || status === 'on progress') stats.pm02.progress++;
          else stats.pm02.pending++;
        }
      }
    }
    
    return stats;
  } catch(e) {
    Logger.log("Error getDashboardStats: " + e);
    return { pdm: { done: 0, progress: 0, pending: 0, total: 0 }, pm02: { done: 0, progress: 0, pending: 0, total: 0 } };
  }
}

// ===== UTILITY FUNCTIONS =====
function formatDate(date) {
  if (!date) return "-";
  try {
    return Utilities.formatDate(new Date(date), "GMT+7", "yyyy-MM-dd");
  } catch(e) {
    return "-";
  }
}

function formatDateTime(date) {
  if (!date) return "-";
  try {
    return Utilities.formatDate(new Date(date), "GMT+7", "dd/MM/yyyy HH:mm");
  } catch(e) {
    return "-";
  }
}

function getPdMStatuses() {
  return ["Datacollect", "Laporan", "Analisa", "INSP", "AVP", "Done"];
}

function getPM02Statuses() {
  return ["Open", "On Progress", "Tindakan", "Done"];
}

function getWorkflowCategory(status) {
  const onProgress = ["Datacollect", "Laporan", "Analisa", "INSP", "AVP", "On Progress"];
  return onProgress.includes(status) ? "onprogress" : "done";
}
