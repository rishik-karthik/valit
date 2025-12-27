const SUPABASE_URL = "https://ydissebdldqipiexcloa.supabase.co";
const SUPABASE_KEY = "sb_publishable_LaAaHSqptk_fDHzoANDayA_YrXDT0SA";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const ADMIN_EMAIL = "admin@gmail.com";
let currentUser = null;
let activeTimer = null;
let currentViewingFile = null; // Track file to delete from verification bucket

// --- THEME TOGGLE ---
function toggleTheme() {
  const html = document.documentElement;
  const currentTheme = html.getAttribute('data-theme');
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  
  html.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
  
  // Update icon
  const themeIcon = document.getElementById('themeIcon');
  if (themeIcon) {
    const path = themeIcon.querySelector('path');
    if (path) {
      if (newTheme === 'light') {
        path.setAttribute('d', 'M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z');
      } else {
        path.setAttribute('d', 'M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z');
      }
    }
  }
}

// Initialize theme
function initTheme() {
  const savedTheme = localStorage.getItem('theme') || 'dark';
  const html = document.documentElement;
  html.setAttribute('data-theme', savedTheme);
  
  const themeIcon = document.getElementById('themeIcon');
  if (themeIcon) {
    const path = themeIcon.querySelector('path');
    if (path) {
      if (savedTheme === 'light') {
        path.setAttribute('d', 'M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z');
      } else {
        path.setAttribute('d', 'M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z');
      }
    }
  }
}

// --- NAVIGATION ---
function showPage(page) {
  // Hide all pages
  document.querySelectorAll('.page-section').forEach(section => {
    section.classList.add('hidden');
  });
  
  // Show selected page
  if (page === 'landing') {
    document.getElementById('landingPage').classList.remove('hidden');
    document.getElementById('navBar').classList.remove('hidden');
  } else if (page === 'about') {
    document.getElementById('aboutPage').classList.remove('hidden');
    document.getElementById('navBar').classList.remove('hidden');
  } else if (page === 'login') {
    document.getElementById('authSection').classList.remove('hidden');
    document.getElementById('navBar').classList.remove('hidden');
  } else if (page === 'vault') {
    document.getElementById('vaultSection').classList.remove('hidden');
    document.getElementById('navBar').classList.add('hidden');
  }
  
  // Update nav buttons
  document.querySelectorAll('.nav-link').forEach(btn => {
    btn.classList.remove('active');
  });
}

// --- AUTH ---
async function handleAuth(type) {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  try {
    const { data, error } =
      type === "login"
        ? await supabaseClient.auth.signInWithPassword({
            email,
            password,
          })
        : await supabaseClient.auth.signUp({ email, password });
    if (error) throw error;
    checkUser();
  } catch (e) {
    alert(e.message);
  }
}

async function logout() {
  await supabaseClient.auth.signOut();
  checkUser();
}

async function checkUser() {
  const {
    data: { user },
  } = await supabaseClient.auth.getUser();
  currentUser = user;
  if (user) {
    showPage('vault');
    document.getElementById(
      "userDisplay"
    ).innerText = `Logged in: ${user.email}`;

    if (user.email === ADMIN_EMAIL) {
      document.getElementById("adminPanel").classList.remove("hidden");
      fetchAdminQueue();
    } else {
      document.getElementById("adminPanel").classList.add("hidden");
    }
    fetchUserHistory();
  } else {
    showPage('landing');
  }
}

// --- CRYPTO HELPERS ---
async function getHash(text) {
  const msgUint8 = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-1", msgUint8);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

async function checkPwned(pin) {
  const hash = await getHash(pin);
  const res = await fetch(
    `https://api.pwnedpasswords.com/range/${hash.slice(0, 5)}`
  );
  const text = await res.text();
  return text.includes(hash.slice(5));
}

// --- CORE PROCESSES ---
async function startEncryption() {
  const pin = document.getElementById("pinInput").value;
  const file = document.getElementById("fileInput").files[0];
  if (!pin || !file) return alert("Missing Info");

  if (
    (await checkPwned(pin)) &&
    !confirm("PIN compromised in data breaches. Continue?")
  )
    return;

  try {
    updateUI("Encrypting...");
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const baseKey = await window.crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(pin),
      "PBKDF2",
      false,
      ["deriveKey"]
    );
    const key = await window.crypto.subtle.deriveKey(
      { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
      baseKey,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt"]
    );

    const fileBytes = await file.arrayBuffer();
    const encrypted = await window.crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      fileBytes
    );
    const finalBlob = new Blob([salt, iv, encrypted], {
      type: "application/octet-stream",
    });

    const storagePath = `${currentUser.id}/kyc_${Date.now()}.bin`;
    await supabaseClient.storage
      .from("vault")
      .upload(storagePath, finalBlob);
    await supabaseClient.from("user_documents").insert([
      {
        user_id: currentUser.id,
        file_name: storagePath,
        original_name: file.name,
      },
    ]);

    updateUI("Stored in Vault.");
    fetchUserHistory();
  } catch (e) {
    updateUI("Error: " + e.message, true);
  }
}

async function submitForVerification(fileName, originalName) {
  updateUI("Submitting to Officer...");
  try {
    const { data } = await supabaseClient.storage
      .from("vault")
      .download(fileName);
    const verifyPath = `${currentUser.id}/${fileName.split("/").pop()}`;

    const { error } = await supabaseClient.storage
      .from("verification")
      .upload(verifyPath, data);
    if (error) throw error;

    updateUI("File sent to Verification Bucket.");
    if (currentUser.email === ADMIN_EMAIL) fetchAdminQueue();
  } catch (e) {
    alert("Already submitted or error.");
  }
}

