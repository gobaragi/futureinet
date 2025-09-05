# 깃허브 배포 및 시놀로지 NAS 데이터 처리 가이드

## 목차
1. [깃허브 배포 방법](#깃허브-배포-방법)
2. [시놀로지 NAS 데이터 처리 설정](#시놀로지-nas-데이터-처리-설정)
3. [실제 구현 예제](#실제-구현-예제)

## 깃허브 배포 방법

### 1. GitHub Repository 생성 및 코드 업로드

```bash
# 1. 현재 프로젝트를 Git 저장소로 초기화
git init

# 2. GitHub에 새 레포지토리 생성 후 원격 저장소 추가
git remote add origin https://github.com/your-username/your-repo-name.git

# 3. 모든 파일을 커밋
git add .
git commit -m "Initial commit: 선납 확인 시스템"

# 4. GitHub에 푸시
git push -u origin main
```

### 2. 배포용 환경 설정

**package.json 수정 (필요시):**
```json
{
  "scripts": {
    "build": "vite build",
    "start": "NODE_ENV=production tsx server/index.ts",
    "deploy": "npm run build && npm run start"
  }
}
```

### 3. GitHub Actions 자동 배포 (선택사항)

`.github/workflows/deploy.yml` 파일 생성:
```yaml
name: Deploy to Production

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '20'
        
    - name: Install dependencies
      run: npm install
      
    - name: Build application
      run: npm run build
      
    - name: Deploy to server
      run: |
        echo "배포 스크립트 실행"
        # 실제 서버 배포 명령어 추가
```

## 시놀로지 NAS 데이터 처리 설정

### 1. 시놀로지 NAS API 설정

**DSM 설정:**
1. 제어판 > 터미널 및 SNMP > 웹 API 탭에서 "HTTP API 활성화" 체크
2. 파일 스테이션에서 API 접근 허용
3. 사용자 계정에 필요한 권한 부여

### 2. Node.js에서 시놀로지 API 연동

**설치 필요 패키지:**
```bash
npm install axios form-data
```

**시놀로지 API 클래스 생성 (`server/synology-api.js`):**
```javascript
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

class SynologyAPI {
  constructor(host, port, username, password) {
    this.host = host;
    this.port = port;
    this.username = username;
    this.password = password;
    this.sessionId = null;
    this.baseUrl = `http://${host}:${port}`;
  }

  async login() {
    try {
      const response = await axios.get(`${this.baseUrl}/webapi/auth.cgi`, {
        params: {
          api: 'SYNO.API.Auth',
          version: '3',
          method: 'login',
          account: this.username,
          passwd: this.password,
          session: 'FileStation',
          format: 'cookie'
        }
      });

      if (response.data.success) {
        this.sessionId = response.data.data.sid;
        console.log('시놀로지 NAS 로그인 성공');
        return true;
      } else {
        console.error('로그인 실패:', response.data.error);
        return false;
      }
    } catch (error) {
      console.error('로그인 오류:', error.message);
      return false;
    }
  }

  async uploadFile(filePath, destinationFolder = '/선납파일') {
    if (!this.sessionId) {
      const loginSuccess = await this.login();
      if (!loginSuccess) return false;
    }

    try {
      const form = new FormData();
      form.append('api', 'SYNO.FileStation.Upload');
      form.append('version', '2');
      form.append('method', 'upload');
      form.append('path', destinationFolder);
      form.append('create_parents', 'true');
      form.append('overwrite', 'true');
      
      // 파일이 존재하는지 확인
      if (fs.existsSync(filePath)) {
        form.append('file', fs.createReadStream(filePath));
      } else {
        console.error('파일을 찾을 수 없습니다:', filePath);
        return false;
      }

      const response = await axios.post(
        `${this.baseUrl}/webapi/entry.cgi?_sid=${this.sessionId}`,
        form,
        { 
          headers: form.getHeaders(),
          timeout: 60000 // 60초 타임아웃
        }
      );

      if (response.data.success) {
        console.log('파일 업로드 성공:', filePath);
        return true;
      } else {
        console.error('업로드 실패:', response.data.error);
        return false;
      }
    } catch (error) {
      console.error('업로드 오류:', error.message);
      return false;
    }
  }

  async logout() {
    if (!this.sessionId) return;

    try {
      await axios.get(`${this.baseUrl}/webapi/auth.cgi`, {
        params: {
          api: 'SYNO.API.Auth',
          version: '3',
          method: 'logout',
          session: 'FileStation'
        }
      });
      this.sessionId = null;
      console.log('시놀로지 NAS 로그아웃 완료');
    } catch (error) {
      console.error('로그아웃 오류:', error.message);
    }
  }
}

module.exports = SynologyAPI;
```

### 3. 환경 변수 설정

`.env` 파일 생성:
```env
# 시놀로지 NAS 설정
SYNOLOGY_HOST=192.168.1.100
SYNOLOGY_PORT=5000
SYNOLOGY_USERNAME=your_username
SYNOLOGY_PASSWORD=your_password
SYNOLOGY_UPLOAD_PATH=/선납파일
```

## 실제 구현 예제

### 1. 라우트 수정 (`server/routes.ts`)

기존 파일 업로드 라우트에 시놀로지 연동 추가:

```typescript
import SynologyAPI from './synology-api.js';

// 시놀로지 API 인스턴스 생성
const synologyAPI = new SynologyAPI(
  process.env.SYNOLOGY_HOST || 'localhost',
  process.env.SYNOLOGY_PORT || '5000',
  process.env.SYNOLOGY_USERNAME || '',
  process.env.SYNOLOGY_PASSWORD || ''
);

// Create new file submission
app.post("/api/submissions", upload.single('file'), async (req, res) => {
  try {
    const validatedData = insertFileSubmissionSchema.parse(req.body);
    
    // Add file information if file was uploaded
    if (req.file) {
      validatedData.fileName = req.file.originalname;
      validatedData.filePath = req.file.path;
      validatedData.fileSize = `${(req.file.size / 1024 / 1024).toFixed(2)} MB`;
      
      // 시놀로지 NAS에 파일 업로드
      try {
        const uploadSuccess = await synologyAPI.uploadFile(
          req.file.path,
          process.env.SYNOLOGY_UPLOAD_PATH || '/선납파일'
        );
        
        if (uploadSuccess) {
          console.log(`파일이 시놀로지 NAS에 성공적으로 업로드되었습니다: ${req.file.originalname}`);
        } else {
          console.warn('시놀로지 업로드 실패, 로컬 파일만 저장됨');
        }
      } catch (synologyError) {
        console.error('시놀로지 업로드 중 오류:', synologyError);
        // 시놀로지 업로드 실패해도 로컬 저장은 계속 진행
      }
    }
    
    const submission = await storage.createFileSubmission(validatedData);
    
    res.status(201).json(submission);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: "입력 데이터가 올바르지 않습니다.",
        errors: error.errors 
      });
    }
    
    console.error("Error creating submission:", error);
    res.status(500).json({ message: "제출물 생성 중 오류가 발생했습니다." });
  }
});
```

### 2. 시놀로지 상태 체크 엔드포인트 추가

```typescript
// 시놀로지 NAS 연결 상태 확인
app.get("/api/synology/status", async (req, res) => {
  try {
    const loginSuccess = await synologyAPI.login();
    if (loginSuccess) {
      await synologyAPI.logout();
      res.json({ status: "connected", message: "시놀로지 NAS 연결 정상" });
    } else {
      res.status(503).json({ status: "disconnected", message: "시놀로지 NAS 연결 실패" });
    }
  } catch (error) {
    console.error("시놀로지 상태 확인 오류:", error);
    res.status(503).json({ status: "error", message: "연결 상태 확인 중 오류 발생" });
  }
});
```

### 3. 프론트엔드에서 상태 표시 추가

`client/src/pages/home.tsx`에 NAS 상태 표시:

```tsx
const [nasStatus, setNasStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking');

// NAS 상태 확인
useEffect(() => {
  const checkNasStatus = async () => {
    try {
      const response = await fetch('/api/synology/status');
      const data = await response.json();
      setNasStatus(data.status === 'connected' ? 'connected' : 'disconnected');
    } catch (error) {
      setNasStatus('disconnected');
    }
  };

  checkNasStatus();
}, []);

// 헤더에 상태 표시 추가
<div className="flex items-center space-x-2 text-sm">
  <div className={`flex items-center space-x-1 ${nasStatus === 'connected' ? 'text-green-600' : 'text-red-600'}`}>
    <div className={`w-2 h-2 rounded-full ${nasStatus === 'connected' ? 'bg-green-600' : 'bg-red-600'}`}></div>
    <span>NAS {nasStatus === 'connected' ? '연결됨' : '연결 끊김'}</span>
  </div>
  <div className="flex items-center space-x-1 text-green-600">
    <div className="w-2 h-2 bg-green-600 rounded-full"></div>
    <span className="text-sm">온라인</span>
  </div>
</div>
```

## 배포 체크리스트

### 깃허브 배포 전 확인사항
- [ ] 환경 변수 설정 완료
- [ ] 민감한 정보 (비밀번호, API 키) .env 파일에 분리
- [ ] .gitignore에 .env, node_modules, uploads 폴더 추가
- [ ] README.md 작성
- [ ] 패키지 의존성 정리

### 시놀로지 NAS 연동 전 확인사항
- [ ] DSM Web API 활성화
- [ ] 파일 스테이션 권한 설정
- [ ] 네트워크 접근 권한 확인
- [ ] 업로드 대상 폴더 생성
- [ ] 디스크 용량 확인

## 문제 해결

### 자주 발생하는 오류

**1. 시놀로지 로그인 실패 (401 오류)**
```bash
# 해결방법: 사용자 권한 확인
# DSM > 제어판 > 사용자 > 해당 사용자 편집 > 응용 프로그램 탭에서 File Station 권한 확인
```

**2. 파일 업로드 실패 (403 오류)**
```bash
# 해결방법: 폴더 권한 확인
# 대상 폴더의 읽기/쓰기 권한이 있는지 확인
```

**3. 네트워크 연결 오류**
```bash
# 해결방법: 방화벽 및 포트 확인
# DSM > 제어판 > 보안 > 방화벽에서 포트 5000/5001 허용 확인
```

이 가이드를 따라 하시면 깃허브 배포와 시놀로지 NAS 연동을 성공적으로 구현할 수 있습니다.