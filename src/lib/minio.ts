// src/lib/minio.ts
import * as Minio from "minio"

export const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT || "s3.alfenas.mg.gov.br",
  useSSL: process.env.MINIO_USE_SSL !== "false",
  accessKey: process.env.MINIO_ACCESS_KEY || "",
  secretKey: process.env.MINIO_SECRET_KEY || "",
})

export const BUCKET_NAME = process.env.MINIO_BUCKET || "oficio-camera"

// Garante que o bucket existe ao iniciar
export async function ensureBucket() {
  const exists = await minioClient.bucketExists(BUCKET_NAME)
  if (!exists) {
    await minioClient.makeBucket(BUCKET_NAME)
  }
}