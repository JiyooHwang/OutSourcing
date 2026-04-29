# 외주업체 관리 툴

외주처(협력업체) 정보와 외주비 지급 현황을 관리하는 사내 툴.

## 기술 스택

- **Next.js 15** (App Router) + TypeScript
- **Prisma** ORM + **PostgreSQL**
- **NextAuth.js v5 (Auth.js)** + Google OAuth
- **Tailwind CSS**
- **Zod** (입력 검증)

## 주요 기능

- **인증 + 권한**: Google OAuth 로그인, 도메인/이메일 화이트리스트, ADMIN/MEMBER 역할 분리
- **외주처 목록**: 협력업체 등록/편집/삭제(ADMIN만), 검색
- **외주비 관리**: 프로젝트별 외주비 등록, 지급 상태 추적, 외주처/상태별 필터, 합계 표시
- **첨부파일**: 외주비 항목별 계약서/세금계산서/지급증빙 등 업로드 (S3 호환 스토리지)
- **CSV 내보내기**: 외주처/외주비 목록을 Excel 호환 CSV로 다운로드
- **대시보드**: 외주처 수, 미지급/지급완료 합계, 연체 건수 한눈에 확인
- **사용자 관리**: ADMIN이 팀원 권한을 변경/삭제

## 배포 (팀 공유)

Vercel + Neon(PostgreSQL) + Google OAuth로 배포하려면 → **[DEPLOY.md](./DEPLOY.md)** 참고.

## 로컬 개발

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정

`.env.example`을 복사하여 `.env`를 만들고 값들을 채웁니다.

```bash
cp .env.example .env
```

#### DATABASE_URL

PostgreSQL 연결 문자열:
- 로컬: `docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=outsourcing postgres:16`
- 클라우드: [Neon](https://neon.tech), [Supabase](https://supabase.com), Vercel Postgres 등

#### AUTH_SECRET

```bash
npx auth secret
# 또는
openssl rand -base64 32
```

#### Google OAuth (AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET)

1. [Google Cloud Console](https://console.cloud.google.com/) → 프로젝트 선택/생성
2. **APIs & Services → OAuth consent screen** 설정 (Internal 권장)
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID**
4. Application type: **Web application**
5. **Authorized redirect URIs**:
   - 로컬: `http://localhost:3000/api/auth/callback/google`
   - 운영: `https://your-domain.com/api/auth/callback/google`
6. 발급된 Client ID / Secret 을 `.env`에 입력

#### 접근 제어

```env
AUTH_ALLOWED_DOMAINS="company.com,subsidiary.com"   # 회사 도메인 화이트리스트
AUTH_ALLOWED_EMAILS="external@gmail.com"            # 개별 이메일 허용
```

둘 중 하나라도 매칭되면 로그인 허용. 둘 다 비우면 **모든 Google 계정** 로그인 가능 (개발용).

#### 관리자 부트스트랩

```env
AUTH_ADMIN_EMAILS="founder@company.com"
```

여기에 명시된 이메일로 로그인하면 자동으로 ADMIN 역할이 부여됨. 이후 `/admin/users` 페이지에서 다른 팀원의 역할을 관리.

#### S3-호환 스토리지 (첨부파일용)

첨부파일 업로드를 사용하려면 S3-호환 스토리지를 설정합니다. 미설정 시에도 다른 기능은 정상 동작합니다.

```env
S3_BUCKET="outsourcing-attachments"
S3_REGION="auto"
S3_ENDPOINT="https://<accountid>.r2.cloudflarestorage.com"   # R2/MinIO 등
S3_ACCESS_KEY_ID="..."
S3_SECRET_ACCESS_KEY="..."
```

옵션:
- **AWS S3**: `S3_ENDPOINT` 비우고 `S3_REGION` 설정
- **Cloudflare R2**: 위 예시 사용 (저렴하고 외부 송신 무료)
- **MinIO 자체호스팅**: `S3_FORCE_PATH_STYLE="true"`
- **Supabase Storage**: S3 호환 모드로 사용 가능

CORS 설정 (S3 버킷): 브라우저에서 직접 PUT 업로드하므로 다음 정책이 필요합니다.

```json
[{
  "AllowedOrigins": ["http://localhost:3000", "https://your-domain.com"],
  "AllowedMethods": ["PUT", "GET"],
  "AllowedHeaders": ["*"],
  "MaxAgeSeconds": 3000
}]
```

### 3. DB 스키마 적용

```bash
npm run db:push
```

### 4. 개발 서버 실행

```bash
npm run dev
```

http://localhost:3000 접속 → `/signin`으로 자동 리다이렉트.

## 디렉터리 구조

```
prisma/
  schema.prisma          # User, Account, Session, Vendor, Payment 모델
src/
  auth.ts                # NextAuth 메인 설정 (Prisma adapter, 콜백)
  auth.config.ts         # Edge-safe 설정 (middleware에서 사용)
  middleware.ts          # 라우트 보호
  app/
    page.tsx             # 대시보드
    signin/              # 로그인 페이지
    vendors/             # 외주처 목록
    payments/            # 외주비 관리
    api/
      auth/[...nextauth]/  # NextAuth 핸들러
      vendors/             # Vendor REST API
      payments/            # Payment REST API
  lib/
    prisma.ts            # Prisma 클라이언트 싱글톤
    validators.ts        # Zod 스키마
    format.ts            # 통화/날짜 포매터
  types/
    next-auth.d.ts       # 세션 타입 확장
```

## 회사 파이프라인 통합 메모

- **DB**: Prisma 스키마는 PostgreSQL/MySQL 모두 지원하므로 사내 DB로 이관 시 `provider`만 변경.
- **인증**: 사내 SSO(SAML/OIDC) 도입 시 `auth.config.ts`에 provider 추가만 하면 됨.
- **데이터 소유권**: `Vendor`/`Payment`에 `organizationId`, `createdById` 등을 추가하여 멀티테넌시/감사 로그 확장.

## 스크립트

| 명령 | 설명 |
| --- | --- |
| `npm run dev` | 개발 서버 |
| `npm run build` | 프로덕션 빌드 |
| `npm run start` | 프로덕션 서버 |
| `npm run db:push` | 스키마를 DB에 동기화 |
| `npm run db:migrate` | 마이그레이션 생성/적용 |
| `npm run db:studio` | Prisma Studio (DB GUI) |
