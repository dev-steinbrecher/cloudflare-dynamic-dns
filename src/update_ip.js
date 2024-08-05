const fs = require("fs");
const https = require("https");

const SCRIPT_DIR = process.cwd();
const CURRENT_IP_FILE = `${SCRIPT_DIR}/config/current_ip`;
const LOG_FILE = `${SCRIPT_DIR}/log/cloudflare-dynamic-dns.log`;
const CONFIG = loadJSONFile(`${SCRIPT_DIR}/config/config.json`);

let newIPv4 = "";
let newIPv6 = "";

(async () => {
  await getNewIPv4();
  await getNewIPv6();

  if (didIpChange()) {
    for (const dnsRecord of await getDNSRecordsToEdit()) {
      updateIP(dnsRecord);
    }
  }
})();

async function getDNSRecordsToEdit() {
  let dnsRecordsToEdit = [];
  await restCall(
    `https://api.cloudflare.com/client/v4/zones/${CONFIG.zoneId}/dns_records/`,
  ).then((data) => {
    let dnsRecords = data.result;
    for (const dnsRecord of dnsRecords) {
      if (dnsRecord.type === "A" || dnsRecord.type === "AAAA") {
        dnsRecordsToEdit.push(dnsRecord);
      }
    }
  });
  return dnsRecordsToEdit;
}

function updateIP(dnsRecord) {
  const data = JSON.stringify({
    content: dnsRecord.type === "A" ? newIPv4 : newIPv6,
    name: dnsRecord.name,
    type: dnsRecord.type,
    id: dnsRecord.id,
    ttl: dnsRecord.ttl,
  });

  const options = {
    hostname: "api.cloudflare.com",
    port: 443,
    path: `/client/v4/zones/${CONFIG.zoneId}/dns_records/${dnsRecord.id}`,
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${CONFIG.token}`,
      "Content-Length": data.length,
    },
  };

  const req = https.request(options, (res) => {
    let responseData = "";

    res.on("data", (chunk) => {
      responseData += chunk;
    });

    res.on("end", () => {
      const logEntry = `Info: Updated DNS record with IP: ${dnsRecord.type === "A" ? newIPv4 : newIPv6}. Response: ${responseData}`;
      logMessage(logEntry);
    });
  });

  req.on("error", (e) => {
    const errorMessage = `Problem with request: ${e.message}`;
    logMessage(errorMessage);
  });

  req.write(data);
  req.end();
}

function didIpChange() {
  let STORED_IP;
  if (fs.existsSync(CURRENT_IP_FILE)) {
    STORED_IP = fs.readFileSync(CURRENT_IP_FILE, "utf8").trim();
  }

  if (newIPv4 !== STORED_IP) {
    fs.writeFileSync(CURRENT_IP_FILE, newIPv4, "utf8");
    return true;
  }
  return false;
}

function logMessage(message) {
  const timestamp = new Date().toISOString();
  fs.appendFileSync(LOG_FILE, `[${timestamp}] ${message}\n`, "utf8");
}

function loadJSONFile(filePath) {
  try {
    const data = fs.readFileSync(filePath, "utf8");
    return JSON.parse(data);
  } catch (err) {
    console.error(err);
    logMessage(err);
    return null;
  }
}

async function restCall(url) {
  const headers = new Headers({
    "Content-Type": "application/json",
    Authorization: `Bearer ${CONFIG.token}`,
  });
  const options = {
    method: "GET",
    headers: headers,
  };
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching JSON:", error);
  }
}

async function getNewIPv4() {
  await (await fetch("https://api.ipify.org?format=json"))
    .json()
    .then((data) => {
      newIPv4 = data.ip;
    });
}

async function getNewIPv6() {
  await (await fetch("https://api6.ipify.org?format=json"))
    .json()
    .then((data) => {
      newIPv6 = data.ip;
    });
}
