# POST /mail/v1/send

Sends a contact form email via SMTP. Protected.

## Request

**Method:** `POST`  
**Content-Type:** `application/x-www-form-urlencoded`

### Parameters

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | no | Sender name |
| `email` | string | no | Sender email address (used as Reply-To) |
| `company` | string | no | Sender company |
| `phone` | string | no | Sender phone number |
| `subject` | string | no | Email subject (defaults to `Nachricht aus Kontaktformular`) |
| `message` | string | no | Email body |
| `from` | string | no | From address (defaults to server default) |
| `to` | string | no | Recipient address (defaults to server default) |
| `redirect` | string | no | URL to redirect to after success (defaults to `https://www.operun.de`) |

## Responses

| Status | Description |
|--------|-------------|
| `302` | Email sent, redirect to `redirect` URL |
| `400` | Submission blocked (blacklisted term, fake name, or fake company) |
| `500` | SMTP error |

## Example (HTML form)

```html
<form method="POST" action="https://api.operun.de/mail/v1/send?key=API_KEY">
  <input type="text" name="name" placeholder="Name" required />
  <input type="email" name="email" placeholder="E-Mail" required />
  <input type="text" name="company" placeholder="Firma" />
  <textarea name="message" placeholder="Nachricht"></textarea>
  <input type="hidden" name="redirect" value="https://example.com/danke" />
  <button type="submit">Senden</button>
</form>
```

## Example (fetch)

```js
const form = new FormData();
form.append('name', 'Max Mustermann');
form.append('email', 'max@example.com');
form.append('message', 'Hallo!');
form.append('redirect', 'https://example.com/danke');

await fetch('https://api.operun.de/mail/v1/send?key=API_KEY', {
  method: 'POST',
  body: form,
});
```

## Spam Filters

Submissions are automatically blocked if:
- any field contains a blacklisted term (managed via `/mail/v1/blacklist`)
- the company field matches a known fake value (e.g. `google`)
- the name field is scored as fake (all-caps, no vowels, numeric characters, etc.)
