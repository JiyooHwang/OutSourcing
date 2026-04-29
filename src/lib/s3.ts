import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const region = process.env.S3_REGION ?? "auto";
const endpoint = process.env.S3_ENDPOINT;
const accessKeyId = process.env.S3_ACCESS_KEY_ID;
const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
const forcePathStyle = process.env.S3_FORCE_PATH_STYLE === "true";

export const S3_BUCKET = process.env.S3_BUCKET ?? "";

export const isS3Configured =
  !!S3_BUCKET && !!accessKeyId && !!secretAccessKey;

let client: S3Client | null = null;
function getClient(): S3Client {
  if (client) return client;
  if (!isS3Configured) {
    throw new Error(
      "S3가 설정되지 않았습니다. .env의 S3_BUCKET / S3_ACCESS_KEY_ID / S3_SECRET_ACCESS_KEY 를 확인하세요."
    );
  }
  client = new S3Client({
    region,
    endpoint,
    credentials: { accessKeyId: accessKeyId!, secretAccessKey: secretAccessKey! },
    forcePathStyle,
  });
  return client;
}

export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024; // 25MB
export const PRESIGN_PUT_EXPIRES = 600; // 10분
export const PRESIGN_GET_EXPIRES = 300; // 5분

export function buildStorageKey(paymentId: string, fileName: string): string {
  const random = crypto.randomUUID();
  const safe = fileName.replace(/[^\w.\-]+/g, "_");
  return `payments/${paymentId}/${random}-${safe}`;
}

export async function presignPutUrl(
  key: string,
  contentType: string,
  contentLength: number
): Promise<string> {
  return getSignedUrl(
    getClient(),
    new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      ContentType: contentType,
      ContentLength: contentLength,
    }),
    { expiresIn: PRESIGN_PUT_EXPIRES }
  );
}

export async function presignGetUrl(
  key: string,
  fileName: string
): Promise<string> {
  return getSignedUrl(
    getClient(),
    new GetObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      ResponseContentDisposition: `attachment; filename="${encodeURIComponent(
        fileName
      )}"`,
    }),
    { expiresIn: PRESIGN_GET_EXPIRES }
  );
}

export async function deleteObject(key: string): Promise<void> {
  await getClient().send(
    new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: key })
  );
}
