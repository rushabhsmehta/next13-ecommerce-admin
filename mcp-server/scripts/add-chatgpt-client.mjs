import fs from "fs";

const path = "/data/mcp-clients.json";
const data = JSON.parse(fs.readFileSync(path, "utf8"));

data.e75236b6a00f14dcfad4d19dcfea04a7 = {
  clientId: "e75236b6a00f14dcfad4d19dcfea04a7",
  clientName: "ChatGPT",
  redirectUris: ["https://chatgpt.com/connector/oauth/KY4bYmVa6npl"],
  createdAt: Date.now(),
};

fs.writeFileSync(path, JSON.stringify(data, null, 2));
console.log(fs.readFileSync(path, "utf8"));
