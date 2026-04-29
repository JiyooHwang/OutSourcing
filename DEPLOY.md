# Vercel 배포 가이드

이 문서는 외주업체 관리 툴을 Vercel에 배포하여 팀원들이 사용할 수 있게 하는 단계별 가이드입니다.

## 사전 준비

다음 계정이 모두 필요합니다 (모두 무료 시작 가능):

- [x] **GitHub 계정** — 이 저장소가 이미 있음
- [ ] **Vercel 계정** — https://vercel.com (GitHub으로 로그인 가능)
- [ ] **Neon 계정** — https://neon.tech (PostgreSQL 호스팅, 무료 티어)
- [ ] **Google Cloud 계정** — https://console.cloud.google.com (OAuth 발급)
- [ ] **(선택) Cloudflare 계정** — https://cloudflare.com (R2 첨부파일 저장소, 무료 티어)

---

## 1단계 — PostgreSQL 데이터베이스 (Neon)

1. https://neon.tech 가입 → "Create project"
2. Project name: `outsourcing` / Region: `Asia Pacific (Seoul)` 권장
3. **Connection string** 복사 (`postgresql://...` 형식)
4. 메모: `DATABASE_URL=...` 으로 따로 저장

> 대안: Supabase, Vercel Postgres, Railway 등. Vercel Postgres는 Vercel 대시보드에서 한 번에 만들 수 있어 가장 편함.

---

## 2단계 — Google OAuth 자격증명

1. https://console.cloud.google.com → 프로젝트 생성 (예: `outsourcing-auth`)
2. 좌측 메뉴 **APIs & Services → OAuth consent screen**
   - User Type: **Internal** (Google Workspace 사내 도메인이 있다면) 또는 **External**
   - App name: `외주업체 관리`
   - Support email: 본인 이메일
   - 저장
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID**
   - Application type: **Web application**
   - Name: `외주업체 관리 - Vercel`
   - **Authorized redirect URIs**: 일단 비워두고 **Create** 클릭
   - 발급된 **Client ID**와 **Client Secret** 메모
4. (3단계 배포 후) Vercel URL을 받으면 다시 와서 redirect URI 추가:
   - `https://<프로젝트명>.vercel.app/api/auth/callback/google`

---

## 3단계 — Vercel 프로젝트 생성

1. https://vercel.com → **Add New → Project**
2. **Import Git Repository** → `JiyooHwang/OutSourcing` 선택
3. **Framework Preset**: Next.js (자동 감지)
4. **Root Directory**: `./` (그대로)
5. **Environment Variables** — 아래 항목 모두 추가:

| 키 | 값 | 비고 |
|---|---|---|
| `DATABASE_URL` | (Neon에서 복사) | 1단계 결과 |
| `AUTH_SECRET` | `openssl rand -base64 32` 로 생성 | 32바이트 랜덤 |
| `AUTH_TRUST_HOST` | `true` | Vercel에서 필수 |
| `AUTH_GOOGLE_ID` | (Google 콘솔 Client ID) | 2단계 결과 |
| `AUTH_GOOGLE_SECRET` | (Google 콘솔 Client Secret) | 2단계 결과 |
| `AUTH_ALLOWED_DOMAINS` | `회사도메인.com` | 콤마로 여러 개 가능, 비우면 모든 Google 계정 허용 |
| `AUTH_ALLOWED_EMAILS` | (선택, 개별 외부 이메일 허용) |  |
| `AUTH_ADMIN_EMAILS` | `본인@회사.com` | 첫 로그인 시 자동 ADMIN 승격 |

> `AUTH_URL`은 Vercel이 자동 주입하므로 추가 불필요. 커스텀 도메인 사용 시 추가.

6. **Deploy** 클릭 → 첫 배포 완료까지 1~2분 대기

---

## 4단계 — Google OAuth Redirect URI 추가

3단계에서 Vercel이 부여한 URL(예: `https://outsourcing-xxx.vercel.app`) 확인 후:

1. Google Cloud Console → 만든 OAuth Client ID 편집
2. **Authorized redirect URIs** 에 추가:
   - `https://<vercel-url>/api/auth/callback/google`
3. 저장

---

## 5단계 — DB 스키마 동기화 (최초 1회)

배포된 앱에 처음 접속하면 DB 테이블이 없어 에러가 납니다. 로컬에서 한 번만 동기화합니다.

