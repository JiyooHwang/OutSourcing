# 외주업체 관리 툴

외주처(협력업체) 정보와 외주비 지급 현황을 관리하는 사내 툴.

## 기술 스택

- **Next.js 15** (App Router) + TypeScript
- **Prisma** ORM + **PostgreSQL**
- **Tailwind CSS**
- **Zod** (입력 검증)

## 주요 기능

- **외주처 목록**: 협력업체 등록/편집/삭제, 담당자/연락처/계좌/사업자번호/메모 관리, 검색
- **외주비 관리**: 프로젝트별 외주비 등록, 지급 상태(미지급/지급완료/연체/취소) 추적, 외주처/상태별 필터, 합계 표시
- **대시보드**: 외주처 수, 미지급/지급완료 합계, 연체 건수 한눈에 확인

## 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정

`.env.example`을 복사하여 `.env`를 만들고 PostgreSQL 연결 문자열을 입력:

```bash
cp .env.example .env
```

```
DATABASE_URL="postgresql://user:password@host:5432/outsourcing?schema=public"
```

옵션:
- 로컬: `docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=outsourcing postgres:16`
- 클라우드: [Neon](https://neon.tech), [Supabase](https://supabase.com), Vercel Postgres 등

### 3. DB 스키마 적용

```bash
npm run db:push       # 빠른 동기화 (개발용)
# 또는
npm run db:migrate    # 마이그레이션 파일 생성
```

### 4. 개발 서버 실행

```bash
npm run dev
```

http://localhost:3000 접속.

## 디렉터리 구조

```
prisma/
  schema.prisma          # Vendor, Payment 모델
src/
  app/
    page.tsx             # 대시보드
    vendors/             # 외주처 목록
    payments/            # 외주비 관리
    api/
      vendors/           # Vendor REST API
      payments/          # Payment REST API
  lib/
    prisma.ts            # Prisma 클라이언트 싱글톤
    validators.ts        # Zod 스키마
    format.ts            # 통화/날짜 포매터
```

## 회사 파이프라인 통합 메모

- **DB**: Prisma 스키마는 PostgreSQL/MySQL 모두 지원하므로 사내 DB로 이관 시 `provider`만 변경.
- **인증**: 현재 미구현. 사내 SSO 또는 NextAuth.js로 미들웨어에 붙이는 형태 권장.
- **데이터 소유권**: `Vendor`/`Payment`에 `organizationId` 등을 추가하여 멀티테넌시 확장 가능.

## 스크립트

| 명령 | 설명 |
| --- | --- |
| `npm run dev` | 개발 서버 |
| `npm run build` | 프로덕션 빌드 |
| `npm run start` | 프로덕션 서버 |
| `npm run db:push` | 스키마를 DB에 동기화 |
| `npm run db:migrate` | 마이그레이션 생성/적용 |
| `npm run db:studio` | Prisma Studio (DB GUI) |
