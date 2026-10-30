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
    hash_secret(&pin)
}

/// Check a PIN against a stored argon2 hash. A malformed hash is `false`, not an error.
#[tauri::command]
fn verify_pin(pin: String, hash: String) -> Result<bool, String> {
    Ok(verify_secret(&pin, &hash))
}

fn hash_secret(secret: &str) -> Result<String, String> {
    let salt = SaltString::generate(&mut OsRng);
    Argon2::default()
        .hash_password(secret.as_bytes(), &salt)
        .map(|hash| hash.to_string())
        .map_err(|e| e.to_string())
}

fn verify_secret(secret: &str, hash: &str) -> bool {
    let parsed = match PasswordHash::new(hash) {
        Ok(parsed) => parsed,
        Err(_) => return false,
    };
    Argon2::default()
        .verify_password(secret.as_bytes(), &parsed)
        .is_ok()
}

/// Hash a member password (argon2id + random salt) — docs/PLAN_LOGIN.md L2.
#[tauri::command]
fn hash_password(password: String) -> Result<String, String> {
    hash_secret(&password)
}

/// Constant-time check of a password against a stored argon2 hash.
#[tauri::command]
fn verify_password(password: String, hash: String) -> Result<bool, String> {
    Ok(verify_secret(&password, &hash))
}

#[cfg(test)]
mod auth_tests {
    use super::{hash_secret, verify_secret};

    #[test]
    fn password_roundtrip() {
        let hash = hash_secret("secret123").expect("hash");
        assert!(verify_secret("secret123", &hash));
    }

    #[test]
    fn wrong_password_is_rejected() {
        let hash = hash_secret("secret123").expect("hash");
        assert!(!verify_secret("secret124", &hash));
    }

    #[test]
    fn malformed_hash_is_rejected() {
        assert!(!verify_secret("secret123", "not-a-hash"));
    }

    #[test]
    fn two_hashes_differ_by_salt() {
        assert_ne!(hash_secret("same").unwrap(), hash_secret("same").unwrap());
    }
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct EmailInput {
    host: String,
    port: u16,
    username: String,
    password: String,
    from_email: String,
    from_name: Option<String>,
    to: String,
    subject: String,
    html: String,
}

/// Send the invoice email from the shop's own address (Gmail app password).
#[tauri::command]
async fn send_email(input: EmailInput) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || send_email_blocking(input))
        .await
        .map_err(|e| e.to_string())?
}

fn send_email_blocking(input: EmailInput) -> Result<(), String> {
    use lettre::message::header::ContentType;
    use lettre::message::Mailbox;
    use lettre::transport::smtp::authentication::Credentials;
    use lettre::{Message, SmtpTransport, Transport};

    let from = Mailbox::new(
        input.from_name.filter(|name| !name.trim().is_empty()),
        input
            .from_email
            .parse()
            .map_err(|_| "Invalid sender email")?,
    );
    let message = Message::builder()
        .from(from)
        .to(input.to.parse().map_err(|_| "Invalid recipient email")?)
        .subject(input.subject)
        .header(ContentType::TEXT_HTML)
        .body(input.html)
        .map_err(|e| e.to_string())?;

    let mailer = SmtpTransport::relay(&input.host)
        .map_err(|e| e.to_string())?
        .port(input.port)
        .credentials(Credentials::new(input.username, input.password))
        .build();

    mailer.send(&message).map(|_| ()).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_http::init())
        .invoke_handler(tauri::generate_handler![
            save_secret,
            get_secret,
            delete_secret,
            hash_pin,
            verify_pin,
            hash_password,
            verify_password,
            send_email
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
