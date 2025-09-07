const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");

class SynologyAPI {
  constructor() {
    this.host = process.env.SYNOLOGY_HOST;
    this.port = process.env.SYNOLOGY_PORT;
    this.username = process.env.SYNOLOGY_USERNAME;
    this.password = process.env.SYNOLOGY_PASSWORD;
    this.sessionId = null;
    this.baseUrl = `https://${this.host}:${this.port}`;
  }

  async login() {
    try {
      const response = await axios.get(`${this.baseUrl}/webapi/auth.cgi`, {
        params: {
          api: "SYNO.API.Auth",
          version: "3",
          method: "login",
          account: this.username,
          passwd: this.password,
          session: "FileStation",
          format: "cookie",
        },
      });
      if (response.data.success) {
        this.sessionId = response.data.data.sid;
        console.log("시놀로지 NAS 로그인 성공");
        return true;
      } else {
        console.error(
          "로그인 실패:",
          JSON.stringify(response.data.error, null, 2),
        );
        return false;
      }
    } catch (error) {
      console.error("로그인 오류:", error.message);
      return false;
    }
  }

  async uploadFile(filePath, destinationFolder = "/선납파일") {
    if (!this.sessionId && !(await this.login())) {
      console.error("로그인 실패로 업로드 중단");
      return false;
    }
    try {
      if (!fs.existsSync(filePath)) {
        console.error("파일을 찾을 수 없습니다:", filePath);
        return false;
      }
      const form = new FormData();
      form.append("api", "SYNO.FileStation.Upload");
      form.append("version", "2");
      form.append("method", "upload");
      form.append("path", destinationFolder);
      form.append("create_parents", "true");
      form.append("overwrite", "true");
      form.append("file", fs.createReadStream(filePath));

      const response = await axios.post(
        `${this.baseUrl}/webapi/entry.cgi?_sid=${this.sessionId}`,
        form,
        { headers: form.getHeaders(), timeout: 60000 },
      );
      if (response.data.success) {
        console.log("파일 업로드 성공:", filePath);
        return true;
      } else {
        console.error(
          "업로드 실패:",
          JSON.stringify(response.data.error, null, 2),
        );
        return false;
      }
    } catch (error) {
      console.error("업로드 오류:", error.message);
      return false;
    }
  }

  async logout() {
    if (!this.sessionId) return;
    try {
      await axios.get(`${this.baseUrl}/webapi/auth.cgi`, {
        params: {
          api: "SYNO.API.Auth",
          version: "3",
          method: "logout",
          session: "FileStation",
        },
      });
      this.sessionId = null;
      console.log("시놀로지 NAS 로그아웃 완료");
    } catch (error) {
      console.error("로그아웃 오류:", error.message);
    }
  }
}

async function main() {
  const synology = new SynologyAPI();
  const filePath = "./example.txt"; // 업로드할 파일 경로

  const uploadSuccess = await synology.uploadFile(filePath, "/선납파일");
  if (uploadSuccess) {
    console.log("파일 업로드 완료!");
  } else {
    console.error("파일 업로드 실패");
  }

  await synology.logout();
}

main().catch((error) => console.error("오류 발생:", error.message));
