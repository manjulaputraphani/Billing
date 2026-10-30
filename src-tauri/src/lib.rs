use argon2::password_hash::{rand_core::OsRng, PasswordHash, SaltString};
use argon2::{Argon2, PasswordHasher, PasswordVerifier};

/// One keychain entry namespace for the whole app.
const KEYRING_SERVICE: &str = "stock-tracker";

fn entry(key: &str) -> Result<keyring::Entry, String> {
    keyring::Entry::new(KEYRING_SERVICE, key).map_err(|e| e.to_string())
}

/// Store a secret (DATABASE_URL, PIN_HASH) in the OS keychain.
#[tauri::command]
fn save_secret(key: String, value: String) -> Result<(), String> {
    entry(&key)?
        .set_password(&value)
        .map_err(|e| e.to_string())
}

/// Read a secret. Returns null when nothing has been saved yet.
#[tauri::command]
fn get_secret(key: String) -> Result<Option<String>, String> {
    match entry(&key)?.get_password() {
        Ok(value) => Ok(Some(value)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

/// Remove a secret. Missing entries are not an error.
#[tauri::command]
fn delete_secret(key: String) -> Result<(), String> {
    match entry(&key)?.delete_credential() {
        Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
        Err(e) => Err(e.to_string()),
    }
}

/// Hash a PIN with argon2id and a fresh random salt.
#[tauri::command]
fn hash_pin(pin: String) -> Result<String, String> {
    let salt = SaltString::generate(&mut OsRng);
    Argon2::default()
        .hash_password(pin.as_bytes(), &salt)
        .map(|hash| hash.to_string())
        .map_err(|e| e.to_string())
}

/// Check a PIN against a stored argon2 hash. A malformed hash is `false`, not an error.
#[tauri::command]
fn verify_pin(pin: String, hash: String) -> Result<bool, String> {
    let parsed = match PasswordHash::new(&hash) {
        Ok(p) => p,
        Err(_) => return Ok(false),
    };
    Ok(Argon2::default()
        .verify_password(pin.as_bytes(), &parsed)
        .is_ok())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            save_secret,
            get_secret,
            delete_secret,
            hash_pin,
            verify_pin
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
