# Vault++: The Zero-Knowledge KYC Vault 🔐

**Project Category:** TRACK 4: SECURE DOCUMENT VAULT

**Github URL:** [https://github.com/rishik-karthik/valit](https://github.com/rishik-karthik/valit)

## 1. The Problem Statement

Modern Fintech platforms are required to collect sensitive Know Your Customer (KYC) documents, such as government IDs and tax forms. Standard industry practice often involves storing these files in centralized cloud buckets. This creates a massive security risk: if the database or cloud provider is breached, the unencrypted files are exposed, leading to identity theft and regulatory non-compliance.

## 2. The Objective

**Valit** implements a **"Zero-Knowledge" architecture**. The goal is to ensure that encryption happens exclusively on the user’s device (client-side).

* **Privacy:** The cloud server (Supabase/Firebase) stores only encrypted "garbage text" (blobs).
* **Security:** The platform never possesses, sees, or transmits the user's decryption key or raw PIN.
* **Control:** Only the user, with their unique secret PIN, can turn that "noise" back into a readable document.

## 3. Tech Stack

* **Frontend:** HTML5, CSS3 (Modern Dark Fintech UI)
* **Logic:** Vanilla JavaScript (ES6+)
* **Security API:** Web Crypto API (Native Browser Support)
* **Backend/Storage:** Supabase (Database & Storage Buckets)
* **External Integration:** "Have I Been Pwned" API (Pwned Passwords)

## 4. Key Features

* **Client-Side AES-GCM Encryption:** Files are encrypted in the browser before they ever touch the network.
* **PIN-to-Key Derivation:** Uses the **PBKDF2** algorithm to transform a user's simple PIN into a high-entropy cryptographic key.
* **Pwned-Password Verification:** Checks the user's PIN against 600+ million leaked passwords using a k-Anonymity privacy model.
* **Encrypted Blob Storage:** Stores files as encrypted binary objects that remain unreadable even to database administrators.

## 5. Technical Approach & Architecture

### Phase 1: Key Derivation (The Key Generator)

Instead of storing a password, we derive a key.

1. **Input:** User provides a "Secret PIN" and a file.
2. **Salt Generation:** A random "Salt" is generated to prevent rainbow table attacks.
3. **Derivation:** We use `window.crypto.subtle.importKey` followed by `PBKDF2`. This ensures the derived key stays in the browser's memory and is never sent to the internet.

### Phase 2: Client-Side Encryption

1. **Read:** The file is converted into an `ArrayBuffer`.
2. **Encrypt:** Using the `AES-GCM` algorithm (Advanced Encryption Standard with Galois/Counter Mode), we encrypt the buffer.
3. **Output:** The result is an encrypted "Blob" of random noise.

### Phase 3: Secure Upload

1. **Storage:** The encrypted Blob is uploaded to the Supabase/Firebase cloud bucket.
2. **Verification:** Even if an attacker gains access to the cloud console, the files are binary noise with no way to decrypt them without the user's local PIN.

### Phase 4: Safety Check (Breach Check)

To prevent users from using weak or compromised PINs:

* The PIN is hashed using SHA-1.
* The first 5 characters of the hash are sent to the **Have I Been Pwned API**.
* The API returns a list of matching hash suffixes; the app checks the list locally. This confirms if a PIN is compromised without ever sending the full PIN to the API.

## 6. How to Run Locally

1. Clone the repository:
```bash
git clone https://github.com/rishik-karthik/valit.git

```


2. Create a `.env` file in the root directory (refer to `.env.example`).
3. Add your Supabase/Firebase credentials:
```text
SUPABASE_URL=your_project_url
SUPABASE_ANON_KEY=your_anon_key

```


4. Open `index.html` using a local server (like VS Code Live Server).

## 7. Future Roadmap

* **Multi-Factor Authentication (MFA):** Adding a second layer of identity verification.
* **Biometric Unlocking:** Integrating WebAuthn for Fingerprint/FaceID decryption.
* **PDF Previewer:** A secure, in-browser PDF renderer that decrypts and displays data without saving it to disk.

---

**Disclaimer:** This project was built for the Finnovate "Zero-Knowledge KYC" challenge to demonstrate secure architectural patterns in Fintech.