// --- VIEWING & CLEANUP ---
async function fetchUserHistory() {
  const { data } = await supabaseClient
    .from("user_documents")
    .select("*")
    .order("created_at", { ascending: false });
  renderList(data, "fileList", "vault");
}

async function fetchAdminQueue() {
  const adminList = document.getElementById("adminFileList");
  adminList.innerHTML = `<p class="text-[10px] text-slate-400 text-center">Scanning queue...</p>`;

  try {
    // 1. Get the list of folders (User IDs) in the verification bucket
    const { data: folders, error: folderErr } =
      await supabaseClient.storage.from("verification").list();

    if (folderErr) throw folderErr;

    adminList.innerHTML = "";
    let foundFiles = false;

    // 2. For each folder, list the files inside it
    for (const folder of folders) {
      // Skip placeholders
      if (folder.name.includes(".empty")) continue;

      const { data: files, error: fileErr } = await supabaseClient.storage
        .from("verification")
        .list(folder.name);

      if (fileErr || !files) continue;

      files.forEach((file) => {
        foundFiles = true;
        const fullPath = `${folder.name}/${file.name}`;

        const div = document.createElement("div");
        div.className =
          "p-3 bg-white border border-red-200 rounded-lg flex justify-between items-center mb-2 shadow-sm";
        div.innerHTML = `
                    <div class="flex flex-col">
                        <span class="text-[10px] font-bold text-slate-700 flex items-center gap-1">
                          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                          </svg>
                          User ID: ${folder.name.slice(
                          0,
                          8
                        )}...</span>
                        <span class="text-[8px] text-slate-400">File: ${
                          file.name
                        }</span>
                    </div>
                    <button onclick="decryptAndPreview('${fullPath}', 'verification')" 
                            class="bg-red-600 text-white px-3 py-1 rounded text-[10px] font-bold hover:bg-red-700">
                        VERIFY
                    </button>
                `;
        adminList.appendChild(div);
      });
    }

    if (!foundFiles) {
      adminList.innerHTML = `<p class="text-[10px] text-slate-400 text-center py-4">No pending verifications.</p>`;
    }
  } catch (e) {
    console.error("Admin Queue Error:", e);
    adminList.innerHTML = `<p class="text-[10px] text-red-500">Error loading queue. Check Console.</p>`;
  }
}

function renderList(data, divId, bucket) {
  const listDiv = document.getElementById(divId);
  listDiv.innerHTML = "";
  data?.forEach((doc) => {
    const container = document.createElement("div");
    container.className = "flex gap-2 mb-2";
          container.innerHTML = `
                    <button class="flex-1 text-left p-3 text-[10px] bg-white border border-slate-200 rounded-lg flex items-center gap-2" onclick="decryptAndPreview('${doc.file_name}', 'vault')">
                        <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                        </svg>
                        ${doc.original_name}
                    </button>
                    <button class="bg-blue-600 text-white px-3 py-1 rounded-lg text-[10px] font-bold" onclick="submitForVerification('${doc.file_name}', '${doc.original_name}')">
                        SHARE
                    </button>
                `;
    listDiv.appendChild(container);
  });
}

async function decryptAndPreview(path, bucket) {
  const pin = prompt(`Enter PIN for ${bucket} access:`);
  if (!pin) return;

  try {
    const { data } = await supabaseClient.storage
      .from(bucket)
      .download(path);
    const buffer = await data.arrayBuffer();
    const salt = buffer.slice(0, 16);
    const iv = buffer.slice(16, 28);
    const ciphertext = buffer.slice(28);

    const baseKey = await window.crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(pin),
      "PBKDF2",
      false,
      ["deriveKey"]
    );
    const key = await window.crypto.subtle.deriveKey(
      { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
      baseKey,
      { name: "AES-GCM", length: 256 },
      false,
      ["decrypt"]
    );
    const decrypted = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      ciphertext
    );

    const localUrl = URL.createObjectURL(
      new Blob([decrypted], { type: "application/pdf" })
    );
    document.getElementById("pdfViewer").src = localUrl + "#toolbar=0";
    document.getElementById("pdfModal").classList.remove("hidden");
    currentViewingFile = { path, bucket };

    let timeLeft = 60;
    if (activeTimer) clearInterval(activeTimer);
    activeTimer = setInterval(async () => {
      timeLeft--;
      document.getElementById(
        "modalTimer"
      ).innerText = `WIPING IN ${timeLeft}S`;
      if (timeLeft <= 0) {
        closeViewer();
        if (bucket === "verification") {
          await supabaseClient.storage
            .from("verification")
            .remove([path]);
          updateUI("Verification file auto-deleted from server.");
          fetchAdminQueue();
        }
      }
    }, 1000);
  } catch (e) {
    alert("Decryption failed.");
  }
}

function closeViewer() {
  clearInterval(activeTimer);
  const viewer = document.getElementById("pdfViewer");
  if (viewer.src.startsWith("blob:")) URL.revokeObjectURL(viewer.src);
  viewer.src = "";
  document.getElementById("pdfModal").classList.add("hidden");
}

function updateUI(msg, err = false) {
  document.getElementById("log").classList.remove("hidden");
  const st = document.getElementById("statusText");
  st.innerText = "> " + msg;
  st.style.color = err ? "red" : "black";
}

checkUser();