```bash
# 저장소 clone (아직 안 했다면)
git clone https://github.com/JiyooHwang/OutSourcing.git
cd OutSourcing
npm install

# 환경 변수 임시 설정 (DATABASE_URL은 Neon 것)
echo 'DATABASE_URL="postgresql://...neon..."' > .env

# 스키마 푸시
npx prisma db push
```

성공하면 Neon 대시보드의 Tables에 `User`, `Vendor`, `Payment`, `AuditLog` 등이 생성된 게 보입니다.

> **이후 스키마 변경 시**: 코드를 수정한 뒤 다시 `npx prisma db push` 실행.

---

## 6단계 — 첫 로그인 (Admin 부트스트랩)

1. `https://<vercel-url>` 접속 → `/signin`
2. **Google 계정으로 로그인** 클릭
3. `AUTH_ADMIN_EMAILS`에 등록한 이메일로 로그인
4. 자동으로 ADMIN 역할 부여 → 헤더에 "사용자 관리", "감사 로그" 메뉴 노출

---

## 7단계 — (선택) 첨부파일용 S3 스토리지

첨부파일 업로드를 쓰려면 추가로 설정합니다. 스킵해도 다른 기능은 정상 동작.

### Cloudflare R2 추천 (무료 10GB, 외부 송신 무료)

1. Cloudflare 대시보드 → **R2 → Create bucket** (`outsourcing-attachments`)
2. **R2 → Manage API Tokens → Create API Token**
   - Permissions: **Object Read & Write**
   - Bucket: 위 버킷
3. 발급된 정보로 Vercel 환경 변수 추가:

| 키 | 값 |
|---|---|
| `S3_BUCKET` | `outsourcing-attachments` |
| `S3_REGION` | `auto` |
| `S3_ENDPOINT` | `https://<account_id>.r2.cloudflarestorage.com` |
| `S3_ACCESS_KEY_ID` | (R2 토큰) |
| `S3_SECRET_ACCESS_KEY` | (R2 토큰) |

4. **버킷 CORS 정책** 추가 (R2 대시보드 → 버킷 → Settings → CORS):

```json
[{
  "AllowedOrigins": ["https://<vercel-url>"],
  "AllowedMethods": ["PUT", "GET"],
  "AllowedHeaders": ["*"],
  "MaxAgeSeconds": 3000
}]
```

5. Vercel에서 **Redeploy** (환경 변수 반영)

---

## 8단계 — 팀원 추가

1. 팀원이 로그인할 도메인을 `AUTH_ALLOWED_DOMAINS`에 포함시키거나, 개별 이메일을 `AUTH_ALLOWED_EMAILS`에 추가
2. 팀원이 한 번 로그인하면 User 테이블에 등록됨
3. 본인(ADMIN)이 `/admin/users` 에서 권한 조정

---

## 트러블슈팅

### "Configuration" 에러
- `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` 누락 또는 오타

### "OAuthCallback" 에러
- Google OAuth redirect URI가 Vercel URL과 정확히 일치하지 않음 (https/http, 끝 슬래시, 서브도메인 확인)

### "Access denied" — 로그인은 되는데 차단됨
- `AUTH_ALLOWED_DOMAINS` 또는 `AUTH_ALLOWED_EMAILS`에 해당 사용자가 없음

### DB 연결 에러 (P1001 / ECONNREFUSED)
- `DATABASE_URL`이 잘못되었거나 Neon이 sleep 상태 (무료 티어). 잠시 후 재시도
- Neon 연결 문자열에 `?sslmode=require` 가 포함되었는지 확인

### 빌드는 성공하는데 화면이 깨짐
- 5단계 (`prisma db push`) 를 안 했을 가능성

### 첨부 업로드 시 CORS 에러
- 7단계의 R2/S3 CORS 정책 확인. `AllowedOrigins`에 Vercel URL이 정확히 들어있어야 함

---

## 커스텀 도메인 (선택)

1. Vercel 프로젝트 → **Settings → Domains** → `outsourcing.회사.com` 추가
2. DNS 레코드(CNAME) 안내대로 설정
3. Google OAuth redirect URI에도 새 도메인 추가:
   `https://outsourcing.회사.com/api/auth/callback/google`
4. (선택) `AUTH_URL` 환경 변수를 새 도메인으로 명시
