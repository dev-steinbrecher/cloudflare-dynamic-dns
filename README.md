# cloudflare-dynamic-dns

This is a small script to change you IP dynamically in Cloudflare in case your internet provider assigns you a new IP adresse.

It supports IPv4 and IPv6

### Create an API token for the Cloudflare API

[Create Token](https://dash.cloudflare.com/profile/api-tokens)

### Fill config

- Rename config.json.default to config.json
- Token should be your created API token from above
- Zone ID is the ID that you get from the Cloudflare domain overview in the right panel

```json
{
  "token": "<token>",
  "zoneId": "<zoneId>"
}
```

### Edit Crontab

```bash
#add to crontab
*/1 * * * * cd <script dir> && $(which node) update_ip.js
```
