const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");

class SynologyAPI {
  constructor(host, port, username, password) {
    this.host = host;
    this.port = port;
    this.username = username;
    this.password = password;
    this.sessionId = null;
    this.baseUrl = `https://${host}:${port}`;
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
        console.error("로그인 실패:", response.data.error);
        return false;
      }
    } catch (error) {
      console.error("로그인 오류:", error.message);
      return false;
    }
  }

  async uploadFile(filePath, destinationFolder = "/선납파일") {
    if (!this.sessionId) {
      const loginSuccess = await this.login();
      if (!loginSuccess) return false;
    }

    try {
      const form = new FormData();
      form.append("api", "SYNO.FileStation.Upload");
      form.append("version", "2");
      form.append("method", "upload");
      form.append("path", destinationFolder);
      form.append("create_parents", "true");
      form.append("overwrite", "true");

      // 파일이 존재하는지 확인
      if (fs.existsSync(filePath)) {
        form.append("file", fs.createReadStream(filePath));
      } else {
        console.error("파일을 찾을 수 없습니다:", filePath);
        return false;
      }

      const response = await axios.post(
        `${this.baseUrl}/webapi/entry.cgi?_sid=${this.sessionId}`,
        form,
        {
          headers: form.getHeaders(),
          timeout: 60000, // 60초 타임아웃
        },
      );

      if (response.data.success) {
        console.log("파일 업로드 성공:", filePath);
        return true;
      } else {
        console.error("업로드 실패:", response.data.error);
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

module.exports = SynologyAPI;
